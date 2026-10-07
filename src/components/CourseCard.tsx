"use client";

import { useState } from "react";
import FavoriteButton from "@/components/FavoriteButton";
import PlaceDetailSheet, { DetailPlace } from "@/components/PlaceDetailSheet";
import { Course, ItineraryStop } from "@/types/travel";

// 카드에 바로 보여주는 스팟 수. 나머지는 "+N곳 더 보기"로 펼친다.
const PREVIEW_STOPS = 3;

export default function CourseCard({ course }: { course: Course }) {
  // 열린 상세 시트의 스팟. null이면 닫힌 상태.
  const [openStop, setOpenStop] = useState<DetailPlace | null>(null);
  const [expanded, setExpanded] = useState(false);

  const allStops = course.days.flatMap((day) => day.stops.map((stop) => ({ stop, day: day.day })));
  const visibleStops = expanded ? allStops : allStops.slice(0, PREVIEW_STOPS);
  const hiddenCount = allStops.length - visibleStops.length;
  // 첫 장소에 사진이 없으면(네이버 검색 장소) 사진이 있는 다음 장소를 표지로 쓴다.
  const coverPhoto = allStops.find(({ stop }) => stop.photos.length > 0)?.stop.photos[0];
  const multiDay = course.days.length > 1;

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)]">
      {coverPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverPhoto} alt={course.title} loading="lazy" className="h-40 w-full object-cover" />
      )}
      <div className="absolute right-3 top-3">
        <FavoriteButton course={course} />
      </div>
      <div className="p-4">
        {course.source && (
          <span
            className={`mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              course.source === "curated"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
            }`}
          >
            {course.source === "curated" ? "추천 코스" : "AI 추천"}
          </span>
        )}
        <h3 className="mb-1 font-semibold leading-snug">{course.title}</h3>
        <p className="mb-3 text-xs text-[var(--color-muted)]">{course.days.length}일 코스</p>
        <ul className="space-y-1 text-sm">
          {visibleStops.map(({ stop, day }) => (
            <li key={stop.placeId}>
              <StopButton stop={stop} day={multiDay ? day : undefined} onOpen={() => setOpenStop(stop)} />
            </li>
          ))}
        </ul>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-2 text-xs font-semibold text-[var(--color-primary)]"
          >
            +{hiddenCount}곳 더 보기
          </button>
        )}
      </div>

      {openStop && <PlaceDetailSheet place={openStop} onClose={() => setOpenStop(null)} />}
    </div>
  );
}

// 스팟 한 줄 — 누르면 상세 시트가 열린다 (PRD-03 §4).
function StopButton({ stop, day, onOpen }: { stop: ItineraryStop; day?: number; onOpen: () => void }) {
  const summary = stop.reason ?? stop.reviewSummary;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`${stop.name} 상세정보 보기`}
      className="-mx-1 block w-full rounded-lg px-1 py-1 text-left hover:bg-[var(--color-primary)]/5"
    >
      <span className="flex items-center gap-2">
        {day != null && (
          <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-1.5 text-xs font-medium text-[var(--color-primary)]">
            {day}일차
          </span>
        )}
        <span className="shrink-0 text-[var(--color-muted)]">{stop.timeSlot}</span>
        <span className="min-w-0 truncate">{stop.name}</span>
      </span>
      {summary && <span className="line-clamp-1 text-xs text-[var(--color-muted)]">{summary}</span>}
    </button>
  );
}
