// 날짜 유틸 — 소비기한은 절대 날짜(ISO 'YYYY-MM-DD')로 저장하고,
// 화면에 보여줄 D-day(남은 일수)는 '오늘' 기준으로 매번 계산한다.
// 이렇게 하면 날짜가 지날수록 D-day가 자동으로 줄어든다.
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MS_DAY = 86400000;

// 오늘 자정(로컬).
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

// Date → 'YYYY-MM-DD' (로컬 기준, UTC 변환으로 인한 하루 밀림 방지).
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 'YYYY-MM-DD' → 자정 기준 Date.
export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// 오늘 기준 남은 일수. expiry 없으면 null(미입력). 음수면 이미 지남.
export function daysUntil(expiry: string | null | undefined): number | null {
  if (!expiry) return null;
  return Math.round((fromISO(expiry).getTime() - startOfToday().getTime()) / MS_DAY);
}

// N일 뒤 날짜의 ISO 문자열(빠른 선택용: '3일', '7일'... / 음수면 과거).
export const isoInDays = (n: number) => toISO(addDays(startOfToday(), n));

// 오늘 날짜 ISO('YYYY-MM-DD').
export const todayISO = () => toISO(startOfToday());

export const sameYMD = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const fmtMD = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
export const fmtFull = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
// '2026.06.11(목)' 형식.
export const fmtDot = (d: Date) =>
  `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}(${WEEKDAYS[d.getDay()]})`;
