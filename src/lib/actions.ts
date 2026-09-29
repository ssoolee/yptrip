"use server";

import { generateCourses } from "@/lib/agents/orchestrator";
import { interpretRequest } from "@/lib/agents/requestInterpreter";
import { Course, PresetType } from "@/types/travel";

// docs/prd/01-ai-course-recommendation-prd.md §4.2 "실시간 추가 생성"에 대응.
// 지금은 서버 액션으로 직접 호출하지만, Firebase 전환 시 HTTPS Callable
// Function 엔드포인트로 옮겨질 로직 (docs/prd/06-infra-deployment-prd.md §5).
export async function loadMoreCourses(
  presetType: PresetType,
  offsetStart: number,
  mbti?: string,
  query?: string,
  durationDays?: number,
): Promise<Course[]> {
  // 자연어 요청은 해석 결과가 캐시되어 있어 "더 보기"마다 LLM을 다시 부르지 않는다.
  const conditions = presetType === "custom" && query ? await interpretRequest(query) : undefined;
  return await generateCourses({ presetType, offsetStart, count: 3, mbti, conditions, durationDays });
}
