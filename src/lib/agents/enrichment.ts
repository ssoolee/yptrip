import { Course, ItineraryDay, PresetType } from "@/types/travel";
import { getPreset } from "@/lib/presets";
import { getTourApiOverview } from "@/lib/api/tourApi";
import { generateJson } from "@/lib/llm";

// docs/agents/05-enrichment-presentation-agent.md 참조.
// 트립 타이틀은 LLM(src/lib/llm)으로 생성하고, 키 미설정·실패 시 규칙 기반으로 fallback.
// TODO: 리뷰 요약도 LLM 생성으로 교체.
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
  const fallbackTitle = `${preset?.label ?? "양평"} 코스: ${highlight}와 함께하는 ${days.length}일 여행`;
  const title = (await generateTitle(days, preset?.label)) ?? fallbackTitle;

  return { courseId, title, presetType, days };
}

const TITLE_SYSTEM =
  "당신은 경기도 양평군 여행 코스 에디터입니다. 주어진 코스의 동선을 보고 " +
  "여행자가 끌릴 만한 한국어 코스 제목을 짓습니다. 제목의 근거는 입력으로 받은 " +
  "동행 유형, 일정, 장소 이름과 태그뿐입니다. 장소 이름이 암시하더라도 태그에 " +
  "없는 특징(예: 반려동물 동반)은 쓰지 마세요.";

// 제목에 반려동물 표현이 있는데 코스에 동반 가능 장소가 없으면 사실과 다른
// 제목이므로 버린다 — 프롬프트만으로는 막을 수 없는 경우를 코드로 한 번 더 거른다.
const PET_WORDS = /반려|댕댕|강아지|애견|멍멍|펫/;

// LLM 미설정·실패 시 undefined — 호출부가 규칙 기반 제목으로 fallback.
async function generateTitle(days: ItineraryDay[], presetLabel?: string): Promise<string | undefined> {
  const stops = days.flatMap((d) => d.stops);
  const route = days
    .map(
      (d) =>
        `${d.day}일차: ${d.stops
          .map((s) => {
            const tags = [...s.tags, ...(s.petFriendly ? ["pet_friendly"] : [])];
            return `${s.name}(${s.category}${tags.length ? `; 태그: ${[...new Set(tags)].join(", ")}` : ""})`;
          })
          .join(" → ")}`,
    )
    .join("\n");
  const result = await generateJson<{ title?: string }>({
    system: TITLE_SYSTEM,
    prompt:
      `동행 유형: ${presetLabel ?? "일반"}\n일정: ${days.length}일\n${route}\n\n` +
      `25자 이내 제목 하나를 {"title": "..."} 형식으로 답하세요.`,
    maxTokens: 1024,
  });
  const title = result?.title?.trim();
  if (!title || title.length > 40) return undefined;
  if (PET_WORDS.test(title) && !stops.some((s) => s.petFriendly)) return undefined;
  return title;
}
