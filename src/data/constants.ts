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
  // ── 확장 재료 이모지 ──
  // 과일
  오렌지: '🍊', 포도: '🍇', 거봉: '🍇', 샤인머스켓: '🍇', 그린키위: '🥝', 골드키위: '🥝', 레드키위: '🥝',
  파인애플: '🍍', 천도복숭아: '🍑', 백도: '🍑', 황도: '🍑', 납작복숭아: '🍑', 신비복숭아: '🍑', 자두: '🍑',
  배: '🍐', 레몬: '🍋', 자몽: '🍊', 수박: '🍉', 멜론: '🍈', 참외: '🍈', 단감: '🍊', 홍시: '🍊', 곶감: '🍊',
  망고: '🥭', 파파야: '🥭', 블루베리: '🫐', 크랜베리: '🫐', 블랙베리: '🫐', 오디: '🫐', 라즈베리: '🍓',
  산딸기: '🍓', 한라봉: '🍊', 천혜향: '🍊', 레드향: '🍊', 살구: '🍑', 석류: '🍎', 무화과: '🍑', 용과: '🐉',
  패션후르츠: '🍈', 리치: '🍒', 람부탄: '🍒', 건대추: '🌰',
  // 육류
  삼겹살: '🥓', 베이컨: '🥓', 목살: '🥩', 등심: '🥩', 안심: '🥩', 차돌박이: '🥩', 갈비: '🍖', 불고기감: '🥩',
  소고기다짐육: '🥩', 돼지고기다짐육: '🥩',
  닭다리살: '🍗', 닭안심: '🍗', 닭봉: '🍗', 양고기: '🥩', 족발: '🍖',
  // 수산물
  고등어: '🐟', 갈치: '🐟', 연어: '🐟', 광어: '🐟', 명태: '🐟', 코다리: '🐟', 멸치: '🐟', 문어: '🐙',
  낙지: '🐙', 주꾸미: '🐙', 게: '🦀', 새우: '🦐', 바지락: '🦪', 홍합: '🦪', 가리비: '🦪', 전복: '🦪',
  굴: '🦪', 미역: '🌿', 다시마: '🌿', 오징어: '🦑',
  // 유제품
  메추리알: '🥚', 생크림: '🥛', 휘핑크림: '🥛', 연유: '🥛', 모짜렐라: '🧀', 체다치즈: '🧀', 슬라이스치즈: '🧀', 크림치즈: '🧀',
  // 채소
  쪽파: '🌿', 부추: '🌿', 시금치: '🥬', 깻잎: '🌿', 무: '🥬', 청경채: '🥬', 셀러리: '🥬', 파프리카: '🫑',
  피망: '🫑', 가지: '🍆', 단호박: '🎃', 표고버섯: '🍄', 느타리버섯: '🍄', 팽이버섯: '🍄', 새송이버섯: '🍄',
  양송이버섯: '🍄', 청양고추: '🌶️', 옥수수: '🌽', 숙주: '🌱', 미나리: '🌿', 로메인: '🥬', 아스파라거스: '🥬', 생강: '🫚',
  // 곡류·면
  잡곡: '🌾', 보리: '🌾', 귀리: '🌾', 오트밀: '🥣', 소면: '🍜', 우동면: '🍜', 칼국수면: '🍜', 당면: '🍜',
  쌀국수: '🍜', 메밀국수: '🍜', 떡: '🍡', 떡국떡: '🍡', 시리얼: '🥣', 밀가루: '🌾', 부침가루: '🌾', 튀김가루: '🌾', 빵가루: '🍞',
  // 두부·콩류
  순두부: '🧈', 연두부: '🧈', 검은콩: '🫘', 병아리콩: '🫘', 렌틸콩: '🫘', 강낭콩: '🫘', 완두콩: '🫛',
  // 가공식품
  햄: '🍖', 소시지: '🌭', 비엔나: '🌭', 게맛살: '🦀', 꽁치캔: '🥫', 골뱅이: '🥫', 옥수수콘: '🌽',
  // 양념·소스
  고춧가루: '🌶️', 다진마늘: '🧄', 토마토소스: '🍅', 파스타소스: '🍅', 스리라차: '🌶️', 칠리소스: '🌶️',
  들기름: '🫗', 꿀: '🍯', 잼: '🍓', 땅콩버터: '🥜', 쌈장: '🌶️',
  // 견과·간식
  호두: '🥜', 캐슈넛: '🥜', 피스타치오: '🥜', 마카다미아: '🥜', 땅콩: '🥜', 견과믹스: '🥜', 젤리: '🍬',
  사탕: '🍬', 쿠키: '🍪', 크래커: '🍪', 팝콘: '🍿',
  // 빵·베이커리
  베이글: '🥯', 크루아상: '🥐', 모닝빵: '🍞', 바게트: '🥖', 카스텔라: '🍰', 머핀: '🧁', 도넛: '🍩',
  케이크: '🍰', 호밀빵: '🍞', 통밀빵: '🍞', 번: '🍔', 또띠아: '🫓', 와플: '🧇',
  // 냉동식품
  냉동피자: '🍕', 냉동볶음밥: '🍚', 냉동치킨: '🍗', 냉동돈까스: '🍖', 냉동핫도그: '🌭', 냉동너겟: '🍗',
  냉동감자: '🍟', 냉동야채: '🥦', 군만두: '🥟', 물만두: '🥟', 냉동붕어빵: '🐟',
  // 밀키트·간편식
  즉석밥: '🍚', 컵라면: '🍜', 컵밥: '🍚', 레토르트카레: '🍛', 죽: '🥣', 즉석국: '🍲', 삼각김밥: '🍙',
  김밥: '🍙', 샌드위치: '🥪', 냉면: '🍜',
  // 음료
  주스: '🧃', 탄산음료: '🥤', 생수: '💧', 콜라: '🥤', 사이다: '🥤', 이온음료: '🥤', 보리차: '🍵',
  녹차: '🍵', 커피: '☕', 탄산수: '💧', 유자차: '🍵', 아메리카노: '☕', 홍차: '🍵', 매실차: '🍵',
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
  소고기: 'meat', 돼지고기: 'meat', 닭고기: 'meat', 오리고기: 'meat', 소고기다짐육: 'meat', 돼지고기다짐육: 'meat', 닭가슴살: 'meat',
  삼겹살: 'meat', 목살: 'meat', 등심: 'meat', 안심: 'meat', 양지: 'meat', 사태: 'meat', 차돌박이: 'meat',
  닭다리살: 'meat', 닭안심: 'meat', 닭봉: 'meat', 양고기: 'meat', 불고기감: 'meat', 갈비: 'meat', 족발: 'meat',
  // 수산물
  생선: 'seafood', 새우: 'seafood', 냉동새우: 'seafood', 오징어: 'seafood', 조개: 'seafood', 게: 'seafood',
  고등어: 'seafood', 갈치: 'seafood', 연어: 'seafood', 광어: 'seafood', 명태: 'seafood', 코다리: 'seafood',
  멸치: 'seafood', 바지락: 'seafood', 홍합: 'seafood', 가리비: 'seafood', 전복: 'seafood', 문어: 'seafood',
  낙지: 'seafood', 주꾸미: 'seafood', 굴: 'seafood', 미역: 'seafood', 다시마: 'seafood', 새우젓: 'seafood',
  // 계란·유제품
  계란: 'egg_dairy', 메추리알: 'egg_dairy', 우유: 'egg_dairy', 치즈: 'egg_dairy', 버터: 'egg_dairy',
  요거트: 'egg_dairy', 그릭요거트: 'egg_dairy', 생크림: 'egg_dairy', 휘핑크림: 'egg_dairy', 연유: 'egg_dairy',
  사워크림: 'egg_dairy', 모짜렐라: 'egg_dairy', 체다치즈: 'egg_dairy', 슬라이스치즈: 'egg_dairy', 크림치즈: 'egg_dairy',
  // 채소
  양파: 'veg', 감자: 'veg', 당근: 'veg', 상추: 'veg', 양상추: 'veg', 배추: 'veg', 양배추: 'veg', 대파: 'veg',
  마늘: 'veg', 애호박: 'veg', 브로콜리: 'veg', 오이: 'veg', 버섯: 'veg', 콩나물: 'veg', 방울토마토: 'veg',
  토마토: 'veg', 고구마: 'veg', 김치: 'veg', 고추: 'veg', 쪽파: 'veg', 부추: 'veg', 시금치: 'veg', 깻잎: 'veg',
  무: 'veg', 청경채: 'veg', 셀러리: 'veg', 파프리카: 'veg', 피망: 'veg', 가지: 'veg', 단호박: 'veg', 연근: 'veg',
  우엉: 'veg', 도라지: 'veg', 표고버섯: 'veg', 느타리버섯: 'veg', 팽이버섯: 'veg', 새송이버섯: 'veg', 양송이버섯: 'veg',
  청양고추: 'veg', 생강: 'veg', 비트: 'veg', 아스파라거스: 'veg', 옥수수: 'veg', 숙주: 'veg', 미나리: 'veg',
  열무: 'veg', 콜라비: 'veg', 로메인: 'veg', 쑥갓: 'veg',
  // 과일
  사과: 'fruit', 바나나: 'fruit', 딸기: 'fruit', 귤: 'fruit', 오렌지: 'fruit', 포도: 'fruit', 샤인머스켓: 'fruit',
  그린키위: 'fruit', 골드키위: 'fruit', 레드키위: 'fruit', 파인애플: 'fruit', 천도복숭아: 'fruit', 백도: 'fruit',
  황도: 'fruit', 자두: 'fruit', 납작복숭아: 'fruit', 배: 'fruit', 레몬: 'fruit', 자몽: 'fruit', 수박: 'fruit',
  멜론: 'fruit', 참외: 'fruit', 단감: 'fruit', 홍시: 'fruit', 곶감: 'fruit', 블루베리: 'fruit', 라즈베리: 'fruit',
  블랙베리: 'fruit', 크랜베리: 'fruit', 한라봉: 'fruit', 천혜향: 'fruit', 레드향: 'fruit', 살구: 'fruit',
  석류: 'fruit', 건대추: 'fruit', 무화과: 'fruit', 파파야: 'fruit', 용과: 'fruit', 패션후르츠: 'fruit',
  리치: 'fruit', 람부탄: 'fruit', 오디: 'fruit', 산딸기: 'fruit', 신비복숭아: 'fruit', 거봉: 'fruit', 망고: 'fruit',
  // 곡류·면
  쌀: 'grain', 현미: 'grain', 밥: 'grain', 현미밥: 'grain', 잡곡: 'grain', 보리: 'grain', 귀리: 'grain',
  오트밀: 'grain', 파스타: 'grain', 스파게티: 'grain', 국수: 'grain', 소면: 'grain', 우동면: 'grain',
  칼국수면: 'grain', 라면: 'grain', 당면: 'grain', 쌀국수: 'grain', 메밀국수: 'grain', 떡: 'grain',
  떡국떡: 'grain', 시리얼: 'grain', 밀가루: 'grain', 부침가루: 'grain', 튀김가루: 'grain', 빵가루: 'grain',
  // 두부·콩류
  두부: 'tofu_bean', 순두부: 'tofu_bean', 연두부: 'tofu_bean', 유부: 'tofu_bean', 두부면: 'tofu_bean',
  콩: 'tofu_bean', 검은콩: 'tofu_bean', 병아리콩: 'tofu_bean', 렌틸콩: 'tofu_bean', 강낭콩: 'tofu_bean',
  완두콩: 'tofu_bean', 낫또: 'tofu_bean', 두유: 'tofu_bean', 비지: 'tofu_bean',
  // 가공식품
  햄: 'processed', 소시지: 'processed', 베이컨: 'processed', 어묵: 'processed', 게맛살: 'processed',
  통조림: 'processed', 스팸: 'processed', 참치캔: 'processed', 꽁치캔: 'processed', 골뱅이: 'processed',
  옥수수콘: 'processed', 김: 'processed', 단무지: 'processed', 맛김: 'processed', 김자반: 'processed', 비엔나: 'processed',
  // 양념·소스
  고추장: 'sauce', 된장: 'sauce', 간장: 'sauce', 케첩: 'sauce', 마요네즈: 'sauce', 참기름: 'sauce',
  식용유: 'sauce', 올리브유: 'sauce', 소금: 'sauce', 후추: 'sauce', 설탕: 'sauce', 굴소스: 'sauce', 식초: 'sauce',
  카레가루: 'sauce', 쌈장: 'sauce', 고춧가루: 'sauce', 다진마늘: 'sauce', 물엿: 'sauce', 올리고당: 'sauce',
  맛술: 'sauce', 액젓: 'sauce', 멸치액젓: 'sauce', 토마토소스: 'sauce', 파스타소스: 'sauce', 돈가스소스: 'sauce',
  머스타드: 'sauce', 스리라차: 'sauce', 발사믹식초: 'sauce', 들기름: 'sauce', 두반장: 'sauce', 칠리소스: 'sauce',
  데리야끼소스: 'sauce', 꿀: 'sauce', 잼: 'sauce', 땅콩버터: 'sauce',
  // 견과·간식
  아몬드: 'nuts_snack', 과자: 'nuts_snack', 초콜릿: 'nuts_snack', 호두: 'nuts_snack', 캐슈넛: 'nuts_snack',
  피스타치오: 'nuts_snack', 마카다미아: 'nuts_snack', 땅콩: 'nuts_snack', 잣: 'nuts_snack', 해바라기씨: 'nuts_snack',
  호박씨: 'nuts_snack', 건포도: 'nuts_snack', 견과믹스: 'nuts_snack', 젤리: 'nuts_snack', 사탕: 'nuts_snack',
  쿠키: 'nuts_snack', 크래커: 'nuts_snack', 팝콘: 'nuts_snack', 감자칩: 'nuts_snack', 약과: 'nuts_snack',
  // 빵·베이커리
  식빵: 'bakery', 베이글: 'bakery', 크루아상: 'bakery', 모닝빵: 'bakery', 바게트: 'bakery', 단팥빵: 'bakery',
  소보로빵: 'bakery', 카스텔라: 'bakery', 머핀: 'bakery', 도넛: 'bakery', 케이크: 'bakery', 호밀빵: 'bakery',
  통밀빵: 'bakery', 번: 'bakery', 또띠아: 'bakery', 와플: 'bakery', 스콘: 'bakery',
  // 냉동식품
  냉동만두: 'frozen', 냉동피자: 'frozen', 냉동볶음밥: 'frozen', 냉동치킨: 'frozen', 냉동돈까스: 'frozen',
  냉동핫도그: 'frozen', 냉동너겟: 'frozen', 냉동감자: 'frozen', 냉동야채: 'frozen', 군만두: 'frozen',
  물만두: 'frozen', 냉동떡갈비: 'frozen', 냉동붕어빵: 'frozen', 냉동호떡: 'frozen', 아이스크림: 'frozen',
  // 밀키트·간편식
  밀키트: 'mealkit', 즉석식품: 'mealkit', 도시락: 'mealkit', 즉석밥: 'mealkit', 컵라면: 'mealkit',
  컵밥: 'mealkit', 레토르트카레: 'mealkit', '3분요리': 'mealkit', 죽: 'mealkit', 즉석국: 'mealkit',
  삼각김밥: 'mealkit', 김밥: 'mealkit', 샌드위치: 'mealkit', 즉석짜장: 'mealkit', 냉면: 'mealkit',
  // 음료
  주스: 'drink', 탄산음료: 'drink', 생수: 'drink', 콜라: 'drink', 사이다: 'drink', 이온음료: 'drink',
  보리차: 'drink', 녹차: 'drink', 커피: 'drink', 탄산수: 'drink', 식혜: 'drink', 매실차: 'drink',
  유자차: 'drink', 에너지드링크: 'drink', 아메리카노: 'drink', 홍차: 'drink',
};

