import { Course } from "@/types/travel";
import FavoriteButton from "@/components/FavoriteButton";

export default function CourseCard({ course }: { course: Course }) {
  const previewStops = course.days.flatMap((d) => d.stops).slice(0, 3);
  // 첫 장소에 사진이 없으면(네이버 검색 장소) 사진이 있는 다음 장소를 표지로 쓴다.
  const coverPhoto = course.days.flatMap((d) => d.stops).find((s) => s.photos.length > 0)?.photos[0];

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)]">
      {coverPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverPhoto} alt={course.title} className="h-40 w-full object-cover" />
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
          {previewStops.map((stop) => (
            <li key={stop.placeId}>
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-muted)]">{stop.timeSlot}</span>
                <span>{stop.name}</span>
              </div>
              {(stop.reason ?? stop.reviewSummary) && (
                <p className="line-clamp-1 text-xs text-[var(--color-muted)]">{stop.reason ?? stop.reviewSummary}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
