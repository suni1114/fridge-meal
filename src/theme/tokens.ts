// Design tokens — warm / homey direction per the V1.0 dev spec (§19 디자인 방향):
// 브랜드 그린 + 크림 화이트 + 오렌지 강조 + 코랄 임박. 가정적·실용·복잡하지 않게.
// primary는 로고(assets/logo.svg)의 초록과 동일하게 맞춘다.

export const colors = {
  primary: '#01A863', // 브랜드 그린 (로고와 동일)
  primaryDark: '#01834D',
  primaryBg: '#E6F6EF',

  accent: '#F2A93B', // 오렌지 강조
  accentBg: '#FCEFD7',
  accentDark: '#C8791E',

  coral: '#E8694A', // 위험 / 임박
  coralBg: '#FBE5DE',

  // 요리추천 '임박재료' 표시 — 목록·상세 공용
  nearBg: '#FFF2EC', // 배경
  nearFg: '#E04D00', // 글씨 · 불꽃 아이콘

  cream: '#F2F3F4', // 앱 배경 (연한 그레이 — 이전 크림 #FBF8F1에서 변경)
  surface: '#FFFFFF', // 카드 표면
  darkGreen: '#1F3A2B', // 깊은 그린 (소진 예측 카드 / 히어로 / 온보딩)

  ink: '#33352F', // 진한 회색 텍스트
  inkAlt: '#6E7066', // 보조 텍스트
  inkAsst: '#A1A399', // 흐린 텍스트

  line: '#E7E8EA', // 옅은 구분선 (그레이 배경에 맞춘 중립 톤)
  lineStrong: '#D3D5D8',
  fill: '#EFF0F2', // 옅은 채움

  white: '#FFFFFF',
} as const;

// 남은 정도 / D-day 긴급도 색
export const urgency = {
  urgent: { fg: colors.coral, bg: colors.coralBg },
  warn: { fg: colors.accentDark, bg: colors.accentBg },
  ok: { fg: colors.inkAlt, bg: colors.fill },
} as const;

// 카테고리별 컬러 타일 (따뜻한 톤)
export const cat = {
  amber: { fg: '#D98A2B', bg: '#FBEFD9' },
  green: { fg: '#5B9E54', bg: '#E9F3E5' },
  coral: { fg: '#E0705A', bg: '#FBE7E0' },
  wheat: { fg: '#C79A3E', bg: '#F7EFD6' },
  blue: { fg: '#5E86C9', bg: '#E8F0FB' },
  brown: { fg: '#B6743C', bg: '#F3E7DA' },
  pink: { fg: '#C76B86', bg: '#F8E6EC' },
  teal: { fg: '#5BA6A0', bg: '#E4F2F0' },
  grey: { fg: '#8E8F86', bg: '#EFEDE6' },
} as const;

export type CatKey = keyof typeof cat;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;