// 기존 9분류 → 세분화 카테고리 폴백 (이름 매핑에 없을 때).
const COARSE_TO_FINE: Record<string, string> = {
  protein: 'meat', veg: 'veg', fruit: 'fruit', grain: 'grain', dairy: 'egg_dairy',
  sauce: 'sauce', processed: 'processed', drink: 'drink', etc: 'etc',
};

export function fineCategoryOf(name: string, category?: string): string {
  return FINE_BY_NAME[name] ?? (category ? COARSE_TO_FINE[category] : undefined) ?? 'etc';
}

// 세분화 카테고리 → 소속 식재료 목록 (재료 추가 화면: 카테고리 선택 → 식재료 선택).
export const FINE_CATEGORY_ITEMS: Record<string, string[]> = (() => {
  const m: Record<string, string[]> = {};
  for (const [name, code] of Object.entries(FINE_BY_NAME)) (m[code] ??= []).push(name);
  return m;
})();

// 세분화 → 기존 9분류 (직접 입력 식재료 저장 시 타일 색 등에 사용).
const FINE_TO_COARSE: Record<string, CategoryCode> = {
  meat: 'protein', seafood: 'protein', egg_dairy: 'dairy', veg: 'veg', fruit: 'fruit',
  grain: 'grain', tofu_bean: 'protein', processed: 'processed', sauce: 'sauce',
  nuts_snack: 'etc', bakery: 'grain', frozen: 'processed', mealkit: 'processed', drink: 'drink', etc: 'etc',
};
export function coarseFromFine(code: string): CategoryCode {
  return (FINE_TO_COARSE[code] ?? 'etc') as CategoryCode;
}

