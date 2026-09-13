"use client";

import { useState, useTransition } from "react";
import CourseCard from "@/components/CourseCard";
import { loadMoreCourses } from "@/lib/actions";
import { Course, PresetType } from "@/types/travel";

export default function CourseResults({
  presetType,
  initialCourses,
  showMbtiInput,
}: {
  presetType: PresetType;
  initialCourses: Course[];
  showMbtiInput?: boolean;
}) {
  const [courses, setCourses] = useState(initialCourses);
  const [mbti, setMbti] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = () => {
    startTransition(async () => {
      const more = await loadMoreCourses(presetType, courses.length, mbti || undefined);
      setCourses((prev) => [...prev, ...more]);
    });
  };

  const handleApplyMbti = () => {
    startTransition(async () => {
      const fresh = await loadMoreCourses(presetType, 0, mbti || undefined);
      setCourses(fresh);
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

      <button
        type="button"
        onClick={handleLoadMore}
        disabled={isPending}
        className="mx-auto mt-6 block rounded-[var(--radius-button)] border border-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--color-primary)] disabled:opacity-50"
      >
        {isPending ? "코스를 만드는 중..." : "다른 코스 더 보기"}
      </button>
    </div>
  );
}
