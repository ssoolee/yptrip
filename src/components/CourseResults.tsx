"use client";

import { useState, useTransition } from "react";
import CourseCard from "@/components/CourseCard";
import { loadMoreCourses } from "@/lib/actions";
import { courseSignature } from "@/lib/courseSignature";
import { Course, PresetType } from "@/types/travel";

export default function CourseResults({
  presetType,
  initialCourses,
  showMbtiInput,
  query,
}: {
  presetType: PresetType;
  initialCourses: Course[];
  showMbtiInput?: boolean;
  // 자연어 요청(/course/search) — "더 보기" 때 같은 조건으로 이어서 생성
  query?: string;
}) {
  const [courses, setCourses] = useState(initialCourses);
  const [mbti, setMbti] = useState("");
  // "더 보기"로 새 코스가 하나도 안 나오면 후보가 소진된 것 — 버튼 대신 안내 문구를 보여준다.
  const [exhausted, setExhausted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = () => {
    startTransition(async () => {
      const more = await loadMoreCourses(presetType, courses.length, mbti || undefined, query);
      const shown = new Set(courses.map((c) => courseSignature(c.days)));
      const fresh = more.filter((c) => !shown.has(courseSignature(c.days)));
      if (fresh.length === 0) setExhausted(true);
      setCourses((prev) => [...prev, ...fresh]);
    });
  };

  const handleApplyMbti = () => {
    startTransition(async () => {
      const fresh = await loadMoreCourses(presetType, 0, mbti || undefined, query);
      setCourses(fresh);
      setExhausted(false);
    });
  };

  return (
    <div className="px-4">
      {showMbtiInput && (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
          <input
            value={mbti}
            onChange={(e) => setMbti(e.target.value)}
            placeholder="예: ENFP"
            maxLength={4}
            className="min-w-0 flex-1 rounded-[var(--radius-button)] border border-[var(--color-border)] px-3 py-2 text-sm uppercase"
          />
          <button
            type="button"
            onClick={handleApplyMbti}
            disabled={isPending}
            className="shrink-0 rounded-[var(--radius-button)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            적용
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {courses.map((course) => (
          <CourseCard key={course.courseId} course={course} />
        ))}
      </div>

      {courses.length === 0 && (
        <p className="py-10 text-center text-sm text-[var(--color-muted)]">
          조건에 맞는 코스를 찾지 못했어요. MBTI를 입력하거나 다시 시도해보세요.
        </p>
      )}

      {exhausted ? (
        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          이 조건으로 만들 수 있는 코스를 모두 보여드렸어요.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={isPending}
          className="mx-auto mt-6 block rounded-[var(--radius-button)] border border-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--color-primary)] disabled:opacity-50"
        >
          {isPending ? "코스를 만드는 중..." : "다른 코스 더 보기"}
        </button>
      )}
    </div>
  );
}
