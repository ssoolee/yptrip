"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getFavoritesServerSnapshot,
  getFavoritesSnapshot,
  removeFavoriteCourse,
  subscribeFavorites,
} from "@/lib/favorites";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function FavoritesPage() {
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getFavoritesServerSnapshot,
  );
  const { user, loading, configured } = useAuth();
  // 비로그인 상태에서 찜이 쌓이면 브라우저 데이터와 함께 사라질 수 있다 -
  // docs/prd/04-favorites-prd.md 10 오픈 이슈의 로그인 유도 배너.
  const showLoginBanner = configured && !loading && !user && favorites.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-8">
      <h1 className="mb-4 text-xl font-bold">찜한 코스</h1>

      {showLoginBanner && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[var(--radius-card)] bg-[var(--color-primary)]/10 p-4">
          <p className="text-xs text-[var(--color-primary)]">
            이 브라우저에만 저장돼 있어요. 로그인하면 다른 기기에서도 볼 수 있어요.
          </p>
          <Link
            href="/login"
            className="shrink-0 rounded-[var(--radius-button)] bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white"
          >
            로그인
          </Link>
        </div>
      )}

      {favorites.length === 0 && (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-8 text-center">
          <p className="mb-3 text-sm text-[var(--color-muted)]">아직 찜한 코스가 없어요.</p>
          <Link href="/" className="text-sm font-semibold text-[var(--color-primary)]">
            코스 추천받으러 가기 →
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {favorites.map((fav) => (
          <li
            key={fav.courseId}
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h2 className="font-semibold leading-snug">{fav.title}</h2>
              <button
                type="button"
                onClick={() => removeFavoriteCourse(fav.courseId)}
                className="shrink-0 text-xs text-[var(--color-muted)] underline"
              >
                찜 취소
              </button>
            </div>
            <ul className="space-y-0.5 text-sm text-[var(--color-muted)]">
              {fav.itinerarySnapshot.days
                .flatMap((d) => d.stops)
                .slice(0, 3)
                .map((stop, i) => (
                  <li key={i}>
                    {stop.timeSlot} · {stop.name}
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
