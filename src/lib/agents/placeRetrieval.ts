import { SNAPSHOT_PLACES } from "@/lib/data/placeSnapshot";
import { getActiveFestivals, searchTourApiPlaces } from "@/lib/api/tourApi";
import { searchNaverPlaces } from "@/lib/api/naverSearch";
import { Category, Place } from "@/types/travel";

// 스냅샷 이후 새로 등록된 장소도 후보에 들 수 있도록 실시간으로 조회할 TourAPI
// 카테고리별 개수 (Next.js fetch 캐시로 동일 카테고리 재호출은 저렴함).
const TOUR_API_POOL_SIZE = 24;

function normalizeName(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

// 스냅샷에 있는 장소는 실시간 결과에서 다시 넣지 않는다. 같은 업체가 네이버/TourAPI에
// 다른 ID로 있을 수 있어 이름으로도 비교한다 — 이미 코스에 쓰여 제외된 장소가
// 다른 출처의 ID로 다시 들어와 같은 코스에 두 번 나오는 것을 막는다.
const SNAPSHOT_IDS = new Set(SNAPSHOT_PLACES.map((p) => p.placeId));
const SNAPSHOT_NAMES = new Set(SNAPSHOT_PLACES.map((p) => normalizeName(p.name)));

function scorePlace(place: Place, tags: string[]): number {
  return place.tags.reduce((acc, t) => acc + (tags.includes(t) ? 1 : 0), 0);
}

// docs/agents/02-place-retrieval-agent.md 참조.
// 후보 풀 = ① 스냅샷(src/lib/data/places.json — LLM 태그가 붙은 실제 장소)을
// 취향 태그 점수순으로, 점수가 같으면 원래 순서(네이버 리뷰 많은 순/TourAPI 인기순)대로
// ② 진행 중 축제(festival 프리셋) ③ 스냅샷에 없는 실시간 조회 결과(태그 없음).
// offset은 "더 보기" 요청 시 다른 후보를 앞으로 돌리는 데 쓴다.
//
// 반려동물 동반은 스냅샷에서 소개글에 동반 가능이 명시된 곳(petFriendly)만 쓴다.
// 실시간 조회 결과는 동반 여부를 검증할 수 없어 제외한다. (TourAPI detailPetTour2는
// 양평군 표본 조회 결과 등록 업체가 전무해 쓰지 않는다 — PRD-07 §5 오픈 이슈.)
export async function retrievePlaces(params: {
  category: Category;
  tags: string[];
  excludePlaceIds?: string[];
  requirePetFriendly?: boolean;
  count?: number;
  offset?: number;
}): Promise<Place[]> {
  const { category, tags, excludePlaceIds = [], requirePetFriendly, count = 3, offset = 0 } = params;
  const excluded = new Set(excludePlaceIds);

  const scored = SNAPSHOT_PLACES.filter((p) => p.category === category)
    .filter((p) => !excluded.has(p.placeId))
    .filter((p) => (requirePetFriendly ? p.petFriendly === true : true))
    .map((place) => ({ place, score: scorePlace(place, tags) }));

  // "festival" 프리셋(관광지 카테고리)은 TourAPI searchFestival2의 실제 진행 중
  // 축제를 후보에 섞는다 (축제 API가 "festival" 태그를 붙여 줌).
  // docs/prd/07-external-api-integration.md §3 "축제 캘린더 데이터 소스" 해소책.
  if (category === "attraction" && tags.includes("festival") && !requirePetFriendly) {
    const festivals = await getActiveFestivals();
    const known = new Set([...excluded, ...scored.map((s) => s.place.placeId)]);
    for (const festival of festivals) {
      if (known.has(festival.placeId)) continue;
      scored.push({ place: festival, score: scorePlace(festival, tags) });
    }
  }

  // Array.prototype.sort는 안정 정렬 — 동점이면 원래 인기순이 유지된다.
  const pool = scored.sort((a, b) => b.score - a.score).map((s) => s.place);

  if (!requirePetFriendly) {
    const [naverCandidates, tourCandidates] = await Promise.all([
      searchNaverPlaces(category),
      searchTourApiPlaces({ category, count: TOUR_API_POOL_SIZE }),
    ]);
    const knownIds = new Set([...excluded, ...SNAPSHOT_IDS, ...pool.map((p) => p.placeId)]);
    const knownNames = new Set([...SNAPSHOT_NAMES, ...pool.map((p) => normalizeName(p.name))]);
    for (const candidate of [...naverCandidates, ...tourCandidates]) {
      const name = normalizeName(candidate.name);
      if (knownIds.has(candidate.placeId) || knownNames.has(name)) continue;
      knownIds.add(candidate.placeId);
      knownNames.add(name);
      pool.push(candidate);
    }
  }

  if (pool.length === 0) return [];
  const rotated = [...pool.slice(offset % pool.length), ...pool.slice(0, offset % pool.length)];
  return rotated.slice(0, count);
}
