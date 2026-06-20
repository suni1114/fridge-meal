// V1.0 domain constants — categories, storage locations, stock levels.
import { CatKey } from '../theme/tokens';
import { IconName } from '../components/Icon';

// 식재료 카테고리 (spec §2.4) — code → 라벨 · 타일 색 · 아이콘
export const CATEGORY: Record<string, { label: string; color: CatKey; icon: IconName }> = {
  protein: { label: '단백질', color: 'amber', icon: 'egg' },
  veg: { label: '채소', color: 'green', icon: 'plant' },
  fruit: { label: '과일', color: 'coral', icon: 'orange' },
  grain: { label: '곡류/면', color: 'wheat', icon: 'bowl-food' },
  dairy: { label: '유제품', color: 'blue', icon: 'drop' },
  sauce: { label: '양념/소스', color: 'brown', icon: 'jar' },
  processed: { label: '가공식품', color: 'pink', icon: 'package' },
  drink: { label: '음료', color: 'teal', icon: 'coffee' },
  etc: { label: '기타', color: 'grey', icon: 'cube' },
};
export type CategoryCode = keyof typeof CATEGORY;

// 보관 위치 (spec §2.3) — 필터용. 'all' 은 전체.
export const STORAGE: { code: string; label: string; icon: IconName }[] = [
  { code: 'all', label: '전체', icon: 'list-checks' },
  { code: 'refrigerated', label: '냉장', icon: 'thermometer-cold' },
  { code: 'frozen', label: '냉동', icon: 'snowflake' },
  { code: 'room_temp', label: '실온', icon: 'sun-horizon' },
  { code: 'sauce', label: '양념/소스', icon: 'jar' },
  { code: 'etc', label: '기타', icon: 'cube' },
];

export const STORAGE_LABEL: Record<string, string> = {
  refrigerated: '냉장',
  frozen: '냉동',
  room_temp: '실온',
  sauce: '양념/소스',
  etc: '기타',
};

// 남은 정도 (spec §9.7) — 충분함 → 조금 남음 → 거의 없음 → 없음
export type StockLevel = 'enough' | 'low' | 'very_low' | 'empty';
export const STOCK_ORDER: StockLevel[] = ['enough', 'low', 'very_low', 'empty'];
export const STOCK: Record<StockLevel, { label: string; color: CatKey | 'urgent' | 'warn' | 'ok' }> = {
  enough: { label: '충분함', color: 'ok' },
  low: { label: '조금 남음', color: 'warn' },
  very_low: { label: '거의 없음', color: 'urgent' },
  empty: { label: '없음', color: 'urgent' },
};

// 정렬 옵션 (spec §9.7) — 기본은 유통기한 임박순
export const SORT_OPTIONS = ['유통기한 임박순', '최근 등록순', '이름순', '남은 정도순'] as const;

// 식재료 → 이모지 일러스트. 실제 식재료에 가장 가까운 그림으로 매핑.
export const FOOD_EMOJI: Record<string, string> = {
  // 단백질
  계란: '🥚', 두부: '🧈', 닭가슴살: '🍗', 돼지고기: '🥩', 소고기: '🥩', 닭고기: '🍗',
  냉동새우: '🦐', 생선: '🐟',
  // 채소
  대파: '🌿', 양파: '🧅', 마늘: '🧄', 감자: '🥔', 당근: '🥕', 애호박: '🥒',
  브로콜리: '🥦', 양상추: '🥬', 오이: '🥒', 양배추: '🥬', 버섯: '🍄', 콩나물: '🌱',
  방울토마토: '🍅', 토마토: '🍅', 고구마: '🍠', 김치: '🥬', 고추: '🌶️',
  // 과일
  사과: '🍎', 바나나: '🍌', 아몬드: '🥜',
  // 곡류/면
  밥: '🍚', 현미밥: '🍚', 쌀: '🍚', 라면: '🍜', 스파게티: '🍝', 식빵: '🍞',
  // 유제품 / 음료
  우유: '🥛', 치즈: '🧀', 요거트: '🥛', 그릭요거트: '🥛', 두유: '🥛', 아이스크림: '🍦', 버터: '🧈',
  // 양념/소스
  고추장: '🌶️', 된장: '🫙', 간장: '🍶', 참기름: '🫗', 식용유: '🫗', 올리브유: '🫗', 소금: '🧂', 식초: '🍶',
  // 가공식품
  냉동만두: '🥟', 스팸: '🥫', 참치캔: '🥫', 김: '🍙',
};

// 카테고리 기본 이모지 (매핑에 없는 식재료 대비)
export const CATEGORY_EMOJI: Record<string, string> = {
  protein: '🍖', veg: '🥬', fruit: '🍎', grain: '🍚', dairy: '🥛',
  sauce: '🧂', processed: '🥫', drink: '🥤', etc: '🍽️',
};

export function emojiFor(name: string, category?: string): string {
  return FOOD_EMOJI[name] ?? (category ? CATEGORY_EMOJI[category] : undefined) ?? '🍽️';
}

