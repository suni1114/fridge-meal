// In-memory app store (demo). A real build would back this with SQLite/Drift
// per the spec (§11), but for the 시안 we keep state in React so every screen
// reacts to the same fridge / shopping data.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CategoryCode, StockLevel, baseName, fineCategoryOf } from './constants';
import { loadJSON, saveJSON, STORAGE_KEYS } from './persist';
import { daysUntil, todayISO } from './date';
import { uid, nowISO } from './id';
import { parseReceipt } from '../ai/receiptParser';
import recipesData from './recipes.json'; // 식품안전나라 공공 레시피(1145) 번들

// ---- types ---------------------------------------------------------------
export interface FridgeItem {
  id: string;
  name: string;
  category: CategoryCode;
  storage: string; // refrigerated | frozen | room_temp | sauce | etc
  stock: StockLevel;
  qty?: string; // 표시용 수량 (예: "2개", "300g", "75%"). 내부 정렬/장보기는 stock 사용.
  expiry: string | null; // 소비기한 절대 날짜 'YYYY-MM-DD'; null = 미입력. D-day는 매번 계산.
  added?: string; // 등록일 'YYYY-MM-DD' (냉장고에 넣은 날). 기본 오늘.
  memo?: string;
  updatedAt?: string; // 마지막 변경 시각(ISO) — 동기화 충돌 해결용.
}

// 공공 레시피(식품안전나라) 모델 — recipes.json 구조와 일치.
export interface RecipeStep {
  text: string;
  img?: string; // 단계별 사진 URL (https)
}
export interface RecipeNutri {
  kcal: number | null;
  carb: number | null;
  protein: number | null;
  fat: number | null;
  sodium: number | null;
}
export interface Recipe {
  id: string;
  title: string;
  category: string; // 요리종류: 반찬/국·찌개/밥/후식 ...
  method: string; // 조리방법: 찌기/끓이기/볶기 ...
  image?: string; // 완성 사진 URL
  parts: string; // 재료 원문(수량 포함)
  steps: RecipeStep[];
  nutri: RecipeNutri;
  tip?: string; // 나트륨 저감 등 팁
}

export type ShoppingSource = 'manual' | 'low_stock' | 'recipe_missing' | 'expired' | 'near_expiry';
export type ShoppingKind = 'food' | 'household'; // 식재료 / 생활용품 탭 구분
export interface ShoppingItem {
  id: string;
  name: string;
  category?: CategoryCode;
  source: ShoppingSource;
  kind?: ShoppingKind; // 없으면 'food'(식재료)로 본다.
  note?: string;
  checked: boolean;
  addedToFridge: boolean;
  updatedAt?: string; // 마지막 변경 시각(ISO) — 동기화 충돌 해결용.
}

