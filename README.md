# 양평 AI 여행 코스 추천 (ypaicourse)

양평군 맛집·카페·관광명소·숙소를 하나의 "코스"로 묶어 추천하는 모바일 우선 웹서비스.
사용자가 자연어로 원하는 여행을 적거나 동행 유형(혼자/연인/가족/친구/반려동물/MBTI/축제)을
고르면, LLM 에이전트 파이프라인이 동선과 시간대를 고려한 1~2일 코스를 만들어
지도·사진·연락처까지 한 화면에 보여준다.

기획 배경과 요구사항은 [docs/prd/00-overview-prd.md](./docs/prd/00-overview-prd.md),
에이전트 설계는 [docs/agents/README.md](./docs/agents/README.md) 참조.

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, React 19, Server Actions) |
| 스타일 | Tailwind CSS 4 |
| LLM | Gemini(기본) / Anthropic Claude — `LLM_PROVIDER`로 전환 |
| 인증 | Firebase Authentication (Google, 이메일/비밀번호) |
| DB | Cloud Firestore (찜 목록 동기화) |
| 지도·검색 | Naver Cloud Platform Maps / API HUB 지역 검색, 공공데이터포털 TourAPI |
| 배포 | Firebase App Hosting (백엔드 ID `yptrip`) |

## 시작하기

```bash
npm install
cp .env.example .env.local   # 값 채우기 (아래 "환경 변수" 참조)
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속.

| 스크립트 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` / `npm start` | 프로덕션 빌드 / 실행 |
| `npm run lint` | ESLint |
| `npm run build:places` | 장소 스냅샷 `src/lib/data/places.json` 재생성 |
| `npm run build:mbti` | MBTI 큐레이션 코스 `src/lib/data/mbtiCourses.json` 재생성 |
| `npm run build:pet` | 반려동물 동반 업소 `src/lib/data/petPlaces.json` 재생성 |

`build:*` 스크립트는 외부 API와 LLM을 호출하므로 `.env.local`이 채워져 있어야 한다.
요청마다 검색·태깅하지 않도록 **오프라인에서 한 번 만들어 커밋하는** 캐시이며,
자료가 바뀔 때만 다시 실행한다. 원천 자료는 `data/*.source.json`.

## 환경 변수

`.env.example`이 전체 목록과 발급처를 담고 있다. 상세는
[docs/prd/07-external-api-integration.md](./docs/prd/07-external-api-integration.md) 참조.

- **LLM** — `LLM_PROVIDER`(gemini|anthropic), `GEMINI_API_KEY`, `GEMINI_MODEL`,
  `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- **지도/장소** — `NCP_MAP_CLIENT_ID`·`NCP_MAP_CLIENT_SECRET`(API HUB 지역 검색),
  `NCP_MAPS_API_KEY_ID`·`NCP_MAPS_API_KEY`(Geocoding·Directions),
  `NEXT_PUBLIC_NCP_MAP_CLIENT_ID`(브라우저 지도 SDK)
- **공공 데이터** — `TOUR_API_KEY`(필수), `ODSAY_API_KEY`·`WEATHER_API_KEY`(선택)
- **Firebase** — `NEXT_PUBLIC_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._APP_ID`

`NEXT_PUBLIC_*`은 브라우저 번들에 들어가는 공개 값이고, 나머지는 서버 전용이다.
`.env.local`은 커밋하지 않는다.

## 화면 구성

| 경로 | 화면 |
|---|---|
| `/` | 자연어 검색창 + 동행 유형 프리셋 |
| `/course/search` | 자연어 요청 기반 코스 추천 결과 (당일치기/1박 탭) |
| `/course/[preset]` | 프리셋별 코스 추천 결과 |
| `/course/mbti`, `/course/mbti/[type]` | MBTI 유형 선택 및 큐레이션 코스 |
| `/map` | 지도 + 실시간 위치 |
| `/pet-places` | 반려동물 동반 가능 업소 |
| `/favorites` | 찜한 코스 |
| `/login`, `/profile` | 로그인 / 내 정보 |

## 코드 구조

```
src/app/            App Router 페이지
src/components/     화면 단위 컴포넌트 (지도, 코스 카드, 하단 내비게이션 등)
src/lib/actions.ts  추천 요청 Server Action (프론트 → 에이전트 진입점)
src/lib/agents/     에이전트 파이프라인 (요청 해석 → 장소 검색 → 코스 구성 → 검증 → 보강)
src/lib/api/        외부 API 클라이언트 (네이버 지역 검색, NCP Maps, TourAPI)
src/lib/llm/        LLM 공급자 추상화 (gemini / anthropic)
src/lib/data/       커밋된 장소·코스 스냅샷
src/lib/firebase/   Firebase 클라이언트, 인증(auth/), 찜(favorites.ts)
scripts/            스냅샷 생성 스크립트
docs/               PRD, 에이전트 설계, 리서치 자료
```

추천 흐름: 사용자 입력 → `requestInterpreter`(조건 구조화) → `placeRetrieval`(후보 검색)
→ `itineraryComposer`(동선·시간대 배치) → `validation`(영업시간·휴무 검증) →
`enrichment`(사진·연락처·지도 링크 보강). `orchestrator`가 순서를 관장하고,
LLM 호출이 실패하면 규칙 기반 결과로 폴백한다.

## 찜(즐겨찾기) 동작

비로그인 상태에서는 `localStorage`에만 저장하고, 로그인하면 로컬 데이터를
`users/{uid}/favoriteCourses`로 한 번 병합한 뒤 Firestore를 기준으로 동기화한다.
보안 규칙은 `firestore.rules` — 사용자 문서는 본인만, 공용 참조 데이터는 읽기 전용.

## 배포

Firebase App Hosting에 배포한다. 런타임 설정과 환경 변수 매핑은 `apphosting.yaml`,
백엔드 지정은 `firebase.json`에 있다. 비공개 키는 파일에 적지 않고 Cloud Secret Manager를 참조한다.

```bash
npx firebase-tools apphosting:secrets:set <시크릿-이름>   # 키 등록
npx firebase-tools deploy --only firestore                # 규칙·인덱스 배포
```

App Hosting은 GitHub 연동 시 푸시마다 자동 빌드된다. 상세는
[docs/prd/06-infra-deployment-prd.md](./docs/prd/06-infra-deployment-prd.md) 참조.

## 문서

- `docs/prd/` — 서비스 개요부터 기능별 요구사항(추천·지도·상세·찜·반응형·인프라·외부 API)
- `docs/agents/` — 에이전트 6종의 역할·프롬프트·툴 설계
- `docs/research/` — MBTI 코스, 반려동물 동반 장소 리서치 원본
