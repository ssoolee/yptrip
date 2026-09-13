import { notFound } from "next/navigation";
import Link from "next/link";
import { getPreset } from "@/lib/presets";
import { generateCourses } from "@/lib/agents/orchestrator";
import { PresetType } from "@/types/travel";
import CourseResults from "@/components/CourseResults";

export default async function CoursePresetPage({
  params,
}: {
  params: Promise<{ preset: string }>;
}) {
  const { preset } = await params;
  const presetDef = getPreset(preset);
  if (!presetDef) notFound();

  const presetType = presetDef.type as PresetType;
  const initialCourses = await generateCourses({ presetType, count: 3 });

  return (
    <div className="mx-auto max-w-2xl pb-6 pt-6">
      <div className="mb-4 px-4">
        <Link href="/" className="text-sm text-[var(--color-muted)]">
          ← 다른 유형 보기
        </Link>
        <h1 className="mt-2 text-xl font-bold">
          {presetDef.emoji} {presetDef.label}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">{presetDef.description}</p>
      </div>
      <CourseResults
        presetType={presetType}
        initialCourses={initialCourses}
        showMbtiInput={presetType === "mbti"}
      />
    </div>
  );
}