// ── 수량 단위 (재료별로 그람/갯수/퍼센트 자동 구분) ──────────────────────────
export type QtyUnit = 'count' | 'gram' | 'percent';

// 세분류 기본 단위
const UNIT_BY_FINE: Record<string, QtyUnit> = {
  meat: 'gram', seafood: 'gram',
  egg_dairy: 'percent', veg: 'count', fruit: 'count', grain: 'percent',
  tofu_bean: 'count', processed: 'count', sauce: 'percent', nuts_snack: 'percent',
  bakery: 'count', frozen: 'count', mealkit: 'count', drink: 'percent', etc: 'percent',
};
// 개별 재료 예외 (세분류 기본과 다른 경우)
const UNIT_BY_NAME: Record<string, QtyUnit> = {
  계란: 'count', 두부: 'count', 라면: 'count', 식빵: 'count',
  김치: 'percent', 우유: 'percent', 치즈: 'percent', 버터: 'percent', 요거트: 'percent', 그릭요거트: 'percent',
  두유: 'count',
  아몬드: 'gram', 콩: 'gram', 콩나물: 'gram',
};

// 단위 결정: 알려진 재료명이 우선, 없으면 (직접 입력한 커스텀명 대비) 선택한 세분류 기준.
export function unitOf(name: string, fineCat?: string): QtyUnit {
  return UNIT_BY_NAME[name] ?? UNIT_BY_FINE[fineCat ?? fineCategoryOf(name)] ?? 'percent';
}