// ---- ingredient knowledge (name → category / storage) --------------------
type Info = { category: CategoryCode; storage: string };
export const INGREDIENT_INFO: Record<string, Info> = {
  계란: { category: 'protein', storage: 'refrigerated' },
  두부: { category: 'protein', storage: 'refrigerated' },
  닭가슴살: { category: 'protein', storage: 'refrigerated' },
  돼지고기: { category: 'protein', storage: 'refrigerated' },
  소고기: { category: 'protein', storage: 'refrigerated' },
  닭고기: { category: 'protein', storage: 'refrigerated' },
  대파: { category: 'veg', storage: 'refrigerated' },
  양파: { category: 'veg', storage: 'room_temp' },
  마늘: { category: 'veg', storage: 'refrigerated' },
  감자: { category: 'veg', storage: 'room_temp' },
  당근: { category: 'veg', storage: 'refrigerated' },
  애호박: { category: 'veg', storage: 'refrigerated' },
  브로콜리: { category: 'veg', storage: 'refrigerated' },
  양상추: { category: 'veg', storage: 'refrigerated' },
  오이: { category: 'veg', storage: 'refrigerated' },
  양배추: { category: 'veg', storage: 'refrigerated' },
  버섯: { category: 'veg', storage: 'refrigerated' },
  콩나물: { category: 'veg', storage: 'refrigerated' },
  방울토마토: { category: 'veg', storage: 'refrigerated' },
  토마토: { category: 'veg', storage: 'refrigerated' },
  고구마: { category: 'veg', storage: 'room_temp' },
  김치: { category: 'veg', storage: 'refrigerated' },
  밥: { category: 'grain', storage: 'refrigerated' },
  현미밥: { category: 'grain', storage: 'refrigerated' },
  라면: { category: 'grain', storage: 'room_temp' },
  식빵: { category: 'grain', storage: 'room_temp' },
  냉동만두: { category: 'processed', storage: 'frozen' },
  냉동새우: { category: 'protein', storage: 'frozen' },
  아이스크림: { category: 'dairy', storage: 'frozen' },
  스팸: { category: 'processed', storage: 'room_temp' },
  참치캔: { category: 'processed', storage: 'room_temp' },
  김: { category: 'processed', storage: 'room_temp' },
  고추장: { category: 'sauce', storage: 'sauce' },
  된장: { category: 'sauce', storage: 'sauce' },
  간장: { category: 'sauce', storage: 'sauce' },
  참기름: { category: 'sauce', storage: 'sauce' },
  식용유: { category: 'sauce', storage: 'sauce' },
  치즈: { category: 'dairy', storage: 'refrigerated' },
  우유: { category: 'dairy', storage: 'refrigerated' },
  요거트: { category: 'dairy', storage: 'refrigerated' },
  그릭요거트: { category: 'dairy', storage: 'refrigerated' },
  두유: { category: 'drink', storage: 'refrigerated' },
  사과: { category: 'fruit', storage: 'room_temp' },
  바나나: { category: 'fruit', storage: 'room_temp' },
  아몬드: { category: 'etc', storage: 'room_temp' },
  // 요리 애호가형 — 추가 식재료 · 양념 · 향신료
  고추: { category: 'veg', storage: 'refrigerated' },
  스파게티: { category: 'grain', storage: 'room_temp' },
  버터: { category: 'dairy', storage: 'refrigerated' },
  올리브유: { category: 'sauce', storage: 'sauce' },
  소금: { category: 'sauce', storage: 'sauce' },
  후추: { category: 'sauce', storage: 'sauce' },
  설탕: { category: 'sauce', storage: 'sauce' },
  굴소스: { category: 'sauce', storage: 'refrigerated' },
  식초: { category: 'sauce', storage: 'sauce' },
  케첩: { category: 'sauce', storage: 'refrigerated' },
  마요네즈: { category: 'sauce', storage: 'refrigerated' },
  카레가루: { category: 'sauce', storage: 'room_temp' },
};

export function infoFor(name: string): Info {
  return INGREDIENT_INFO[name] ?? INGREDIENT_INFO[baseName(name)] ?? { category: 'etc', storage: 'refrigerated' };
}

// 같은 이름이 이미 냉장고에 있으면 "우유" → "우유2" → "우유3" 처럼 다음 번호를 붙여
// 중복 없이 구분되는 이름을 만든다. (조금 남은 재료를 또 샀을 때 따로 보이게)
export function uniqueFridgeName(name: string, items: FridgeItem[]): string {
  const taken = new Set(items.map((x) => x.name));
  if (!taken.has(name)) return name;
  let n = 2;
  while (taken.has(`${name}${n}`)) n++;
  return `${name}${n}`;
}

// ---- preset packs (spec §10) ---------------------------------------------
export interface PresetPack {
  code: string;
  label: string;
  desc: string;
  icon: 'cooking-pot' | 'user' | 'house-line' | 'leaf' | 'flame';
  items: string[];
}
export const PRESET_PACKS: PresetPack[] = [
  {
    code: 'home_basic',
    label: '집밥 기본형',
    desc: '기본 반찬과 찌개를 자주 먹어요.',
    icon: 'cooking-pot',
    items: ['계란', '두부', '대파', '양파', '마늘', '김치', '밥', '고추장', '된장', '간장', '참기름', '식용유', '감자', '당근', '애호박', '돼지고기', '참치캔'],
  },
  {
    code: 'single_simple',
    label: '간단 자취형',
    desc: '간단하게 데워 먹거나 볶아 먹어요.',
    icon: 'user',
    items: ['계란', '밥', '라면', '김치', '참치캔', '스팸', '냉동만두', '대파', '양파', '식용유', '간장', '고추장', '치즈', '우유', '식빵'],
  },
  {
    code: 'kids_family',
    label: '아이 있는 집',
    desc: '아이 반찬과 가족 식사를 자주 준비해요.',
    icon: 'house-line',
    items: ['계란', '우유', '치즈', '두부', '소고기', '닭고기', '당근', '감자', '양파', '애호박', '브로콜리', '김', '밥', '간장', '참기름', '사과', '바나나', '요거트'],
  },
  {
    code: 'diet_health',
    label: '다이어트 · 건강식',
    desc: '단백질과 채소 위주로 먹어요.',
    icon: 'leaf',
    items: ['닭가슴살', '계란', '두부', '양상추', '오이', '방울토마토', '브로콜리', '고구마', '현미밥', '그릭요거트', '아몬드', '참치캔', '두유', '양배추', '버섯'],
  },
  {
    code: 'cooking_lover',
    label: '요리 애호가형',
    desc: '직접 요리를 즐겨, 양념·향신료가 다양해요.',
    icon: 'flame',
    items: [
      '계란', '돼지고기', '소고기', '닭고기', '닭가슴살', '두부', '냉동새우',
      '대파', '양파', '마늘', '감자', '당근', '애호박', '브로콜리', '버섯', '양배추', '토마토', '오이', '고추', '콩나물',
      '밥', '현미밥', '라면', '식빵', '스파게티',
      '우유', '치즈', '그릭요거트', '버터',
      '고추장', '된장', '간장', '참기름', '식용유', '올리브유', '소금', '후추', '설탕', '굴소스', '식초', '케첩', '마요네즈', '카레가루',
      '참치캔', '스팸', '김',
    ],
  },
];

