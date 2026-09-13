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
  maps: {
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
    if (!sdkReady || !mapElRef.current || !window.naver || stops.length === 0) return;

    const { naver } = window;
    const positions = stops.map((s) => new naver.maps.LatLng(s.lat, s.lng));
    const map = new naver.maps.Map(mapElRef.current, {
      center: positions[0],
      zoom: 13,
    });

    stops.forEach((stop, i) => {
      const position = positions[i];
      const marker = new naver.maps.Marker({
        position,
        map,
        icon: {
          content: `<div style="background:#2f6f4f;color:#fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.35)">${stop.order}</div>`,
          anchor: new naver.maps.Point(13, 13),
        },
      });
      const infoWindow = new naver.maps.InfoWindow({
        content: `<div style="padding:6px 10px;font-size:12px;white-space:nowrap;">${stop.name}</div>`,
        borderWidth: 0,
      });
      naver.maps.Event.addListener(marker, "click", () => {
        infoWindow.open(map, marker);
      });
    });

    if (showRoute && positions.length > 1) {
      new naver.maps.Polyline({
        map,
        path: positions,
        strokeColor: "#2f6f4f",
        strokeWeight: 3,
        strokeOpacity: 0.8,
      });
    }

    if (positions.length > 1) {
      const bounds = new naver.maps.LatLngBounds(positions[0], positions[0]);
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
