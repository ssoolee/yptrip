import { composeItinerary } from "@/lib/agents/itineraryComposer";
import { validateItinerary } from "@/lib/agents/validation";
import { enrichCourse } from "@/lib/agents/enrichment";
import { getPreset } from "@/lib/presets";
import { tagsForMbti } from "@/lib/mbti";
import { Course, PresetType } from "@/types/travel";

// docs/agents/01-orchestrator-agent.md 참조.
// 자연어 요청 해석(Claude API)은 아직 미연동 — 프리셋 선택 UI에서 이미
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

  const courses: Course[] = [];
  for (let i = 0; i < count; i++) {
    const offset = offsetStart + i;
    const days = await composeItinerary({ durationDays, tags, requirePetFriendly, offset });
    const validation = validateItinerary(days);
    if (!validation.approved) continue;
    courses.push(
      await enrichCourse({
        days,
        presetType,
        courseId: `${presetType}_${offset}_${Date.now().toString(36)}`,
      }),
    );
  }
  return courses;
}
