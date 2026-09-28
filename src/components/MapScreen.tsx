"use client";

import { useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import {
  getFavoritesServerSnapshot,
  getFavoritesSnapshot,
  subscribeFavorites,
} from "@/lib/favorites";
import NaverMapView, { MapStop } from "@/components/NaverMapView";

// docs/prd/02-map-realtime-location-prd.md 참조.
// 코스별 상세 화면이 아직 없어, 우선 "찜한 코스"를 골라 지도로 보는 형태로
// 연동한다. 찜한 코스가 없으면 양평 주요 스팟(overviewStops)을 보여준다.
export default function MapScreen({ overviewStops }: { overviewStops: MapStop[] }) {
  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getFavoritesServerSnapshot,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = favorites.find((f) => f.courseId === selectedId) ?? favorites[0];

  const { stops, showRoute, subtitle } = useMemo(() => {
    if (selected) {
      const courseStops: MapStop[] = selected.itinerarySnapshot.days
        .flatMap((d) => d.stops)
        .map((s, i) => ({ lat: s.lat, lng: s.lng, name: s.name, order: i + 1 }));
      return { stops: courseStops, showRoute: true, subtitle: selected.title };
    }
    return { stops: overviewStops, showRoute: false, subtitle: "양평 주요 스팟 (찜한 코스가 없어 전체 보기)" };
  }, [selected, overviewStops]);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-6">
      <h1 className="mb-1 text-lg font-bold">🗺️ 지도</h1>
      <p className="mb-4 text-sm text-[var(--color-muted)]">{subtitle}</p>

      {favorites.length > 1 && (
        <select
          value={selected?.courseId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mb-4 w-full rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm"
        >
          {favorites.map((f) => (
            <option key={f.courseId} value={f.courseId}>
              {f.title}
            </option>
          ))}
        </select>
      )}

      <NaverMapView stops={stops} showRoute={showRoute} />

      <ul className="mt-4 space-y-2">
        {stops.map((stop) => (
          <li
            key={`${stop.order}-${stop.name}`}
            className="flex items-center justify-between gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm"
          >
            <span>
              <span className="mr-2 text-[var(--color-muted)]">{stop.order}</span>
              {stop.name}
            </span>
            <a
              href={`https://map.naver.com/p/search/${encodeURIComponent(stop.name)}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs font-semibold text-[var(--color-primary)]"
            >
              길찾기 →
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