// ── 세분화 카테고리 (냉장고 '카테고리별 보기' 전용) ──────────────────────────
// 보관 위치(냉장/냉동/실온)와 별개로, 식재료를 종류별로 묶어 보여주기 위한 분류.
export const FINE_CATEGORIES: { code: string; label: string; emoji: string }[] = [
  { code: 'meat', label: '육류', emoji: '🥩' },
  { code: 'seafood', label: '수산물', emoji: '🐟' },
  { code: 'egg_dairy', label: '계란·유제품', emoji: '🥚' },
  { code: 'veg', label: '채소', emoji: '🥬' },
  { code: 'fruit', label: '과일', emoji: '🍎' },
  { code: 'grain', label: '곡류·면', emoji: '🍚' },
  { code: 'tofu_bean', label: '두부·콩류', emoji: '🫘' },
  { code: 'processed', label: '가공식품', emoji: '🥫' },
  { code: 'sauce', label: '양념·소스', emoji: '🧂' },
  { code: 'nuts_snack', label: '견과·간식', emoji: '🥜' },
  { code: 'bakery', label: '빵·베이커리', emoji: '🍞' },
  { code: 'frozen', label: '냉동식품', emoji: '🧊' },
  { code: 'mealkit', label: '밀키트·간편식', emoji: '🍱' },
  { code: 'drink', label: '음료', emoji: '🥤' },
  { code: 'etc', label: '기타', emoji: '🍽️' },
];

// 식재료명 → 세분화 카테고리.
const FINE_BY_NAME: Record<string, string> = {
  // 육류
  소고기: 'meat', 돼지고기: 'meat', 닭고기: 'meat', 닭가슴살: 'meat', 오리고기: 'meat', 다짐육: 'meat',
  // 수산물
  생선: 'seafood', 새우: 'seafood', 냉동새우: 'seafood', 오징어: 'seafood', 조개: 'seafood', 게: 'seafood',
  // 계란·유제품
  계란: 'egg_dairy', 우유: 'egg_dairy', 치즈: 'egg_dairy', 버터: 'egg_dairy', 요거트: 'egg_dairy', 그릭요거트: 'egg_dairy',
  // 채소
  양파: 'veg', 감자: 'veg', 당근: 'veg', 상추: 'veg', 양상추: 'veg', 배추: 'veg', 양배추: 'veg', 대파: 'veg',
  마늘: 'veg', 애호박: 'veg', 브로콜리: 'veg', 오이: 'veg', 버섯: 'veg', 콩나물: 'veg', 방울토마토: 'veg',
  토마토: 'veg', 고구마: 'veg', 김치: 'veg', 고추: 'veg',
  // 과일
  사과: 'fruit', 바나나: 'fruit', 딸기: 'fruit', 귤: 'fruit',
  // 곡류·면
  쌀: 'grain', 현미: 'grain', 밥: 'grain', 현미밥: 'grain', 파스타: 'grain', 스파게티: 'grain', 국수: 'grain', 라면: 'grain',
  // 두부·콩류
  두부: 'tofu_bean', 콩: 'tofu_bean', 낫또: 'tofu_bean', 두유: 'tofu_bean',
  // 가공식품
  햄: 'processed', 소시지: 'processed', 어묵: 'processed', 통조림: 'processed', 스팸: 'processed', 참치캔: 'processed', 김: 'processed',
  // 양념·소스
  고추장: 'sauce', 된장: 'sauce', 간장: 'sauce', 케첩: 'sauce', 마요네즈: 'sauce', 참기름: 'sauce',
  식용유: 'sauce', 올리브유: 'sauce', 소금: 'sauce', 후추: 'sauce', 설탕: 'sauce', 굴소스: 'sauce', 식초: 'sauce', 카레가루: 'sauce',
  // 견과·간식
  아몬드: 'nuts_snack', 과자: 'nuts_snack', 초콜릿: 'nuts_snack', 아이스크림: 'nuts_snack',
  // 빵·베이커리
  식빵: 'bakery', 베이글: 'bakery', 크루아상: 'bakery',
  // 냉동식품
  냉동만두: 'frozen', 냉동피자: 'frozen', 냉동볶음밥: 'frozen',
  // 밀키트·간편식
  밀키트: 'mealkit', 즉석식품: 'mealkit', 도시락: 'mealkit',
  // 음료
  주스: 'drink', 탄산음료: 'drink', 생수: 'drink',
};

// 기존 9분류 → 세분화 카테고리 폴백 (이름 매핑에 없을 때).
const COARSE_TO_FINE: Record<string, string> = {
  protein: 'meat', veg: 'veg', fruit: 'fruit', grain: 'grain', dairy: 'egg_dairy',
  sauce: 'sauce', processed: 'processed', drink: 'drink', etc: 'etc',
};

export function fineCategoryOf(name: string, category?: string): string {
  return FINE_BY_NAME[name] ?? (category ? COARSE_TO_FINE[category] : undefined) ?? 'etc';
}

// 레시피 → 이모지 일러스트. 식재료 타일과 같은 스타일로 카드/상세에 렌더.
// 한식은 전용 이모지가 없어 가장 가까운 그림으로 매핑 (추후 전용 일러스트 교체 가능).
export const RECIPE_EMOJI: Record<string, string> = {
  'kimchi-fried-rice': '🍚', // 김치볶음밥
  'tofu-kimchi': '🥘', // 두부김치
  'egg-roll': '🍳', // 계란말이
  'kimchi-stew': '🍲', // 김치찌개
  'doenjang-stew': '🫕', // 된장찌개
  'bean-sprout-soup': '🥣', // 콩나물국
};

export function recipeEmojiFor(id: string): string {
  return RECIPE_EMOJI[id] ?? '🍲';
}
