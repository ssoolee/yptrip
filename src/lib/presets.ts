import { PresetDefinition } from "@/types/travel";

// docs/prd/01-ai-course-recommendation-prd.md §3의 프리셋 정의를 그대로 반영
export const PRESETS: PresetDefinition[] = [
  {
    type: "solo",
    label: "혼자 여행",
    emoji: "🧘",
    description: "힐링과 사색을 위한 조용한 코스",
    tags: ["healing", "quiet_cafe", "nature"],
  },
  {
    type: "couple",
    label: "연인과 함께",
    emoji: "💑",
    description: "감성 뷰와 로맨틱한 스팟 위주",
    tags: ["view_cafe", "romantic", "photo_spot", "aesthetic"],
  },
  {
    type: "family",
    label: "가족과 함께",
    emoji: "👨‍👩‍👧",
    description: "아이와 함께하는 체험형 코스",
    tags: ["experience", "kid_friendly"],
  },
  {
    type: "friends",
    label: "친구와 함께",
    emoji: "🎉",
    description: "액티비티와 왁자지껄 맛집 위주",
    tags: ["activity", "lively_food", "group"],
  },
  {
    type: "pet",
    label: "반려동물과 함께",
    emoji: "🐶",
    description: "반려동물 동반 가능 업체만 모은 코스",
    tags: ["pet_friendly"],
  },
  {
    type: "mbti",
    label: "MBTI 성향별",
    emoji: "🔤",
    description: "내 성향에 맞는 코스 추천",
    tags: [],
  },
  {
    type: "festival",
    label: "축제 시즌 연계",
    emoji: "🎊",
    description: "양평 축제 일정과 겹치는 코스",
    tags: ["festival"],
  },
];

export function getPreset(type: string): PresetDefinition | undefined {
  return PRESETS.find((p) => p.type === type);
}
