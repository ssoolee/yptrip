"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { Course } from "@/types/travel";

// docs/prd/04-favorites-prd.md §5 데이터 모델 구현.
// 비로그인: localStorage만 사용. 로그인: 로컬 데이터를 Firestore
// users/{uid}/favoriteCourses 로 1회 병합한 뒤 서버 기준으로 동기화
// (06-infra-deployment-prd.md §3).
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

// 로그인 중인 사용자. null이면 로컬 저장소만 쓴다.
let currentUid: string | null = null;
let unsubscribeRemote: (() => void) | null = null;

function persist(entries: FavoriteCourseEntry[]) {
  cache = entries;
  // 로그인 상태에서도 로컬 미러를 유지한다 — 로그아웃 후에도 목록이 남고,
  // Firestore 쓰기가 실패해도 데이터가 사라지지 않는다(04 §8).
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
  listeners.forEach((listener) => listener());
}

function coursesCollection(uid: string) {
  return collection(getFirebaseDb(), "users", uid, "favoriteCourses");
}

/**
 * 로그인/로그아웃 시 호출한다(AuthProvider).
 * 로그인: 로컬 찜을 Firestore에 합집합으로 병합한 뒤 서버 스냅샷을 구독한다.
 * 로그아웃: 구독을 끊고 로컬 저장소 기준으로 되돌린다.
 */
export function attachFavoritesUser(uid: string | null) {
  if (uid === currentUid) return;
  unsubscribeRemote?.();
  unsubscribeRemote = null;
  currentUid = uid;

  if (!uid) {
    persist(readFromStorage());
    return;
  }

  void mergeLocalIntoRemote(uid).then((pending) => {
    // 병합이 실패해도 구독은 건다 — 서버에 이미 있는 찜은 보여줘야 한다.
    if (currentUid !== uid) return;
    unsubscribeRemote = onSnapshot(
      coursesCollection(uid),
      (snap) => {
        const entries = snap.docs.map((d) => d.data() as FavoriteCourseEntry);
        // 올리지 못한 로컬 찜은 서버 목록에 얹어 유지한다 — 서버 스냅샷으로
        // 로컬 미러를 덮어쓰면서 데이터가 사라지지 않도록(04 §8).
        const remoteIds = new Set(entries.map((e) => e.courseId));
        const merged = [...entries, ...pending.filter((e) => !remoteIds.has(e.courseId))];
        persist(merged.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1)));
      },
      (error) => console.warn("[favorites] Firestore 구독 실패", error),
    );
  });
}

/**
 * 로컬에만 있는 찜을 서버로 올린다. 서버에 이미 같은 courseId가 있으면
 * 찜한 시점의 스냅샷을 덮어쓰지 않도록 건너뛴다(합집합, 04 §4 Must).
 * 반환값은 올리지 못한 로컬 찜 — 다음 로그인에서 다시 시도한다.
 */
async function mergeLocalIntoRemote(uid: string): Promise<FavoriteCourseEntry[]> {
  const local = readFromStorage();
  if (local.length === 0) return [];
  try {
    const remote = await getDocs(coursesCollection(uid));
    const remoteIds = new Set(remote.docs.map((d) => d.id));
    const toUpload = local.filter((entry) => !remoteIds.has(entry.courseId));
    if (toUpload.length === 0) return [];
    const batch = writeBatch(getFirebaseDb());
    toUpload.forEach((entry) => batch.set(doc(coursesCollection(uid), entry.courseId), entry));
    await batch.commit();
    return [];
  } catch (error) {
    // 병합 실패 시 로컬 데이터를 그대로 유지한다(04 §8) — 다음 로그인에서 재시도.
    console.warn("[favorites] 로컬 → Firestore 병합 실패", error);
    return local;
  }
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
  if (cache.some((e) => e.courseId === course.courseId)) {
    removeFavoriteCourse(course.courseId);
    return false;
  }
  const entry: FavoriteCourseEntry = {
    courseId: course.courseId,
    title: course.title,
    presetType: course.presetType,
    savedAt: new Date().toISOString(),
    itinerarySnapshot: course,
  };
  // 낙관적 업데이트(04 §8) — 화면은 즉시 바꾸고 서버 쓰기는 뒤따라간다.
  persist([entry, ...cache]);
  if (currentUid) {
    const uid = currentUid;
    void setDoc(doc(coursesCollection(uid), entry.courseId), entry).catch((error) =>
      console.warn("[favorites] 찜 저장 실패", error),
    );
  }
  return true;
}

export function removeFavoriteCourse(courseId: string) {
  persist(cache.filter((e) => e.courseId !== courseId));
  if (currentUid) {
    const uid = currentUid;
    void deleteDoc(doc(coursesCollection(uid), courseId)).catch((error) =>
      console.warn("[favorites] 찜 취소 실패", error),
    );
  }
}
