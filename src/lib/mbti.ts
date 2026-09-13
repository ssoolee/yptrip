// docs/prd/01-ai-course-recommendation-prd.md §3.1 MBTI-취향 매핑표
const MBTI_TAG_MAP: Record<string, string[]> = {
  E: ["activity", "lively_food", "group"],
  I: ["quiet_cafe", "nature", "healing"],
  S: ["local_food", "experience"],
  N: ["aesthetic", "photo_spot"],
  T: ["experience"],
  F: ["aesthetic", "romantic"],
  J: ["experience"],
  P: ["nature", "quiet_cafe"],
};

export function tagsForMbti(mbti?: string): string[] {
  if (!mbti) return ["nature", "aesthetic"];
  const letters = mbti.toUpperCase().split("").filter((c) => c in MBTI_TAG_MAP);
  const tags = new Set<string>();
  for (const letter of letters) {
    for (const tag of MBTI_TAG_MAP[letter]) tags.add(tag);
  }
  return tags.size > 0 ? Array.from(tags) : ["nature", "aesthetic"];
}
