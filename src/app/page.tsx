import PresetGrid from "@/components/PresetGrid";
import TripSearchBox from "@/components/TripSearchBox";
import PetPlacesLink from "@/components/PetPlacesLink";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl pb-6 pt-8">
      <header className="mb-6 px-4">
        <h1 className="text-2xl font-bold">양평, 어떤 여행을 떠나볼까요?</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          원하는 여행을 적거나 어울리는 유형을 고르면 AI가 코스를 바로 추천해드려요.
        </p>
      </header>
      <div className="mb-6">
        <TripSearchBox showExamples />
      </div>
      <PresetGrid />
      <div className="mt-4 px-4">
        <PetPlacesLink />
      </div>
    </div>
  );
}
