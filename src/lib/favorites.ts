"use client";

import { Course } from "@/types/travel";

// docs/prd/04-favorites-prd.md §5 데이터 모델(로컬 저장) 구현.
// 로그인/Firestore 동기화는 06-infra-deployment-prd.md 참조 — 이후 연동.
const STORAGE_KEY = "ypaicourse.favorites.courses";

export interface FavoriteCourseEntry {
  courseId: string;
  title: string;
  presetType: string;
  savedAt: string;
  itinerarySnapshot: Course;
}

const listeners = new Set<() => void>();
let cache: FavoriteCourseEntry[] = readFromStorage();

function readFromStorage(): FavoriteCourseEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FavoriteCourseEntry[]) : [];
  } catch {
    return [];
  }
}

function persist(entries: FavoriteCourseEntry[]) {
  cache = entries;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
  listeners.forEach((listener) => listener());
}

export function subscribeFavorites(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getFavoritesSnapshot(): FavoriteCourseEntry[] {
  return cache;
}

const EMPTY_FAVORITES: FavoriteCourseEntry[] = [];

export function getFavoritesServerSnapshot(): FavoriteCourseEntry[] {
  return EMPTY_FAVORITES;
}

export function isFavoriteCourse(courseId: string): boolean {
  return cache.some((e) => e.courseId === courseId);
}

export function toggleFavoriteCourse(course: Course): boolean {
  const idx = cache.findIndex((e) => e.courseId === course.courseId);
  if (idx >= 0) {
    persist(cache.filter((e) => e.courseId !== course.courseId));
    return false;
  }
  persist([
    {
      courseId: course.courseId,
      title: course.title,
      presetType: course.presetType,
      savedAt: new Date().toISOString(),
      itinerarySnapshot: course,
    },
    ...cache,
  ]);
  return true;
}

export function removeFavoriteCourse(courseId: string) {
  persist(cache.filter((e) => e.courseId !== courseId));
}
