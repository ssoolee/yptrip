import { Course, ItineraryDay, PresetType } from "@/types/travel";
import { getPreset } from "@/lib/presets";
import { getTourApiOverview } from "@/lib/api/tourApi";

// docs/agents/05-enrichment-presentation-agent.md 참조.
// TODO: LLM 기반 트립 타이틀/리뷰 요약 생성으로 교체 (현재는 규칙 기반).
export async function enrichCourse(params: {
  days: ItineraryDay[];
  presetType: PresetType;
  courseId: string;
}): Promise<Course> {
  const { presetType, courseId } = params;
  const preset = getPreset(presetType);

  const days: ItineraryDay[] = await Promise.all(
    params.days.map(async (day) => ({
      ...day,
      stops: await Promise.all(
        day.stops.map(async (stop) => {
          // TourAPI 출처 장소(placeId="tour_<contentId>")만 개요를 보강한다.
          // 목업 장소는 이미 큐레이션된 reviewSummary를 갖고 있으므로 건드리지 않는다.
          if (stop.reviewSummary || !stop.placeId.startsWith("tour_")) return stop;
          const overview = await getTourApiOverview(stop.placeId.slice("tour_".length));
          return overview ? { ...stop, reviewSummary: overview } : stop;
        }),
      ),
    })),
  );

  const highlight = days[0]?.stops[0]?.name ?? "양평";
  const title = `${preset?.label ?? "양평"} 코스: ${highlight}와 함께하는 ${days.length}일 여행`;

  return { courseId, title, presetType, days };
}
