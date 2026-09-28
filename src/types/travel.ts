export type Category = "restaurant" | "cafe" | "attraction" | "lodging";

export type PresetType =
  | "solo"
  | "couple"
  | "family"
  | "friends"
  | "pet"
  | "mbti"
  | "festival"
  // 자연어 요청으로 만든 코스 (/course/search)
  | "custom";

export interface Place {
  placeId: string;
  name: string;
  category: Category;
  // 원천 데이터의 세부 업종 (예: 네이버 "한식>막국수"). 태깅 근거로 쓴다.
  categoryLabel?: string;
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  rating?: number;
  businessHoursRaw?: string;
  photos: string[];
  mapUrl: string;
  tags: string[];
  petFriendly?: boolean;
  reviewSummary?: string;
}

export interface ItineraryStop extends Place {
  timeSlot: string;
}

export interface ItineraryDay {
  day: number;
  stops: ItineraryStop[];
}

export interface Course {
  courseId: string;
  title: string;
  presetType: PresetType;
  days: ItineraryDay[];
}

export interface PresetDefinition {
  type: PresetType;
  label: string;
  emoji: string;
  description: string;
  tags: string[];
}
