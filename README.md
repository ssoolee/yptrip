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
| 인증 | Firebase Authentication (Google, 이메일/비밀번호) — **현재 보류, 화면에서 내려둠** |
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
| `npm test` | 단위 테스트 (영업시간 파서·검증·거리 계산) |
| `npm run build:places` | 장소 스냅샷 `src/lib/data/places.json` 재생성 |
| `npm run build:mbti` | MBTI 큐레이션 코스 `src/lib/data/mbtiCourses.json` 재생성 |
| `npm run build:pet` | 반려동물 동반 업소 `src/lib/data/petPlaces.json` 재생성 |
| `npm run build:hours` | 장소 스냅샷의 영업시간만 다시 수집 |

`build:*` 스크립트는 외부 API와 LLM을 호출하므로 `.env.local`이 채워져 있어야 한다.
요청마다 검색·태깅하지 않도록 **오프라인에서 한 번 만들어 커밋하는** 캐시이며,
자료가 바뀔 때만 다시 실행한다. 원천 자료는 `data/*.source.json`.

영업시간은 TourAPI에서 모은다 — 네이버 지역 검색으로 찾은 업체도 이름·좌표가 맞는
TourAPI 항목이 있으면 함께 채운다(89곳). 어느 API에도 없는
업체는 `build:hours`가 `data/hours.source.json`에 빈 항목으로 적어 두니, `hours`를
손으로 채우고(`"09:00~18:00 / 휴무: 매주 수요일"` 형식) 다시 실행하면 스냅샷에
반영된다 — 손으로 채운 값이 TourAPI 값보다 우선한다. 이 통로로 64곳을 더 채워
현재 숙소를 뺀 157곳 중 153곳에 영업시간이 있다. 영업시간을 모르는 장소는
코스 추천에서 뒤로 밀리고(`src/lib/agents/placeRetrieval.ts`), 상세 화면에는
"방문 전 확인" 안내가 붙는다.

## 환경 변수

`.env.example`이 전체 목록과 발급처를 담고 있다. 상세는
[docs/prd/07-external-api-integration.md](./docs/prd/07-external-api-integration.md) 참조.

- **LLM** — `LLM_PROVIDER`(gemini|anthropic), `GEMINI_API_KEY`, `GEMINI_MODEL`,
  `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- **지도/장소** — `NCP_MAP_CLIENT_ID`·`NCP_MAP_CLIENT_SECRET`(API HUB 지역 검색),
  `NCP_MAPS_API_KEY_ID`·`NCP_MAPS_API_KEY`(Geocoding·Directions),
  `NEXT_PUBLIC_NCP_MAP_CLIENT_ID`(브라우저 지도 SDK)
- **공공 데이터** — `TOUR_API_KEY`(필수), `ODSAY_API_KEY`·`WEATHER_API_KEY`(선택)
- **Firebase** — `NEXT_PUBLIC_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._APP_ID`,
  `FIREBASE_SERVICE_ACCOUNT_KEY`(선택 — 아래 "코스 저장" 참조)

`NEXT_PUBLIC_*`은 브라우저 번들에 들어가는 공개 값이고, 나머지는 서버 전용이다.
`.env.local`은 커밋하지 않는다.

## 화면 구성

| 경로 | 화면 |
|---|---|
| `/` | 평안이 히어로 + 자연어 검색창 + 동행 유형 프리셋 + 서비스 소개 3단계 |
| `/course/search` | 자연어 요청 기반 코스 추천 결과 (당일치기/1박 탭) |
| `/course/[preset]` | 프리셋별 코스 추천 결과 |
| `/course/mbti`, `/course/mbti/[type]` | MBTI 유형 선택 및 큐레이션 코스 |
| `/map` | 지도 + 실시간 위치 |
| `/pet-places` | 반려동물 동반 가능 업소 |
| `/favorites` | 찜한 코스 / 장소 (탭) |
| `/login`, `/profile` | 로그인 / 내 정보 — **보류 중이라 404** (아래 "로그인 보류" 참조) |
| (없는 주소) | 평안이 404 — `src/app/not-found.tsx` |

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
public/character/   마스코트 '평안이' 그림 (PNG)
docs/               PRD, 에이전트 설계, 리서치 자료
```

서비스 전체의 얼굴은 양평 마스코트 **평안이**(직접 제작)다. 그림 파일은
`public/character/`에 두고 `next/image`로 쓴다 — 외부 호스트 사진에 쓰는
`<img>` 관례와 달리 로컬 파일은 설정 없이 srcset·WebP 변환을 받는다.
캐릭터 색은 `src/app/globals.css`의 `--color-character-*` 토큰에 적어 두었고,
히어로 배경 틴트(`--color-hero-*`)는 배경색에 섞어 만들어 다크모드에서도
그대로 동작한다.

그림을 화면에 올리는 통로는 `src/components/Mascot.tsx` 하나다. 표정 7종에 뜻을
정해 두고(`calm` 확인 중, `happy` 완성, `wow` 어라?, `heart` 찜, `wink` 골라보세요,
`smile` 중립, `hero` 홈) 쓸 수 있는 크기를 타입으로 묶었다 — 그림마다 또렷하게
보이는 상한이 달라(얼굴 원본 ~150px이라 72px까지, 하트 포즈는 56px까지) 넘기면
타입 검사에서 걸린다. 더 크게 보여야 하는 자리는 그림을 늘리지 않고
`MascotSpot`으로 둥근 배경을 키운다. `alt`는 컴포넌트가 `""`로 고정한다 —
그림은 모두 장식이고 뜻은 옆 글자가 나른다.

