import CourseDetailScreen from "@/components/CourseDetailScreen";
import { findCuratedCourse } from "@/lib/mbti";

// 코스 상세 — 지도 동선과 일정을 한 화면에서 본다 (docs/prd/02-map-realtime-location-prd.md).
// 큐레이션 코스는 ID가 고정이라 서버에서 찾아 넘기고, 파이프라인이 만든 코스는
// 사용자가 카드를 누를 때 세션에 담아 둔 값을 화면이 읽는다 (src/lib/courseCache.ts).
export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <CourseDetailScreen courseId={courseId} initialCourse={findCuratedCourse(courseId)} />;
}
