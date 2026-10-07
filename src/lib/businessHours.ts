// PRD-03 §5 참조. 원천 데이터(네이버 지역검색·TourAPI)는 영업시간을 정형 필드로 주지
// 않으므로 Place.businessHoursRaw의 자유 텍스트를 파싱한다. 파싱에 실패하면 null을
// 돌려주고, 화면은 원문 텍스트라도 그대로 노출한다.

// 0=일 … 6=토 (Date.getDay()와 같은 순서)
export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;
// 화면 표시 순서 — 월요일부터, 일요일이 마지막.
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const DAY_CHARS = "일월화수목금토";
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export interface TimeRange {
  // 자정 기준 분. 자정을 넘기는 영업(18:00-02:00)은 close가 1440을 넘는다.
  open: number;
  close: number;
}

export interface DayHours {
  weekday: number;
  ranges: TimeRange[];
  // 정기휴무 — ranges는 비어 있다.
  closed: boolean;
}

export interface ParsedBusinessHours {
  days: DayHours[];
  // 시간으로 옮기지 못한 부가 설명 (라스트오더, 브레이크타임 안내 등)
  note?: string;
}

export type HoursStatus =
  | { kind: "open"; closesAt?: string }
  | { kind: "closed"; opensAt?: string; opensWeekday?: number }
  | { kind: "dayoff" }
  | { kind: "unknown" };

const CLOSED_RE = /휴무|휴업|정기휴일|쉽니다|closed/i;
const ALL_DAY_RE = /24\s*시간/;
// "월~금", "월요일-금요일"
const DAY_SPAN_RE = /([일월화수목금토])(?:요일)?\s*[~\-–—]\s*([일월화수목금토])(?:요일)?/g;

/** 영업시간 자유 텍스트를 요일별 구조로 옮긴다. 한 구간도 해석하지 못하면 null. */
export function parseBusinessHours(raw: string | undefined): ParsedBusinessHours | null {
  if (!raw?.trim()) return null;

  const segments = raw.split(/\s*[,\n·|]\s*|\s+\/\s+/).map((s) => s.trim()).filter(Boolean);
  // 뒤 구간이 앞 구간을 덮어쓴다 — "매일 11:00-20:00, 화 휴무" 같은 표기를 그대로 반영.
  const byWeekday = new Map<number, DayHours>();
  const notes: string[] = [];

  for (const segment of segments) {
    const closed = CLOSED_RE.test(segment);
    const ranges = parseRanges(segment);
    const weekdays = parseWeekdays(segment);
    // 영업시간도 휴무 표기도 없으면 부가 설명으로 돌린다.
    // 어느 요일인지 모르는 휴무("공휴일 휴무")도 전체를 휴무로 단정하지 않고 설명으로 남긴다.
    if ((!closed && ranges.length === 0) || (closed && !weekdays)) {
      notes.push(segment);
      continue;
    }
    // 요일 표기가 없는 영업시간은 매일로 본다 ("11:00-20:00"만 적힌 경우).
    for (const weekday of weekdays ?? ALL_DAYS) {
      byWeekday.set(weekday, { weekday, ranges: closed ? [] : ranges, closed });
    }
  }

  if (byWeekday.size === 0) return null;
  return {
    days: [...byWeekday.values()].sort((a, b) => a.weekday - b.weekday),
    note: notes.join(" ") || undefined,
  };
}

/** 구간에서 요일을 뽑는다. 요일 표기가 없으면 null. */
function parseWeekdays(segment: string): number[] | null {
  if (/매일|연중무휴/.test(segment)) return ALL_DAYS;

  const days = new Set<number>();
  if (/평일/.test(segment)) [1, 2, 3, 4, 5].forEach((d) => days.add(d));
  if (/주말/.test(segment)) [0, 6].forEach((d) => days.add(d));

  for (const match of segment.matchAll(DAY_SPAN_RE)) {
    const from = DAY_CHARS.indexOf(match[1]);
    const to = DAY_CHARS.indexOf(match[2]);
    // "토~월"처럼 주를 넘기는 표기도 있으므로 한 바퀴 돌며 채운다.
    for (let i = 0; i < 7; i += 1) {
      const day = (from + i) % 7;
      days.add(day);
      if (day === to) break;
    }
  }

  // "평일"·"공휴일"의 '일'을 일요일로 잘못 읽지 않도록 요일 범위·합성어를 먼저 지운다.
  const rest = segment.replace(DAY_SPAN_RE, " ").replace(/연중무휴|공휴일|법정휴일|휴일|평일|매일|당일|익일/g, " ");
  for (const match of rest.matchAll(/([일월화수목금토])요일|(?<![가-힣])([일월화수목금토])(?![가-힣])/g)) {
    days.add(DAY_CHARS.indexOf(match[1] ?? match[2]));
  }

  return days.size > 0 ? [...days] : null;
}