export const UNIT_SUFFIX: Record<QtyUnit, string> = { count: '개', gram: 'g', percent: '%' };

// 단위/수량 → 내부 잔량 레벨(정렬·장보기 로직용). 등록 단계라 '없음'은 만들지 않는다.
export function stockFromQty(unit: QtyUnit, amount: number): StockLevel {
  if (unit === 'percent') return amount >= 75 ? 'enough' : amount >= 50 ? 'low' : 'very_low';
  if (unit === 'count') return amount >= 3 ? 'enough' : amount >= 2 ? 'low' : 'very_low';
  return amount >= 300 ? 'enough' : amount >= 100 ? 'low' : 'very_low'; // gram
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
  // ── 확장 레시피 (94종) ──
  'bibimbap': '🍚', 'soy-egg-rice': '🍚', 'spam-fried-rice': '🍚', 'bacon-fried-rice': '🍚',
  'shrimp-fried-rice': '🍤', 'bulgogi-rice': '🍚', 'pork-rice-bowl': '🍚', 'chicken-mayo-rice': '🍚',
  'tuna-mayo-rice': '🍚', 'curry-rice': '🍛', 'omurice': '🍳', 'tofu-rice-bowl': '🍚',
  'mushroom-rice': '🍚', 'egg-fried-rice': '🍚', 'soft-tofu-stew': '🍲', 'beef-radish-soup': '🍲',
  'egg-drop-soup': '🍲', 'mushroom-soup': '🍲', 'potato-soup': '🍲', 'fish-cake-soup': '🍲',
  'army-stew': '🍲', 'yukgaejang': '🍲', 'rice-cake-soup': '🍲', 'napa-doenjang-soup': '🍲',
  'kimchi-soup': '🍲', 'spicy-pork-stew': '🍲', 'chicken-soup': '🍲', 'spinach-soup': '🍲',
  'stir-fried-pork': '🍖', 'dak-galbi': '🍗', 'squid-stir-fry': '🦑', 'fish-cake-stir-fry': '🍢',
  'sausage-stir-fry': '🌭', 'spam-kimchi-stir-fry': '🥫', 'mushroom-stir-fry': '🍄', 'zucchini-stir-fry': '🥒',
  'potato-stir-fry': '🥔', 'anchovy-stir-fry': '🐟', 'bean-sprout-stir-fry': '🌱', 'bacon-cabbage-stir-fry': '🥬',
  'eggplant-stir-fry': '🍆', 'broccoli-stir-fry': '🥦', 'japchae': '🍜', 'beef-mushroom-stir-fry': '🍖',
  'shrimp-garlic-stir-fry': '🍤', 'grilled-mackerel': '🐟', 'braised-mackerel': '🐟', 'grilled-salmon': '🐟',
  'braised-tofu': '🍲', 'braised-potato': '🥔', 'braised-quail-egg': '🥚', 'braised-beef': '🍖',
  'grilled-pork-belly': '🥓', 'jjimdak': '🍗', 'grilled-chicken-thigh': '🍗', 'grilled-cutlassfish': '🐟',
  'braised-cutlassfish': '🐟', 'teriyaki-chicken': '🍗', 'pork-bulgogi': '🍖', 'kimchi-pancake': '🥞',
  'green-onion-pancake': '🥞', 'zucchini-pancake': '🥞', 'potato-pancake': '🥞', 'tofu-pan-fry': '🍳',
  'egg-pancake': '🍳', 'ham-pancake': '🥞', 'seafood-pancake': '🥞', 'meatball-pancake': '🥞',
  'perilla-pancake': '🥞', 'pumpkin-pancake': '🥞', 'seasoned-spinach': '🥗', 'seasoned-bean-sprout': '🥗',
  'seasoned-cucumber': '🥗', 'seasoned-chive': '🥗', 'seasoned-radish': '🥗', 'cucumber-pickle': '🥒',
  'green-onion-salad': '🥗', 'egg-soy-braise': '🥚', 'seasoned-cabbage': '🥗', 'kalguksu': '🍜',
  'janchi-noodle': '🍜', 'bibim-noodle': '🍜', 'kimchi-noodle': '🍜', 'udon': '🍜',
  'tomato-spaghetti': '🍝', 'cream-pasta': '🍝', 'aglio-olio': '🍝', 'stir-fried-udon': '🍜',
  'egg-ramen': '🍜', 'tteokbokki': '🌶️', 'rabokki': '🌶️', 'gimbap': '🍙',
  'cheese-toast': '🍞', 'chicken-salad': '🥗',
};

export function recipeEmojiFor(id: string): string {
  return RECIPE_EMOJI[id] ?? '🍲';
}
