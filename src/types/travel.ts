export type Category = "restaurant" | "cafe" | "attraction" | "lodging";

export type PresetType =
  | "solo"
  | "couple"
  | "family"
  | "friends"
  | "pet"
  | "mbti"
  | "festival";

export interface Place {
  placeId: string;
  name: string;
  category: Category;
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
