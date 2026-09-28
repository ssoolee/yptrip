import { composeItinerary } from "@/lib/agents/itineraryComposer";
import { validateItinerary } from "@/lib/agents/validation";
import { enrichCourse } from "@/lib/agents/enrichment";
import { getPreset } from "@/lib/presets";
import { tagsForMbti } from "@/lib/mbti";
import { courseSignature } from "@/lib/courseSignature";
import { Course, PresetType } from "@/types/travel";

// docs/agents/01-orchestrator-agent.md 참조.
// 자연어 요청 해석(LLM)은 아직 미연동 — 프리셋 선택 UI에서 이미
// 구조화된 조건(presetType 등)을 받는 구간까지만 우선 구현.
export async function generateCourses(params: {
  presetType: PresetType;
  count?: number;
  offsetStart?: number;
  mbti?: string;
  durationDays?: number;
}): Promise<Course[]> {
  const { presetType, count = 3, offsetStart = 0, mbti, durationDays = 2 } = params;
  const preset = getPreset(presetType);
  const tags = presetType === "mbti" ? tagsForMbti(mbti) : preset?.tags ?? [];
  const requirePetFriendly = presetType === "pet";

  // 코스별 생성은 서로 독립적이라 병렬로 돌린다 — 특히 enrichment의 LLM 호출이
  // 가끔 수 초씩 지연되는데, 순차 실행하면 그 지연이 코스 수만큼 누적돼
  // 평균 응답 15초(PRD-00 KPI)를 넘긴다.
  const offsets = Array.from({ length: count }, (_, i) => offsetStart + i);
  const composed = await Promise.all(
    offsets.map((offset) => composeItinerary({ durationDays, tags, requirePetFriendly, offset })),
  );

  // 후보가 적은 조건(예: 반려동물 동반 장소 2곳)에선 offset을 바꿔도 같은
  // 코스가 나온다 — 똑같은 코스를 여러 장 보여주지 않도록 거른다.
  const seen = new Set<string>();
  const approved = composed
    .map((days, i) => ({ days, offset: offsets[i] }))
    .filter(({ days }) => {
      if (!validateItinerary(days).approved) return false;
      const signature = courseSignature(days);
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });

  return Promise.all(
    approved.map(({ days, offset }) =>
      enrichCourse({
        days,
        presetType,
        courseId: `${presetType}_${offset}_${Date.now().toString(36)}`,
      }),
    ),
  );
}
