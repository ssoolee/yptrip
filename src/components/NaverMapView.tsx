"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

// docs/prd/02-map-realtime-location-prd.md 참조.
// 네이버 지도 Dynamic Map SDK(Naver Cloud Platform) 연동.
export interface MapStop {
  lat: number;
  lng: number;
  name: string;
  order: number;
  // 있으면 마커 정보창에 네이버 지도 링크를 붙인다 (반려동물 동반 업소 지도)
  url?: string;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

interface NaverLatLng {
  lat: () => number;
  lng: () => number;
}

interface NaverBounds {
  extend: (point: NaverLatLng) => void;
}

interface NaverMapInstance {
  fitBounds: (bounds: NaverBounds) => void;
}

interface NaverMapsNamespace {
  maps: null | {
    Map: new (el: HTMLElement, opts: Record<string, unknown>) => NaverMapInstance;
    LatLng: new (lat: number, lng: number) => NaverLatLng;
    LatLngBounds: new (a: NaverLatLng, b: NaverLatLng) => NaverBounds;
    Marker: new (opts: Record<string, unknown>) => unknown;
    InfoWindow: new (opts: Record<string, unknown>) => { open: (map: NaverMapInstance, marker: unknown) => void };
    Polyline: new (opts: Record<string, unknown>) => unknown;
    Point: new (x: number, y: number) => unknown;
    Event: { addListener: (target: unknown, type: string, handler: () => void) => void };
  };
}

declare global {
  interface Window {
    naver?: NaverMapsNamespace;
  }
}

export default function NaverMapView({
  stops,
  showRoute = true,
}: {
  stops: MapStop[];
  showRoute?: boolean;
}) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_NCP_MAP_CLIENT_ID;

  useEffect(() => {
    // 인증 실패(키·도메인 설정, 네이버 서버 오류) 시 SDK가 naver.maps를 null로 비운다.
    // 그 상태로 다시 그리면 페이지 전체가 깨지므로 지도만 건너뛰고 목록·링크는 살린다.
    if (!sdkReady || !mapElRef.current || !window.naver?.maps || stops.length === 0) return;

    const maps = window.naver.maps;
    const positions = stops.map((s) => new maps.LatLng(s.lat, s.lng));
    const map = new maps.Map(mapElRef.current, {
      center: positions[0],
      zoom: 13,
    });

    stops.forEach((stop, i) => {
      const position = positions[i];
      const marker = new maps.Marker({
        position,
        map,
        icon: {
          content: `<div style="background:#2f6f4f;color:#fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.35)">${stop.order}</div>`,
          anchor: new maps.Point(13, 13),
        },
      });
      const infoWindow = new maps.InfoWindow({
        content:
          `<div style="padding:6px 10px;font-size:12px;white-space:nowrap;">${escapeHtml(stop.name)}` +
          (stop.url
            ? ` <a href="${escapeHtml(stop.url)}" target="_blank" rel="noreferrer" style="margin-left:6px;color:#2f6f4f;font-weight:700;">네이버 지도 →</a>`
            : "") +
          `</div>`,
        borderWidth: 0,
      });
      maps.Event.addListener(marker, "click", () => {
        infoWindow.open(map, marker);
      });
    });

    if (showRoute && positions.length > 1) {
      new maps.Polyline({
        map,
        path: positions,
        strokeColor: "#2f6f4f",
        strokeWeight: 3,
        strokeOpacity: 0.8,
      });
    }

    if (positions.length > 1) {
      const bounds = new maps.LatLngBounds(positions[0], positions[0]);
      positions.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds);
    }
  }, [sdkReady, stops, showRoute]);

  if (!clientId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-4 text-center text-sm text-[var(--color-muted)]">
        NEXT_PUBLIC_NCP_MAP_CLIENT_ID가 설정되지 않았습니다. .env.local을 확인하세요.
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`}
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
      />
      <div ref={mapElRef} className="h-64 w-full overflow-hidden rounded-[var(--radius-card)] sm:h-96" />
    </>
  );
}
