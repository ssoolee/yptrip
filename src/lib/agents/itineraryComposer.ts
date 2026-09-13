import { retrievePlaces } from "@/lib/agents/placeRetrieval";
import { Category, ItineraryDay, ItineraryStop } from "@/types/travel";

// docs/agents/03-itinerary-composer-agent.md 참조.
// TODO: 실제 이동시간 계산(네이버 Directions/ODsay) 연동 시 슬롯 배정 로직 보강.
// (NCP Directions는 발급받은 키에 아직 상품 구독이 안 되어 있어 대기 중 —
// docs/prd/02-map-realtime-location-prd.md §5의 "직선거리 fallback" 요건대로
// 현재는 좌표 기반 순서(방문 순서)만 사용하고 실제 이동시간은 계산하지 않는다.)
const DAY_TEMPLATES: { category: Category; timeSlot: string; skipOnLastDay?: boolean }[][] = [
  [
    { category: "cafe", timeSlot: "14:00-15:00" },
    { category: "attraction", timeSlot: "15:30-17:00" },
    { category: "restaurant", timeSlot: "18:00-19:30" },
    { category: "lodging", timeSlot: "20:00", skipOnLastDay: true },
  ],
  [
    { category: "attraction", timeSlot: "09:30-11:00" },
    { category: "restaurant", timeSlot: "12:00-13:30" },
    { category: "cafe", timeSlot: "14:00-15:00" },
  ],
];

export async function composeItinerary(params: {
  durationDays: number;
  tags: string[];
  requirePetFriendly?: boolean;
  offset?: number;
  usedPlaceIds?: Set<string>;
}): Promise<ItineraryDay[]> {
  const { durationDays, tags, requirePetFriendly, offset = 0 } = params;
  const usedPlaceIds = params.usedPlaceIds ?? new Set<string>();
  const days: ItineraryDay[] = [];

  for (let day = 1; day <= durationDays; day++) {
    const isLastDay = day === durationDays;
    const template = DAY_TEMPLATES[Math.min(day - 1, DAY_TEMPLATES.length - 1)];
    const stops: ItineraryStop[] = [];

    for (const slot of template) {
      if (isLastDay && slot.skipOnLastDay) continue;
      const [candidate] = await retrievePlaces({
        category: slot.category,
        tags,
        requirePetFriendly,
        excludePlaceIds: Array.from(usedPlaceIds),
        count: 1,
        offset,
      });
      if (!candidate) continue;
      usedPlaceIds.add(candidate.placeId);
      stops.push({ ...candidate, timeSlot: slot.timeSlot });
    }

    if (stops.length > 0) days.push({ day, stops });
  }

  return days;
}