function parseRanges(segment: string): TimeRange[] {
  if (ALL_DAY_RE.test(segment)) return [{ open: 0, close: 24 * 60 }];

  const ranges: TimeRange[] = [];
  const re = /(\d{1,2})\s*(?::|시)\s*(\d{1,2})?\s*분?\s*[~\-–—]\s*(\d{1,2})\s*(?::|시)\s*(\d{1,2})?/g;
  for (const match of segment.matchAll(re)) {
    const open = Number(match[1]) * 60 + Number(match[2] ?? 0);
    let close = Number(match[3]) * 60 + Number(match[4] ?? 0);
    // 02:00 마감처럼 자정을 넘기는 영업.
    if (close <= open) close += 24 * 60;
    if (open < 24 * 60) ranges.push({ open, close });
  }
  return ranges;
}

/** 브라우저·서버 시계가 어디에 있든 한국 시간 기준으로 요일과 분을 구한다. */
export function seoulNow(date: Date = new Date()): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(value("weekday"));
  return {
    weekday: weekday < 0 ? date.getDay() : weekday,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

/** 지금 기준 영업 중 / 영업 종료 / 정기휴무를 판정한다. */
export function getHoursStatus(
  parsed: ParsedBusinessHours | null,
  now: { weekday: number; minutes: number } = seoulNow(),
): HoursStatus {
  if (!parsed) return { kind: "unknown" };

  const today = parsed.days.find((d) => d.weekday === now.weekday);
  // 오늘 요일이 표기에 없으면 영업 여부를 단정할 수 없다.
  if (!today) return { kind: "unknown" };
  if (today.closed) return { kind: "dayoff" };

  for (const range of today.ranges) {
    if (now.minutes >= range.open && now.minutes < range.close) {
      return isAllDay(range) ? { kind: "open" } : { kind: "open", closesAt: formatMinutes(range.close) };
    }
  }
  // 어제 시작한 영업이 자정을 넘겨 이어지는 경우.
  const yesterday = parsed.days.find((d) => d.weekday === (now.weekday + 6) % 7);
  for (const range of yesterday?.ranges ?? []) {
    if (range.close > 24 * 60 && now.minutes < range.close - 24 * 60) {
      return { kind: "open", closesAt: formatMinutes(range.close) };
    }
  }

  const laterToday = today.ranges.find((range) => now.minutes < range.open);
  if (laterToday) return { kind: "closed", opensAt: formatMinutes(laterToday.open) };

  for (let i = 1; i <= 7; i += 1) {
    const weekday = (now.weekday + i) % 7;
    const day = parsed.days.find((d) => d.weekday === weekday);
    if (day && !day.closed && day.ranges[0]) {
      return { kind: "closed", opensAt: formatMinutes(day.ranges[0].open), opensWeekday: weekday };
    }
  }
  return { kind: "closed" };
}

export function formatMinutes(minutes: number): string {
  const wrapped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(wrapped / 60)).padStart(2, "0");
  const mm = String(wrapped % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function isAllDay(range: TimeRange): boolean {
  return range.open === 0 && range.close === 24 * 60;
}

export function formatRange(range: TimeRange): string {
  if (isAllDay(range)) return "24시간";
  const overnight = range.close > 24 * 60;
  return `${formatMinutes(range.open)} - ${overnight ? "익일 " : ""}${formatMinutes(range.close)}`;
}
