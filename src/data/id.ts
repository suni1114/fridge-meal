// 동기화 대비: 전역 고유 ID(UUID v4)와 변경 타임스탬프 생성.
// 지금은 로컬 전용이지만, 추후 계정 동기화/가족 공유 시 기기 간 ID 충돌과
// 충돌 해결(last-write-wins)을 위해 미리 도입해 둔다.

// UUID v4. 런타임에 crypto.randomUUID가 있으면 사용하고, 없으면 Math.random 폴백.
export function uid(): string {
  const c: any = (globalThis as any).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 변경 시각(ISO 8601). 동기화 충돌 해결의 기준값.
export function nowISO(): string {
  return new Date().toISOString();
}