// ---- seed recipes (subset for the demo) ----------------------------------
export const RECIPES: Recipe[] = recipesData as unknown as Recipe[];

// ---- initial state -------------------------------------------------------
// 실사용 앱: 신규 사용자는 빈 냉장고에서 시작하고, 온보딩(QuickSetup)에서 채운다.
// 저장된 데이터가 있으면 AppProvider 복원 단계에서 이 기본값을 덮어쓴다.
const INITIAL_FRIDGE: FridgeItem[] = [];
const INITIAL_SHOPPING: ShoppingItem[] = [];

// ---- selectors (rule-based matching, spec §13) ---------------------------
export interface RecipeMatch {
  recipe: Recipe;
  haveCount: number;
  missing: string[]; // 부족한 필수 재료명
  usesNearExpiry: boolean;
  score: number;
}

// 레시피 재료원문(parts)을 항목으로 분해 — 아는/모르는 재료 모두 포함(아는 것만 보면 부족 재료가 누락돼 오탐).
const recipeItemsCache = new Map<string, string[]>();
const SECTION_WORDS = ['양념', '고명', '육수', '소스', '재료', '주재료', '부재료', '양념장', '데코', '장식', '곁들임', '밑국물'];
// 양념·조미료·국물거리 — 집에 있다고 보고 '부족'에서 제외.
const PANTRY_WORDS = [
  '소금', '설탕', '황설탕', '흑설탕', '간장', '진간장', '국간장', '양조간장', '된장', '고추장', '쌈장', '춘장',
  '참기름', '들기름', '식용유', '올리브유', '포도씨유', '카놀라유', '후추', '후춧가루', '통후추', '참깨', '들깨', '깨소금',
  '식초', '물엿', '올리고당', '조청', '꿀', '맛술', '미림', '청주', '케첩', '케찹', '마요네즈', '머스타드', '굴소스',
  '액젓', '멸치액젓', '새우젓', '고춧가루', '전분', '녹말', '밀가루', '부침가루', '튀김가루', '빵가루', '매실액', '매실청',
  '다시마', '건다시마', '멸치', '국멸치', '카레가루', '조림소스', '데리야끼소스', '두반장', '참치액', '다시다', '베이킹파우더',
];
function cleanItemName(chunk: string): string {
  let s = chunk.split('(')[0]; // 괄호 수량 제거
  s = s.replace(/\d.*$/, ''); // 첫 숫자(수량/단위) 이후 제거
  return s.replace(/\s+/g, '').trim();
}
function recipeItems(recipe: Recipe): string[] {
  let v = recipeItemsCache.get(recipe.id);
  if (v) return v;
  const titleKey = recipe.title.replace(/\s+/g, '');
  const names = (recipe.parts || '')
    .replace(/\n/g, ',')
    .split(',')
    .map(cleanItemName)
    .filter((n) => n.length >= 2 && n !== titleKey && !SECTION_WORDS.includes(n));
  v = Array.from(new Set(names));
  recipeItemsCache.set(recipe.id, v);
  return v;
}
const isPantry = (item: string) =>
  item === '물' || PANTRY_WORDS.some((w) => item === w || item.endsWith(w)) || fineCategoryOf(item) === 'sauce';

