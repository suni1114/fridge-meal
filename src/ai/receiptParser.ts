// 영수증 OCR 텍스트 → 아는 식재료 추출.
// 핵심: 한 글자 이름(무·김·번 등)은 영수증 보일러플레이트(주문"번"호, "무"료 …)에 부분일치로
// 매번 걸려 오탐이 난다. 그래서 한글 토큰으로 쪼갠 뒤,
//   · 한 글자 이름 → 토큰과 "정확히 일치"할 때만 인정 ("번 1개" ✅ / "번호" ❌)
//   · 두 글자 이상 이름 → 토큰 안에 부분일치 허용 ("서울우유" → "우유" ✅)
import { FINE_CATEGORY_ITEMS } from '../data/constants';

export type RecognizedItem = { name: string; amount: string };

const KNOWN_NAMES = Array.from(new Set(Object.values(FINE_CATEGORY_ITEMS).flat())).sort(
  (a, b) => b.length - a.length
);

// 영수증에 흔한 비식재료 단어 — 두 글자+ 이름의 오탐도 줄인다.
const STOP = new Set([
  '번호', '합계', '금액', '카드', '현금', '부가세', '과세', '면세', '포인트', '적립', '승인',
  '거래', '매장', '전화', '사업자', '주소', '영수증', '봉투', '결제', '할인', '단가', '수량',
  '공급가', '상품', '품목', '구매', '판매', '반품', '교환', '고객', '회원', '잔액', '받을',
]);

export function parseReceipt(text: string): RecognizedItem[] {
  const tokens = (text ?? '').match(/[가-힣]+/g) ?? [];
  const tokenSet = new Set(tokens); // 한 글자 이름: 정확히 일치
  const longTokens = tokens.filter((t) => !STOP.has(t)); // 두 글자+ 이름: 부분일치 대상
  const found: RecognizedItem[] = [];
  const seen = new Set<string>();
  for (const name of KNOWN_NAMES) {
    if (seen.has(name)) continue;
    const hit = name.length === 1 ? tokenSet.has(name) : longTokens.some((t) => t.includes(name));
    if (hit) {
      seen.add(name);
      found.push({ name, amount: '1' });
    }
  }
  return found;
}
