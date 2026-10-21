import Image from "next/image";

// "평안이가 코스를 짜는 방법" 3단계 서비스 소개. 표정 그림은 장식이라 alt=""이고,
// 단계의 뜻은 글이 전달한다 (스크린리더가 같은 말을 두 번 읽지 않도록).
const STEPS = [
  {
    image: "/character/face-wow.png",
    width: 151,
    height: 132,
    title: "① 원하는 여행을 알려주세요",
    description: "한 줄로 적어도, 유형만 골라도 돼요.",
  },
  {
    image: "/character/face-calm.png",
    width: 147,
    height: 128,
    title: "② 평안이가 확인해요",
    description: "영업시간·휴무일과 이동 동선까지 검증해요.",
  },
  {
    image: "/character/face-happy.png",
    width: 149,
    height: 127,
    title: "③ 코스가 완성돼요",
    description: "지도·사진·연락처를 한 화면에서 봐요.",
  },
];

export default function HomeSteps() {
  return (
    <section className="px-4">
      <h2 className="sr-only">평안이가 코스를 짜는 방법</h2>
      <ol className="grid gap-2 sm:grid-cols-3">
        {STEPS.map((step) => (
          <li
            key={step.title}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:flex-col sm:gap-2 sm:text-center"
          >
            <Image
              src={step.image}
              alt=""
              width={step.width}
              height={step.height}
              sizes="44px"
              className="h-auto w-11 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