export function matchRecipe(recipe: Recipe, fridge: FridgeItem[]): RecipeMatch {
  const fnames = fridge.filter((x) => x.stock !== 'empty').map((x) => baseName(x.name));
  const nearNames = fridge
    .filter((x) => { const d = daysUntil(x.expiry); return d != null && d <= 2; })
    .map((x) => baseName(x.name));
  // 레시피 재료명 ↔ 냉장고 재료명 양방향 부분일치(예: '다진돼지고기' ↔ '돼지고기').
  const hit = (item: string, pool: string[]) =>
    pool.some((fn) => fn.length >= 2 && (item.includes(fn) || fn.includes(item)));
  let have = 0;
  const missing: string[] = [];
  let usesNear = false;
  for (const item of recipeItems(recipe)) {
    if (isPantry(item)) continue; // 양념·조미료는 보유 가정
    if (hit(item, fnames)) {
      have++;
      if (hit(item, nearNames)) usesNear = true;
    } else {
      missing.push(item);
    }
  }
  const score = have * 10 - missing.length * 8 + (usesNear ? 25 : 0);
  return { recipe, haveCount: have, missing, usesNearExpiry: usesNear, score };
}

export function matchAll(fridge: FridgeItem[]): RecipeMatch[] {
  return RECIPES.map((r) => matchRecipe(r, fridge)).sort((a, b) => b.score - a.score);
}

// ---- context -------------------------------------------------------------
// 식재료 등록 1건 = 사용 로그 1건. 기간별 '자주 쓰는 식재료' 집계에 쓴다.
export interface UsageEntry {
  id?: string; // 이벤트 고유 ID — 동기화 시 append-only 로그의 중복 제거용.
  name: string;
  category: CategoryCode;
  date: string; // 등록일 ISO
}

