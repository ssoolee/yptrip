import { Place } from "@/types/travel";
import snapshot from "@/lib/data/places.json";

// scripts/build-places.ts(npm run build:places)가 만든 실제 장소 스냅샷.
// 네이버 지역 검색 + TourAPI 장소에 LLM 취향 태그·반려동물 동반 여부·요약을
// 붙여 둔 "자체 캐시 DB" (docs/agents/02-place-retrieval-agent.md).
export const SNAPSHOT_PLACES = snapshot.places as Place[];
export const SNAPSHOT_GENERATED_AT = snapshot.generatedAt;
