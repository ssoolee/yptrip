import { Course } from "@/types/travel";
import FavoriteButton from "@/components/FavoriteButton";

export default function CourseCard({ course }: { course: Course }) {
  const previewStops = course.days.flatMap((d) => d.stops).slice(0, 3);
  const coverPhoto = previewStops[0]?.photos[0];

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
        <h3 className="mb-1 font-semibold leading-snug">{course.title}</h3>
        <p className="mb-3 text-xs text-[var(--color-muted)]">{course.days.length}일 코스</p>
        <ul className="space-y-1 text-sm">
          {previewStops.map((stop) => (
            <li key={stop.placeId} className="flex items-center gap-2">
              <span className="text-[var(--color-muted)]">{stop.timeSlot}</span>
              <span>{stop.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
