// In-memory app store (demo). A real build would back this with SQLite/Drift
// per the spec (§11), but for the 시안 we keep state in React so every screen
// reacts to the same fridge / shopping data.
import React, { createContext, useContext, useMemo, useState } from 'react';
import { CategoryCode, StockLevel } from './constants';

// ---- types ---------------------------------------------------------------
export interface FridgeItem {
  id: string;
  name: string;
  category: CategoryCode;
  storage: string; // refrigerated | frozen | room_temp | sauce | etc
  stock: StockLevel;
  dday: number | null; // days to expiry (1 → D-1); null = 미입력
  memo?: string;
}

export interface RecipeReq {
  name: string;
  isRequired: boolean;
}
export interface Recipe {
  id: string;
  title: string;
  cookTime: number; // minutes
  difficulty: '쉬움' | '보통' | '어려움';
  reason: string;
  required: RecipeReq[];
  steps: string[];
}

export type ShoppingSource = 'manual' | 'low_stock' | 'recipe_missing' | 'expired';
export interface ShoppingItem {
  id: string;
  name: string;
  category?: CategoryCode;
  source: ShoppingSource;
  note?: string;
  checked: boolean;
  addedToFridge: boolean;
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
};

export function infoFor(name: string): Info {
  return INGREDIENT_INFO[name] ?? { category: 'etc', storage: 'refrigerated' };
}

// ---- preset packs (spec §10) ---------------------------------------------
export interface PresetPack {
  code: string;
  label: string;
  desc: string;
  icon: 'cooking-pot' | 'user' | 'house-line' | 'leaf';
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
];

// ---- seed recipes (subset for the demo) ----------------------------------
export const RECIPES: Recipe[] = [
  {
    id: 'kimchi-fried-rice',
    title: '김치볶음밥',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '냉장고에 있는 김치와 밥을 바로 활용할 수 있어요.',
    required: [
      { name: '김치', isRequired: true },
      { name: '밥', isRequired: true },
      { name: '계란', isRequired: true },
      { name: '대파', isRequired: true },
      { name: '참기름', isRequired: false },
    ],
    steps: ['대파를 잘게 썰어요.', '팬에 기름을 두르고 대파를 볶아요.', '김치와 밥을 넣고 볶아요.', '계란을 올려 마무리해요.'],
  },
  {
    id: 'tofu-kimchi',
    title: '두부김치',
    cookTime: 10,
    difficulty: '쉬움',
    reason: '임박한 두부를 김치와 함께 빠르게 소진할 수 있어요.',
    required: [
      { name: '두부', isRequired: true },
      { name: '김치', isRequired: true },
      { name: '대파', isRequired: true },
      { name: '참기름', isRequired: false },
    ],
    steps: ['두부를 데치거나 부쳐요.', '김치를 볶아요.', '데친 두부와 함께 담아내요.'],
  },
  {
    id: 'egg-roll',
    title: '계란말이',
    cookTime: 10,
    difficulty: '쉬움',
    reason: '계란과 채소로 간단하게 만들 수 있어요.',
    required: [
      { name: '계란', isRequired: true },
      { name: '대파', isRequired: true },
      { name: '당근', isRequired: false },
    ],
    steps: ['계란을 풀고 채소를 잘게 썰어 섞어요.', '약불에서 부쳐 돌돌 말아요.', '한 김 식혀 썰어내요.'],
  },
  {
    id: 'kimchi-stew',
    title: '김치찌개',
    cookTime: 25,
    difficulty: '보통',
    reason: '돼지고기만 더하면 든든한 한 끼가 돼요.',
    required: [
      { name: '김치', isRequired: true },
      { name: '돼지고기', isRequired: true },
      { name: '두부', isRequired: true },
      { name: '대파', isRequired: true },
    ],
    steps: ['돼지고기를 볶아요.', '김치를 넣고 함께 볶아요.', '물을 붓고 끓여요.', '두부와 대파를 넣어 마무리해요.'],
  },
  {
    id: 'doenjang-stew',
    title: '된장찌개',
    cookTime: 20,
    difficulty: '보통',
    reason: '있는 두부와 된장에 애호박·버섯만 더하면 돼요.',
    required: [
      { name: '된장', isRequired: true },
      { name: '두부', isRequired: true },
      { name: '애호박', isRequired: true },
      { name: '버섯', isRequired: true },
      { name: '대파', isRequired: false },
    ],
    steps: ['물에 된장을 풀어요.', '애호박과 버섯을 넣고 끓여요.', '두부와 대파를 넣어 마무리해요.'],
  },
  {
    id: 'bean-sprout-soup',
    title: '콩나물국',
    cookTime: 10,
    difficulty: '쉬움',
    reason: '임박한 콩나물을 시원하게 소진할 수 있어요.',
    required: [
      { name: '콩나물', isRequired: true },
      { name: '대파', isRequired: true },
      { name: '마늘', isRequired: false },
    ],
    steps: ['물에 콩나물을 넣고 끓여요.', '마늘과 대파를 넣어요.', '소금으로 간을 맞춰요.'],
  },
];

// ---- initial state -------------------------------------------------------
const f = (id: string, name: string, stock: StockLevel, dday: number | null): FridgeItem => {
  const i = infoFor(name);
  return { id, name, category: i.category, storage: i.storage, stock, dday };
};

