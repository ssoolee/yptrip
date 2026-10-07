// 장소 스냅샷(src/lib/data/places.json)에 영업시간을 채운다. 실행: npm run build:hours
//
// PRD-03 "오늘 방문 가능한지(영업시간/휴무일) 바로 확인" 요구사항의 데이터 공급원.
// TourAPI detailIntro2에서 영업시간·휴무일을 받아 Place.businessHoursRaw에 넣는다.
//
// build:places와 달리 LLM을 쓰지 않고 이미 커밋된 스냅샷을 제자리에서 갱신하므로,
// 태그·요약 등 기존 큐레이션 결과를 건드리지 않고 영업시간만 다시 받아올 수 있다.
// (build:places로 전체를 다시 만들 때도 같은 값이 함께 채워진다.)
//
// 한계: TourAPI에 없는 장소(placeId가 naver_로 시작)는 영업시간을 받아올 수 없다.
// 네이버 지역 검색이 영업시간을 제공하지 않아 현재로선 대안이 없다.
import { loadEnvConfig } from "@next/env";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Place } from "@/types/travel";

loadEnvConfig(process.cwd());

const SNAPSHOT = path.join(process.cwd(), "src/lib/data/places.json");
const TOUR_PREFIX = "tour_";

interface Snapshot {
  generatedAt: string;
  places: Place[];
}

async function main() {
  // env 로드 뒤에 import해야 모듈이 키를 읽는다.
  const { getTourApiBusinessHours } = await import("@/lib/api/tourApi");
  const { parseBusinessHours } = await import("@/lib/businessHours");

  const snapshot: Snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
  const targets = snapshot.places.filter((p) => p.placeId.startsWith(TOUR_PREFIX) && p.category !== "lodging");
  console.log(`대상 ${targets.length}곳 (전체 ${snapshot.places.length}곳 중 TourAPI 출처, 숙소 제외)`);

  let filled = 0;
  let parsed = 0;
  const unparsed: string[] = [];

  for (const place of targets) {
    const raw = await getTourApiBusinessHours(place.placeId.slice(TOUR_PREFIX.length), place.category);
    if (!raw) {
      // 이전 실행에서 받아 둔 값이 있어도 지금 비었다면 지운다 — 원본이 바뀐 것이다.
      delete place.businessHoursRaw;
      continue;
    }
    place.businessHoursRaw = raw;
    filled += 1;
    // 저장은 하되, 요일별 표로 못 옮긴 표기는 눈에 보이게 남긴다.
    if (parseBusinessHours(raw)) parsed += 1;
    else unparsed.push(`${place.name}: ${raw}`);
  }

  console.log(`영업시간 저장 ${filled}곳, 그중 요일별 해석 성공 ${parsed}곳`);
  if (unparsed.length > 0) {
    console.log(`해석 못 한 표기 ${unparsed.length}건 (원문 그대로 노출됨):`);
    for (const line of unparsed) console.log(`  - ${line}`);
  }

  writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 1)}\n`, "utf8");
  console.log(`저장: ${path.relative(process.cwd(), SNAPSHOT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