평안이가 모든 화면에 닿는 통로는 `PageHeader`(뒤로가기 + 제목 + 설명)와
`EmptyState`(보여줄 것이 없을 때)다. 하단 내비와 사진 없는 장소의 카테고리
이모지(🍚 ☕ 🏞 🏡)는 일부러 그대로 뒀다 — 작은 크기에서 네 칸/네 카테고리를
구분하는 정보를 캐릭터가 대신 나르지 못한다.

코스를 만드는 동안에는 `loading.tsx`가 평안이와 뼈대 카드를 보여준다
(`/course/search`, `/course/[preset]`, `/course/mbti/[type]`, `/course/detail/[courseId]`).
세그먼트 파일을 쓰는 이유는 이 화면이 미리 받아져 링크를 누르는 즉시 뜨기 때문이고,
대신 인자를 받을 수 없어(Next 16) 문구에 검색어나 MBTI 유형을 넣지 못한다.
움직임은 `globals.css`의 `prefers-reduced-motion` 블록에서 모두 꺼진다.

탭 아이콘과 공유 이미지는 `icon.tsx` / `apple-icon.tsx` / `opengraph-image.tsx`가
빌드 때 평안이 그림에서 만들어 낸다. `favicon.ico`는 코드로 만들 수 없어 지웠다.
공유 이미지에 글자를 넣지 않은 건 한글 폰트가 `ImageResponse`의 500KB 상한을 넘기
때문이고, 제목·설명은 SNS가 `og:title`/`og:description`으로 그림 옆에 보여준다.

추천 흐름: 사용자 입력 → `requestInterpreter`(조건 구조화) → `placeRetrieval`(후보 검색)
→ `itineraryComposer`(동선·시간대 배치) → `validation`(영업시간·휴무 검증) →
`enrichment`(사진·연락처·지도 링크 보강). `orchestrator`가 순서를 관장하고,
LLM 호출이 실패하면 규칙 기반 결과로 폴백한다.

## 찜(즐겨찾기) 동작

찜은 코스 찜과 장소 찜 두 종류다(찜 목록 화면의 탭). **로그인을 보류한 지금은
`localStorage`에만 저장한다.**

로그인을 다시 켜면, 로컬 데이터를 `users/{uid}/favoriteCourses`와
`users/{uid}/favoritePlaces`로 한 번 병합한 뒤 Firestore를 기준으로 동기화한다
(`src/lib/favorites.ts` — 두 종류가 같은 스토어 구현을 공유한다).
보안 규칙은 `firestore.rules` — 사용자 문서는 본인만, 공용 참조 데이터는 읽기 전용.

## 로그인 보류

Firebase 인증과 카카오 로그인 연동을 보류하면서, 로그인 기능 전체를 화면에서
내렸다. **코드는 지우지 않았다** — `src/lib/featureFlags.ts`의 `LOGIN_ENABLED`를
`true`로 바꾸면 그대로 돌아온다.

`false`일 때 달라지는 것:

- 하단 내비에서 '내정보'가 빠져 3칸이 된다 (`BottomNav.tsx`)
- `/login`·`/profile`은 `notFound()`로 404가 된다
- 찜 목록의 로그인 유도 배너가 사라진다 — `configured`가 `false`가 되면서
  `showLoginBanner` 조건이 저절로 꺼지는 것이라, 따로 가리지 않았다
- `AuthProvider`가 Firebase 인증을 아예 붙이지 않는다. 찜의 Firestore 동기화는
  이 Provider가 `attachFavoritesUser(uid)`를 부를 때만 켜지므로
  (`src/lib/auth/AuthProvider.tsx`), `favorites.ts`는 손대지 않아도 함께 꺼진다

이미 로그인해 둔 사용자의 세션은 무시되고 찜은 브라우저 저장분으로 돌아간다.
Firestore에 있던 데이터는 지우지 않으므로 다시 켜면 그대로 돌아온다.

`docs/prd/`는 카카오 로그인을 Must로 유지한다 — 요구사항이 바뀐 게 아니라
일정이 미뤄진 것이다.

## 코스 저장

추천 코스는 요청마다 새로 만들어지므로, 생성 직후 Firestore `precomputedCourses`에
남겨 `/course/detail/[courseId]`를 나중에 다시 열 수 있게 한다
(`src/lib/courseStore.ts`, 응답을 늦추지 않도록 `after()`로 미뤄 쓴다).

쓰기는 Admin SDK만 한다 — App Hosting에서는 서비스 계정이 자동으로 붙어 설정이 없고,
로컬에서 저장까지 보려면 `FIREBASE_SERVICE_ACCOUNT_KEY`에 서비스 계정 키의 경로나 JSON을
넣는다. 자격증명이 없으면 저장만 건너뛰고, 상세 화면은 찜 목록과 세션 저장소
(`src/lib/courseCache.ts`)에 남은 코스로 열린다.

문서에는 30일 뒤 시각을 `expiresAt`으로 넣어 둔다. Firestore 콘솔에서 이 필드에
TTL 정책을 걸면 지난 코스가 자동으로 지워진다 (걸지 않으면 계속 쌓인다).

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
