import { MOCK_PLACES } from "@/lib/mock/places";
import { getActiveFestivals, searchTourApiPlaces } from "@/lib/api/tourApi";
import { Category, Place } from "@/types/travel";

// TourAPI에서 한 번에 가져올 카테고리별 후보 풀 크기. 목업(카테고리당
// 2~5개)이 소진된 뒤에도 "더 보기"가 매번 새 실제 장소를 보여줄 수 있도록
// 넉넉하게 가져온다 (Next.js fetch 캐시로 동일 카테고리 재호출은 저렴함).
const TOUR_API_POOL_SIZE = 24;

function scorePlace(place: Place, tags: string[]): number {
  return place.tags.reduce((acc, t) => acc + (tags.includes(t) ? 1 : 0), 0) + (place.rating ?? 0) / 10;
}

// docs/agents/02-place-retrieval-agent.md 참조.
// MOCK_PLACES를 "자체 캐시 DB(취향 태그 큐레이션 우선순위)"로 쓰고, 그
// 뒤에 TourAPI 실데이터를 이어 붙여 후보 풀을 구성한다. 목업은 태그
// 점수순으로 앞에 오고, TourAPI 항목은 태그가 없어 항상 그 뒤에 온다 —
// 그래서 offset이 작을 땐 큐레이션된 목업이, offset이 목업 개수를
// 넘어서면(예: "더 보기" 반복 클릭) 실제 TourAPI 장소가 노출된다.
//
// 반려동물 동반 여부는 TourAPI 기본 목록으로 검증할 수 없어(detailPetTour2
// 별도 호출 필요) requirePetFriendly 조건에서는 목업 데이터만 사용한다.
// detailPetTour2를 양평군 표본으로 실제 호출해본 결과 등록된 반려동물
// 동반 업체가 전무해(PRD-07 §5 오픈 이슈에서 우려한 커버리지 문제가
// 실제로 확인됨) 지금 연동해도 얻을 데이터가 없다 — 향후 등록 현황이
// 바뀌면 재검토.
export async function retrievePlaces(params: {
  category: Category;
  tags: string[];
  excludePlaceIds?: string[];
  requirePetFriendly?: boolean;
  count?: number;
  offset?: number;
}): Promise<Place[]> {
  const { category, tags, excludePlaceIds = [], requirePetFriendly, count = 3, offset = 0 } = params;

  const scoredMock = MOCK_PLACES.filter((p) => p.category === category)
    .filter((p) => !excludePlaceIds.includes(p.placeId))
    .filter((p) => (requirePetFriendly ? p.petFriendly === true : true))
    .map((place) => ({ place, score: scorePlace(place, tags) }));

  // "festival" 프리셋(관광지 카테고리)은 TourAPI searchFestival2의 실제
  // 진행 중 축제를 후보에 섞어 목업 축제 태그와 동일한 기준으로 경쟁시킨다.
  // docs/prd/07-external-api-integration.md §3의 "축제 캘린더 데이터 소스"
  // 오픈 이슈 해소책. 현재 진행 중인 축제가 없으면 조용히 건너뛴다.
  if (category === "attraction" && tags.includes("festival") && !requirePetFriendly) {
    const festivals = await getActiveFestivals();
    const known = new Set([...excludePlaceIds, ...scoredMock.map((s) => s.place.placeId)]);
    for (const festival of festivals) {
      if (known.has(festival.placeId)) continue;
      scoredMock.push({ place: festival, score: scorePlace(festival, tags) });
    }
  }

  let pool = scoredMock.sort((a, b) => b.score - a.score).map((s) => s.place);

  if (!requirePetFriendly) {
    const apiCandidates = await searchTourApiPlaces({ category, count: TOUR_API_POOL_SIZE });
    const known = new Set([...excludePlaceIds, ...pool.map((p) => p.placeId)]);
    pool = [...pool, ...apiCandidates.filter((p) => !known.has(p.placeId))];
  }

  if (pool.length === 0) return [];
  // offset을 적용해 "더 보기" 요청 시 다른 후보를 우선 노출 (순환)
  const rotated = [...pool.slice(offset % pool.length), ...pool.slice(0, offset % pool.length)];
  return rotated.slice(0, count);
}
