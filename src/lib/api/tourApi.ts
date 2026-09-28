import { Category, Place } from "@/types/travel";

// docs/prd/07-external-api-integration.md, docs/agents/02-place-retrieval-agent.md 참조.
// 한국관광공사 TourAPI 4.0 (KorService2) 연동.
//
// 맛집/카페는 네이버 지역 검색(src/lib/api/naverSearch.ts)이 우선이고, TourAPI는
// 그 뒤를 보충한다 — areaBasedList2의 contentTypeId=39(음식점)는 cat3 코드로
// "카페/전통찻집"과 일반 식당이 구분되므로(CAFE_CAT3) category=cafe/restaurant를
// 모두 커버할 수 있다.
const TOUR_API_BASE = "https://apis.data.go.kr/B551011/KorService2";
const MOBILE_APP = "ypaicourse";

// 경기도(31) 양평군(19) — TourAPI areaCode2 조회로 확인한 고정 코드.
const AREA_CODE = "31";
const SIGUNGU_CODE = "19";

const CONTENT_TYPE_ID: Record<Category, string> = {
  attraction: "12",
  lodging: "32",
  restaurant: "39",
  cafe: "39",
};

// TourAPI 표준 분류 코드: 카페/전통찻집.
const CAFE_CAT3 = "A05020900";

function getServiceKey(): string {
  const raw = process.env.TOUR_API_KEY ?? "";
  // 공공데이터포털의 "Encoding" 키를 그대로 URLSearchParams에 넣으면
  // 다시 인코딩되어 이중 인코딩 오류(SERVICE_KEY_IS_NOT_REGISTERED_ERROR)가
  // 발생한다. 먼저 디코딩한 뒤 URLSearchParams가 한 번만 인코딩하게 한다.
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

interface TourApiItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1?: string;
  tel?: string;
  firstimage?: string;
  firstimage2?: string;
  mapx?: string;
  mapy?: string;
  cat3?: string;
  overview?: string;
}

async function callTourApi(
  path: string,
  params: Record<string, string>,
): Promise<TourApiItem[]> {
  const serviceKey = getServiceKey();
  if (!serviceKey) return [];

  const qs = new URLSearchParams({
    serviceKey,
    MobileOS: "ETC",
    MobileApp: MOBILE_APP,
    _type: "json",
    ...params,
  });

  try {
    const res = await fetch(`${TOUR_API_BASE}/${path}?${qs.toString()}`, {
      // 관광지/숙소/맛집 목록은 자주 바뀌지 않으므로 6시간 캐시.
      next: { revalidate: 60 * 60 * 6 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.response?.header?.resultCode !== "0000") return [];
    const item = data?.response?.body?.items?.item;
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  } catch {
    return [];
  }
}

function toPlace(item: TourApiItem, category: Category): Place | null {
  const lat = Number(item.mapy);
  const lng = Number(item.mapx);
  if (!item.title || Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return {
    placeId: `tour_${item.contentid}`,
    name: item.title,
    category,
    lat,
    lng,
    address: item.addr1 ?? "",
    phone: item.tel || undefined,
    photos: [item.firstimage, item.firstimage2].filter((v): v is string => !!v),
    mapUrl: `https://map.naver.com/p/search/${encodeURIComponent(item.title)}`,
    // TourAPI 카테고리(cat3)를 내부 취향 태그 체계로 매핑하는 작업은
    // 추후 개선 과제 — 지금은 빈 배열로 두고 평점/거리 등 다른 기준으로만 정렬된다.
    tags: [],
  };
}

// docs/agents/02-place-retrieval-agent.md
// "자체 캐시 DB 조회... 없으면 외부 API 폴백" — 스냅샷(src/lib/data/places.json)이 캐시 역할을
// 하고, 후보가 부족할 때만 이 함수로 실제 데이터를 보충한다.
export async function searchTourApiPlaces(params: {
  category: Category;
  count?: number;
  page?: number;
}): Promise<Place[]> {
  const { category, count = 10, page = 1 } = params;
  const contentTypeId = CONTENT_TYPE_ID[category];

  // cafe/restaurant는 같은 contentTypeId(39)를 공유해 cat3로 걸러내야 하므로
  // 필터링 후 개수가 부족하지 않도록 넉넉히 가져온다.
  const fetchRows = category === "cafe" || category === "restaurant" ? Math.max(count * 3, 30) : count;

  const items = await callTourApi("areaBasedList2", {
    areaCode: AREA_CODE,
    sigunguCode: SIGUNGU_CODE,
    contentTypeId,
    numOfRows: String(fetchRows),
    pageNo: String(page),
    arrange: "Q", // 인기(조회수)순
  });

  const filtered =
    category === "cafe"
      ? items.filter((i) => i.cat3 === CAFE_CAT3)
      : category === "restaurant"
        ? items.filter((i) => i.cat3 !== CAFE_CAT3)
        : items;

  return filtered
    .map((item) => toPlace(item, category))
    .filter((p): p is Place => p !== null)
    .slice(0, count);
}

// docs/prd/07-external-api-integration.md §3 "축제 캘린더 데이터 소스" 오픈
// 이슈 해소용 — TourAPI searchFestival2로 오늘 이후 진행되는 양평군 축제를
// 조회한다. contentTypeId=15(축제/공연/행사)로 반환되며, 관광지(attraction)
// 카테고리 후보로 취급하고 "festival" 태그를 붙인다.
export async function getActiveFestivals(count = 10): Promise<Place[]> {
  const today = new Date();
  const eventStartDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
    today.getDate(),
  ).padStart(2, "0")}`;

  const items = await callTourApi("searchFestival2", {
    areaCode: AREA_CODE,
    sigunguCode: SIGUNGU_CODE,
    eventStartDate,
    numOfRows: String(count),
    arrange: "Q",
  });

  return items
    .map((item) => {
      const place = toPlace(item, "attraction");
      return place ? { ...place, tags: ["festival"] } : null;
    })
    .filter((p): p is Place => p !== null);
}

// docs/agents/05-enrichment-presentation-agent.md — 사진/개요 보강용.
// TourAPI 출처 장소(placeId가 "tour_"로 시작)에만 사용한다.
// 원문 전체를 반환한다 — 길이 조절은 호출부(LLM 요약 또는 잘라내기)가 맡는다.
export async function getTourApiOverview(contentId: string): Promise<string | undefined> {
  const items = await callTourApi("detailCommon2", { contentId });
  const overview = items[0]?.overview
    ?.replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return overview || undefined;
}
