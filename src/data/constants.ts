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
