import Link from "next/link";
import LoginForm from "@/components/LoginForm";

// docs/prd/06-infra-deployment-prd.md §2 — 이메일/구글 로그인.
// 카카오 로그인은 Custom Token 백엔드가 필요해 다음 단계로 분리했다.
export const metadata = {
  title: "로그인 · 양평 여행 코스 추천",
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 pb-6 pt-8">
      <Link href="/" className="text-sm text-[var(--color-muted)]">
        ← 처음으로
      </Link>
      <h1 className="mt-3 text-xl font-bold">로그인</h1>
      <p className="mt-1 mb-6 text-sm text-[var(--color-muted)]">
        로그인하면 찜한 코스를 여러 기기에서 그대로 볼 수 있어요.
      </p>
      <LoginForm />
    </div>
  );
}