interface AppState {
  fridge: FridgeItem[];
  shopping: ShoppingItem[];
  usageLog: UsageEntry[];
  logUsage: (entries: { name: string; category: CategoryCode; date?: string }[]) => void;
  setFridge: React.Dispatch<React.SetStateAction<FridgeItem[]>>;
  updateStock: (id: string, stock: StockLevel) => void;
  removeFridge: (id: string) => void;
  upsertFridge: (item: FridgeItem) => void;
  addToShopping: (name: string, source: ShoppingSource, note?: string, kind?: ShoppingKind) => void;
  toggleShoppingChecked: (id: string) => void;
  markAddedToFridge: (id: string, storage: string, stock: StockLevel, expiry: string | null) => void;
  markShoppingDone: (id: string) => void;
  renameShopping: (id: string, name: string) => void;
  removeShopping: (id: string) => void;
  clearCheckedShopping: (kind?: ShoppingKind) => void;
  resetAll: () => void; // 데이터 초기화 — 냉장고/장보기 전부 비운다.
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [fridge, setFridge] = useState<FridgeItem[]>(INITIAL_FRIDGE);
  const [shopping, setShopping] = useState<ShoppingItem[]>(INITIAL_SHOPPING);
  const [usageLog, setUsageLog] = useState<UsageEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // 앱 시작 시 저장된 냉장고/장보기/사용로그를 한 번 복원한다.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [savedFridge, savedShopping, savedUsage] = await Promise.all([
        loadJSON<FridgeItem[]>(STORAGE_KEYS.fridge),
        loadJSON<ShoppingItem[]>(STORAGE_KEYS.shopping),
        loadJSON<UsageEntry[]>(STORAGE_KEYS.usage),
      ]);
      if (!alive) return;
      if (savedFridge) setFridge(savedFridge);
      if (savedShopping) setShopping(savedShopping);
      // 사용 로그가 없으면(최초) 현재 냉장고 재료의 등록일로 시드한다 — 적재 시작점을 만든다.
      if (savedUsage) setUsageLog(savedUsage);
      else setUsageLog((savedFridge ?? INITIAL_FRIDGE).map((f) => ({ id: uid(), name: f.name, category: f.category, date: f.added ?? todayISO() })));
      setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 복원 이후의 모든 변경을 폰 저장소에 반영한다.
  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.fridge, fridge);
  }, [fridge, hydrated]);
  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.shopping, shopping);
  }, [shopping, hydrated]);
  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.usage, usageLog);
  }, [usageLog, hydrated]);

  // 소비기한이 지났거나(D+) 1일 이내로 임박한(D-1·D-day) 냉장고 재료를
  // 장보기 '자동 추천'에 자동으로 올린다. (이미 미구매 목록에 있으면 건너뜀)
  useEffect(() => {
    if (!hydrated) return;
    setShopping((prev) => {
      let next = prev;
      const hasUnchecked = (name: string) => next.some((x) => x.name === name && !x.checked);
      fridge.forEach((f) => {
        const d = daysUntil(f.expiry);
        if (d == null || d > 1) return; // 미입력이거나 2일 이상 남으면 제외
        if (hasUnchecked(f.name)) return;
        const source: ShoppingSource = d < 0 ? 'expired' : 'near_expiry';
        const note = d < 0 ? '소비기한이 지났어요' : d === 0 ? '오늘까지예요' : '소비기한 D-1';
        next = [...next, { id: uid(), name: f.name, category: f.category, source, note, checked: false, addedToFridge: false, updatedAt: nowISO() }];
      });
      return next === prev ? prev : next;
    });
  }, [fridge, hydrated]);

  const value = useMemo<AppState>(
    () => ({
      fridge,
      shopping,
      usageLog,
      // 사용 로그 적재(직접 setFridge로 추가하는 경로용 — 빠른 세팅 등).
      logUsage: (entries) =>
        setUsageLog((u) => [...u, ...entries.map((e) => ({ id: uid(), name: e.name, category: e.category, date: e.date ?? todayISO() }))]),
      setFridge,
      updateStock: (id, stock) => setFridge((p) => p.map((x) => (x.id === id ? { ...x, stock, updatedAt: nowISO() } : x))),
      removeFridge: (id) => setFridge((p) => p.filter((x) => x.id !== id)),
      upsertFridge: (item) => {
        // 새 id면 등록 → 사용 로그 적재. 기존 id 수정이면 적재하지 않는다.
        const isNew = !fridge.some((x) => x.id === item.id);
        // 새로 들어오는 항목인데 같은 이름이 이미 있으면 "우유2"처럼 번호를 붙여 따로 보이게.
        const name = isNew ? uniqueFridgeName(item.name, fridge) : item.name;
        const stamped = { ...item, name, updatedAt: nowISO() }; // 모든 쓰기에 변경 시각 기록
        setFridge((p) => (p.some((x) => x.id === item.id) ? p.map((x) => (x.id === item.id ? stamped : x)) : [...p, stamped]));
        if (isNew) setUsageLog((u) => [...u, { id: uid(), name, category: item.category, date: item.added ?? todayISO() }]);
      },
      // 같은 이름이 이미 목록에 있어도 출처가 다르면(예: 자동추천에 떠 있는 걸 직접 추가) 담는다.
      // 냉장고에 있어 자동추천에 뜬 재료라도 "또 사기"가 가능하도록. kind(식재료/생활용품)도 구분.
      addToShopping: (name, source, note, kind = 'food') =>
        setShopping((p) =>
          p.some((x) => x.name === name && !x.checked && x.source === source && (x.kind ?? 'food') === kind)
            ? p
            : [...p, { id: uid(), name, category: infoFor(name).category as CategoryCode, source, kind, note, checked: false, addedToFridge: false, updatedAt: nowISO() }]
        ),
      toggleShoppingChecked: (id) => setShopping((p) => p.map((x) => (x.id === id ? { ...x, checked: !x.checked, updatedAt: nowISO() } : x))),
      markAddedToFridge: (id, storage, stock, expiry) => {
        const it = shopping.find((x) => x.id === id);
        if (it) {
          const category = it.category ?? 'etc';
          setFridge((pf) => [...pf, { id: uid(), name: it.name, category, storage, stock, expiry, added: todayISO(), updatedAt: nowISO() }]);
          setUsageLog((u) => [...u, { id: uid(), name: it.name, category, date: todayISO() }]);
        }
        setShopping((prev) => prev.map((x) => (x.id === id ? { ...x, addedToFridge: true, checked: true, updatedAt: nowISO() } : x)));
      },
      // 식재료 등록 폼으로 냉장고에 넣은 경우 — 냉장고 항목은 폼이 생성하므로 장보기 항목만 완료 처리.
      markShoppingDone: (id) =>
        setShopping((prev) => prev.map((x) => (x.id === id ? { ...x, addedToFridge: true, checked: true, updatedAt: nowISO() } : x))),
      renameShopping: (id, name) =>
        setShopping((p) => p.map((x) => (x.id === id ? { ...x, name: name.trim() || x.name, updatedAt: nowISO() } : x))),
      removeShopping: (id) => setShopping((p) => p.filter((x) => x.id !== id)),
      // 구매 완료(체크된) 항목 일괄 삭제. kind를 주면 해당 탭(식재료/생활용품)만. 냉장고 재료는 그대로.
      clearCheckedShopping: (kind) =>
        setShopping((p) => p.filter((x) => !(x.checked && (kind ? (x.kind ?? 'food') === kind : true)))),
      // 데이터 초기화 — 냉장고/장보기/사용로그를 모두 비운다(빈 배열도 hydrated 이후 저장소에 반영됨).
      resetAll: () => { setFridge([]); setShopping([]); setUsageLog([]); },
    }),
    [fridge, shopping, usageLog]
  );

  // 복원 전에는 렌더하지 않아 초기 데이터로 저장본을 덮어쓰는 일을 막는다.
  if (!hydrated) return null;

  return React.createElement(Ctx.Provider, { value }, children);
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}