const INITIAL_FRIDGE: FridgeItem[] = [
  f('두부', '두부', 'low', 1),
  f('우유', '우유', 'low', 1),
  f('대파', '대파', 'low', 2),
  f('콩나물', '콩나물', 'low', 2),
  f('당근', '당근', 'enough', 5),
  f('계란', '계란', 'enough', 9),
  f('김치', '김치', 'enough', 30),
  f('냉동만두', '냉동만두', 'enough', null),
  f('냉동새우', '냉동새우', 'enough', 20),
  f('아이스크림', '아이스크림', 'low', 7),
  f('밥', '밥', 'enough', null),
  f('양파', '양파', 'enough', null),
  f('마늘', '마늘', 'enough', null),
  f('감자', '감자', 'enough', null),
  f('고추장', '고추장', 'enough', null),
  f('된장', '된장', 'enough', null),
  f('간장', '간장', 'enough', null),
  f('참기름', '참기름', 'enough', null),
  f('식용유', '식용유', 'enough', null),
  f('참치캔', '참치캔', 'enough', null),
];

const INITIAL_SHOPPING: ShoppingItem[] = [
  { id: 's1', name: '돼지고기', category: 'protein', source: 'recipe_missing', note: '김치찌개에 필요해요', checked: false, addedToFridge: false },
  { id: 's2', name: '애호박', category: 'veg', source: 'recipe_missing', note: '된장찌개에 필요해요', checked: false, addedToFridge: false },
  { id: 's3', name: '버섯', category: 'veg', source: 'recipe_missing', note: '된장찌개에 필요해요', checked: false, addedToFridge: false },
  { id: 's4', name: '우유', category: 'dairy', source: 'manual', checked: false, addedToFridge: false },
  { id: 's5', name: '식빵', category: 'grain', source: 'manual', checked: false, addedToFridge: false },
];

// ---- selectors (rule-based matching, spec §13) ---------------------------
export interface RecipeMatch {
  recipe: Recipe;
  haveCount: number;
  missing: string[]; // 부족한 필수 재료명
  usesNearExpiry: boolean;
  score: number;
}

export function matchRecipe(recipe: Recipe, fridge: FridgeItem[]): RecipeMatch {
  const names = new Set(fridge.filter((x) => x.stock !== 'empty').map((x) => x.name));
  const nearNames = new Set(fridge.filter((x) => x.dday != null && x.dday <= 2).map((x) => x.name));
  let have = 0;
  const missing: string[] = [];
  let usesNear = false;
  for (const r of recipe.required) {
    if (names.has(r.name)) {
      have++;
      if (nearNames.has(r.name)) usesNear = true;
    } else if (r.isRequired) {
      missing.push(r.name);
    }
  }
  const timePenalty = recipe.cookTime <= 10 ? 0 : recipe.cookTime <= 20 ? -3 : recipe.cookTime <= 30 ? -5 : -10;
  const score = have * 10 - missing.length * 15 + (usesNear ? 20 : 0) + timePenalty;
  return { recipe, haveCount: have, missing, usesNearExpiry: usesNear, score };
}

export function matchAll(fridge: FridgeItem[]): RecipeMatch[] {
  return RECIPES.map((r) => matchRecipe(r, fridge)).sort((a, b) => b.score - a.score);
}

// ---- context -------------------------------------------------------------
interface AppState {
  fridge: FridgeItem[];
  shopping: ShoppingItem[];
  setFridge: React.Dispatch<React.SetStateAction<FridgeItem[]>>;
  updateStock: (id: string, stock: StockLevel) => void;
  removeFridge: (id: string) => void;
  upsertFridge: (item: FridgeItem) => void;
  addToShopping: (name: string, source: ShoppingSource, note?: string) => void;
  toggleShoppingChecked: (id: string) => void;
  markAddedToFridge: (id: string, storage: string, stock: StockLevel, dday: number | null) => void;
  removeShopping: (id: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [fridge, setFridge] = useState<FridgeItem[]>(INITIAL_FRIDGE);
  const [shopping, setShopping] = useState<ShoppingItem[]>(INITIAL_SHOPPING);

  const value = useMemo<AppState>(
    () => ({
      fridge,
      shopping,
      setFridge,
      updateStock: (id, stock) => setFridge((p) => p.map((x) => (x.id === id ? { ...x, stock } : x))),
      removeFridge: (id) => setFridge((p) => p.filter((x) => x.id !== id)),
      upsertFridge: (item) =>
        setFridge((p) => (p.some((x) => x.id === item.id) ? p.map((x) => (x.id === item.id ? item : x)) : [...p, item])),
      addToShopping: (name, source, note) =>
        setShopping((p) =>
          p.some((x) => x.name === name && !x.checked)
            ? p
            : [...p, { id: `sh-${name}-${p.length}`, name, category: infoFor(name).category as CategoryCode, source, note, checked: false, addedToFridge: false }]
        ),
      toggleShoppingChecked: (id) => setShopping((p) => p.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x))),
      markAddedToFridge: (id, storage, stock, dday) => {
        setShopping((prev) => {
          const it = prev.find((x) => x.id === id);
          if (it) {
            setFridge((pf) => [
              ...pf,
              { id: `fr-${it.name}-${pf.length}`, name: it.name, category: it.category ?? 'etc', storage, stock, dday },
            ]);
          }
          return prev.map((x) => (x.id === id ? { ...x, addedToFridge: true, checked: true } : x));
        });
      },
      removeShopping: (id) => setShopping((p) => p.filter((x) => x.id !== id)),
    }),
    [fridge, shopping]
  );

  return React.createElement(Ctx.Provider, { value }, children);
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}
