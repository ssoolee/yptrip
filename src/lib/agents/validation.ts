import { ItineraryDay } from "@/types/travel";

// docs/agents/04-validation-agent.md 참조.
// TODO: 실시간 영업시간/휴무일 재조회 연동 시 실제 검증 로직으로 교체.
export function validateItinerary(days: ItineraryDay[]): { approved: boolean; reason?: string } {
  if (days.length === 0) return { approved: false, reason: "생성된 일정이 없습니다." };
  const hasEmptyDay = days.some((d) => d.stops.length === 0);
  if (hasEmptyDay) return { approved: false, reason: "일부 날짜에 배정 가능한 장소가 없습니다." };
  return { approved: true };
}
