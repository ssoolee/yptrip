import MapScreen from "@/components/MapScreen";
import { MapStop } from "@/components/NaverMapView";
import { SNAPSHOT_PLACES } from "@/lib/data/placeSnapshot";

// 찜한 코스가 없을 때 보여줄 양평 주요 관광지 — 스냅샷(인기순) 중 태그가 붙은
// 관광지 상위 10곳. 스냅샷 전체가 클라이언트 번들에 들어가지 않도록 서버에서 고른다.
export default function MapPage() {
  const overviewStops: MapStop[] = SNAPSHOT_PLACES.filter((p) => p.category === "attraction" && p.tags.length > 0)
    .slice(0, 10)
    .map((p, i) => ({ lat: p.lat, lng: p.lng, name: p.name, order: i + 1 }));

  return <MapScreen overviewStops={overviewStops} />;
}
