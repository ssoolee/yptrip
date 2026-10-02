import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "양평 여행 코스 추천",
  description: "AI가 추천하는 양평군 맛집·카페·관광명소·숙소 여행 코스",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 로그인 상태와 찜 동기화는 클라이언트에서만 다룬다 — Provider를 body 안쪽에 둬
            서버 컴포넌트의 정적 부분을 최대한 유지한다. */}
        <AuthProvider>
          <main className="flex-1 pb-16">{children}</main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
