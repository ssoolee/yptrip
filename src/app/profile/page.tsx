export default function ProfilePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <span className="mb-3 text-4xl" aria-hidden>
        👤
      </span>
      <h1 className="mb-2 text-lg font-bold">로그인 기능 준비 중</h1>
      <p className="text-sm text-[var(--color-muted)]">
        Firebase 프로젝트와 카카오 로그인이 연동되면 여기서 로그인하고
        찜 목록을 여러 기기에서 동기화할 수 있어요.
        (docs/prd/06-infra-deployment-prd.md)
      </p>
    </div>
  );
}
