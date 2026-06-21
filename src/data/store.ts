// In-memory app store (demo). A real build would back this with SQLite/Drift
// per the spec (§11), but for the 시안 we keep state in React so every screen
// reacts to the same fridge / shopping data.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CategoryCode, StockLevel } from './constants';
import { loadJSON, saveJSON, STORAGE_KEYS } from './persist';
import { daysUntil, todayISO } from './date';

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
  return INGREDIENT_INFO[name] ?? { category: 'etc', storage: 'refrigerated' };
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
  {
    id: 'bibimbap',
    title: '비빔밥',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '남은 나물과 밥만 있으면 든든하게 비벼 먹어요.',
    required: [
      { name: '밥', isRequired: true },
      { name: '계란', isRequired: true },
      { name: '시금치', isRequired: false },
      { name: '당근', isRequired: false },
      { name: '고추장', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['나물과 당근을 볶아 준비해요.', '계란프라이를 부쳐요.', '밥 위에 올리고 고추장과 참기름으로 비벼요.'],
  },
  {
    id: 'soy-egg-rice',
    title: '간장계란밥',
    cookTime: 5,
    difficulty: '쉬움',
    reason: '계란과 밥만 있으면 1분 만에 한 끼 완성돼요.',
    required: [
      { name: '밥', isRequired: true },
      { name: '계란', isRequired: true },
      { name: '간장', isRequired: false },
      { name: '참기름', isRequired: false },
      { name: '깨', isRequired: false },
    ],
    steps: ['계란프라이를 반숙으로 부쳐요.', '따뜻한 밥에 계란을 올려요.', '간장과 참기름을 둘러 비벼요.'],
  },
  {
    id: 'spam-fried-rice',
    title: '스팸볶음밥',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '스팸과 밥만 있으면 아이도 좋아하는 볶음밥이에요.',
    required: [
      { name: '스팸', isRequired: true },
      { name: '밥', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '계란', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['스팸을 깍둑썰어 볶아요.', '대파와 밥을 넣고 볶아요.', '간장으로 간하고 계란을 올려요.'],
  },
  {
    id: 'bacon-fried-rice',
    title: '베이컨볶음밥',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '베이컨의 짭짤한 기름으로 감칠맛 나게 볶아요.',
    required: [
      { name: '베이컨', isRequired: true },
      { name: '밥', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '후추', isRequired: false },
    ],
    steps: ['베이컨을 잘라 바삭하게 볶아요.', '양파를 넣고 볶다 밥을 넣어요.', '간장과 후추로 마무리해요.'],
  },
  {
    id: 'shrimp-fried-rice',
    title: '새우볶음밥',
    cookTime: 15,
    difficulty: '보통',
    reason: '냉동새우만 있으면 고소한 새우볶음밥이 돼요.',
    required: [
      { name: '냉동새우', isRequired: true },
      { name: '밥', isRequired: true },
      { name: '계란', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '굴소스', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['새우를 식용유에 볶아요.', '계란과 대파, 밥을 넣고 볶아요.', '굴소스로 간을 맞춰요.'],
  },
  {
    id: 'bulgogi-rice',
    title: '불고기덮밥',
    cookTime: 20,
    difficulty: '보통',
    reason: '소고기와 양파로 달콤짭짤하게 덮밥을 즐겨요.',
    required: [
      { name: '소고기', isRequired: true },
      { name: '양파', isRequired: true },
      { name: '밥', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['소고기를 양념에 재워요.', '양파와 함께 볶아요.', '밥 위에 올려 덮밥으로 즐겨요.'],
  },
  {
    id: 'pork-rice-bowl',
    title: '돼지고기덮밥',
    cookTime: 20,
    difficulty: '보통',
    reason: '돼지고기와 양파로 푸짐한 덮밥을 만들어요.',
    required: [
      { name: '돼지고기', isRequired: true },
      { name: '양파', isRequired: true },
      { name: '밥', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '고추장', isRequired: false },
      { name: '설탕', isRequired: false },
    ],
    steps: ['돼지고기를 양념에 볶아요.', '양파를 넣어 함께 익혀요.', '밥 위에 올려 덮밥으로 완성해요.'],
  },
  {
    id: 'chicken-mayo-rice',
    title: '닭마요덮밥',
    cookTime: 20,
    difficulty: '보통',
    reason: '닭가슴살과 마요네즈로 고소하게 즐기는 덮밥이에요.',
    required: [
      { name: '닭가슴살', isRequired: true },
      { name: '계란', isRequired: true },
      { name: '밥', isRequired: false },
      { name: '마요네즈', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '설탕', isRequired: false },
    ],
    steps: ['닭가슴살을 구워 간장양념을 입혀요.', '계란을 스크램블로 익혀요.', '밥에 올리고 마요네즈를 뿌려요.'],
  },
  {
    id: 'tuna-mayo-rice',
    title: '참치마요덮밥',
    cookTime: 10,
    difficulty: '쉬움',
    reason: '참치캔과 마요네즈만 있으면 빠르게 완성돼요.',
    required: [
      { name: '참치캔', isRequired: true },
      { name: '밥', isRequired: true },
      { name: '계란', isRequired: false },
      { name: '마요네즈', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '김가루', isRequired: false },
    ],
    steps: ['참치 기름을 빼고 마요네즈와 섞어요.', '계란프라이를 부쳐요.', '밥에 참치마요와 계란을 올려요.'],
  },
  {
    id: 'curry-rice',
    title: '카레라이스',
    cookTime: 30,
    difficulty: '쉬움',
    reason: '감자와 카레가루로 온 가족이 좋아하는 한 끼예요.',
    required: [
      { name: '카레가루', isRequired: true },
      { name: '감자', isRequired: true },
      { name: '당근', isRequired: false },
      { name: '양파', isRequired: false },
      { name: '돼지고기', isRequired: false },
      { name: '밥', isRequired: false },
    ],
    steps: ['감자, 당근, 양파를 깍둑썰어요.', '고기와 채소를 볶다 물을 부어 끓여요.', '카레가루를 풀어 농도를 맞춰 밥에 부어요.'],
  },
  {
    id: 'omurice',
    title: '오므라이스',
    cookTime: 25,
    difficulty: '보통',
    reason: '계란으로 밥을 감싼 추억의 경양식이에요.',
    required: [
      { name: '계란', isRequired: true },
      { name: '밥', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '햄', isRequired: false },
      { name: '케첩', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['양파와 햄을 볶다 밥과 케첩을 넣어 볶아요.', '계란을 풀어 얇게 부쳐요.', '볶음밥을 올리고 계란으로 감싸요.'],
  },
  {
    id: 'tofu-rice-bowl',
    title: '두부덮밥',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '두부를 매콤하게 볶아 밥에 올리면 든든해요.',
    required: [
      { name: '두부', isRequired: true },
      { name: '밥', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '고추장', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['두부를 깍둑썰어 노릇하게 구워요.', '양파와 양념을 넣어 볶아요.', '밥 위에 올려 참기름을 둘러요.'],
  },
  {
    id: 'mushroom-rice',
    title: '버섯밥',
    cookTime: 30,
    difficulty: '보통',
    reason: '버섯 향이 가득한 건강한 영양밥이에요.',
    required: [
      { name: '표고버섯', isRequired: true },
      { name: '쌀', isRequired: true },
      { name: '느타리버섯', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '참기름', isRequired: false },
      { name: '대파', isRequired: false },
    ],
    steps: ['버섯을 채썰어요.', '쌀 위에 버섯을 올려 밥을 지어요.', '간장과 참기름으로 양념장을 만들어 비벼요.'],
  },
  {
    id: 'egg-fried-rice',
    title: '계란볶음밥',
    cookTime: 10,
    difficulty: '쉬움',
    reason: '계란과 밥만 있으면 누구나 만드는 기본 볶음밥이에요.',
    required: [
      { name: '계란', isRequired: true },
      { name: '밥', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '식용유', isRequired: false },
      { name: '깨', isRequired: false },
    ],
    steps: ['대파를 식용유에 볶아 파기름을 내요.', '계란을 풀어 볶다 밥을 넣어요.', '간장으로 간하고 깨를 뿌려요.'],
  },
  {
    id: 'soft-tofu-stew',
    title: '순두부찌개',
    cookTime: 20,
    difficulty: '보통',
    reason: '순두부로 얼큰하게 끓여 밥과 잘 어울려요.',
    required: [
      { name: '순두부', isRequired: true },
      { name: '계란', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '고춧가루', isRequired: false },
      { name: '다진마늘', isRequired: false },
      { name: '국간장', isRequired: false },
    ],
    steps: ['고춧가루로 양념기름을 내요.', '물을 붓고 순두부를 넣어 끓여요.', '계란을 깨뜨려 넣고 대파를 올려요.'],
  },
  {
    id: 'beef-radish-soup',
    title: '소고기무국',
    cookTime: 30,
    difficulty: '쉬움',
    reason: '소고기와 무로 시원하고 깔끔한 국물을 내요.',
    required: [
      { name: '소고기', isRequired: true },
      { name: '무', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '국간장', isRequired: false },
      { name: '다진마늘', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['소고기와 무를 참기름에 볶아요.', '물을 붓고 푹 끓여요.', '국간장으로 간하고 대파를 넣어요.'],
  },
  {
    id: 'egg-drop-soup',
    title: '계란국',
    cookTime: 10,
    difficulty: '쉬움',
    reason: '계란만 있으면 부드러운 국물을 빠르게 완성해요.',
    required: [
      { name: '계란', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '국간장', isRequired: false },
      { name: '소금', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['물을 끓여 국간장으로 간해요.', '계란을 풀어 천천히 둘러요.', '대파와 참기름을 넣어 마무리해요.'],
  },
  {
    id: 'mushroom-soup',
    title: '버섯국',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '느타리버섯으로 담백하고 시원한 국을 끓여요.',
    required: [
      { name: '느타리버섯', isRequired: true },
      { name: '팽이버섯', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '국간장', isRequired: false },
      { name: '다진마늘', isRequired: false },
    ],
    steps: ['버섯을 손으로 찢어요.', '물을 끓여 버섯을 넣어요.', '국간장과 마늘로 간하고 대파를 올려요.'],
  },
  {
    id: 'potato-soup',
    title: '감자국',
    cookTime: 25,
    difficulty: '쉬움',
    reason: '감자와 양파로 구수하고 든든한 국이에요.',
    required: [
      { name: '감자', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '국간장', isRequired: false },
      { name: '다진마늘', isRequired: false },
    ],
    steps: ['감자를 나박썰어요.', '물에 감자와 양파를 넣어 끓여요.', '국간장으로 간하고 대파를 넣어요.'],
  },
  {
    id: 'fish-cake-soup',
    title: '어묵탕',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '어묵과 무로 따끈한 국물을 즐기는 겨울 별미예요.',
    required: [
      { name: '어묵', isRequired: true },
      { name: '무', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '멸치', isRequired: false },
      { name: '국간장', isRequired: false },
    ],
    steps: ['멸치와 무로 육수를 내요.', '어묵을 꼬치에 끼워 넣어요.', '국간장으로 간하고 대파를 올려요.'],
  },
  {
    id: 'army-stew',
    title: '부대찌개',
    cookTime: 30,
    difficulty: '보통',
    reason: '햄과 소시지, 김치로 푸짐하게 끓이는 별미예요.',
    required: [
      { name: '햄', isRequired: true },
      { name: '소시지', isRequired: true },
      { name: '김치', isRequired: false },
      { name: '두부', isRequired: false },
      { name: '라면', isRequired: false },
      { name: '고춧가루', isRequired: false },
    ],
    steps: ['햄, 소시지, 김치, 두부를 보기좋게 담아요.', '육수를 붓고 고춧가루 양념을 올려요.', '끓으면 라면사리를 넣어 먹어요.'],
  },
  {
    id: 'yukgaejang',
    title: '육개장',
    cookTime: 60,
    difficulty: '어려움',
    reason: '소고기와 대파로 얼큰하게 끓이는 보양 국이에요.',
    required: [
      { name: '소고기', isRequired: true },
      { name: '대파', isRequired: true },
      { name: '숙주', isRequired: false },
      { name: '고춧가루', isRequired: false },
      { name: '다진마늘', isRequired: false },
      { name: '국간장', isRequired: false },
    ],
    steps: ['소고기를 삶아 결대로 찢어요.', '대파와 숙주를 넣고 고춧가루 양념을 풀어요.', '푹 끓여 국간장으로 간을 맞춰요.'],
  },
  {
    id: 'rice-cake-soup',
    title: '떡국',
    cookTime: 25,
    difficulty: '쉬움',
    reason: '떡국떡과 계란으로 설날 분위기를 내는 한 그릇이에요.',
    required: [
      { name: '떡국떡', isRequired: true },
      { name: '계란', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '김가루', isRequired: false },
      { name: '국간장', isRequired: false },
    ],
    steps: ['떡을 찬물에 불려요.', '육수를 끓여 떡을 넣어요.', '계란지단과 김가루, 대파를 올려요.'],
  },
  {
    id: 'napa-doenjang-soup',
    title: '배추된장국',
    cookTime: 25,
    difficulty: '쉬움',
    reason: '배추와 된장으로 구수하게 끓이는 집밥 국이에요.',
    required: [
      { name: '배추', isRequired: true },
      { name: '된장', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '다진마늘', isRequired: false },
      { name: '국간장', isRequired: false },
    ],
    steps: ['배추를 먹기좋게 썰어요.', '물에 된장을 풀고 배추를 넣어요.', '푹 끓여 마늘과 대파로 마무리해요.'],
  },
  {
    id: 'kimchi-soup',
    title: '김칫국',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '익은 김치로 시원하고 칼칼하게 끓여요.',
    required: [
      { name: '김치', isRequired: true },
      { name: '두부', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '멸치', isRequired: false },
      { name: '국간장', isRequired: false },
    ],
    steps: ['멸치로 육수를 내요.', '김치를 넣고 끓여요.', '두부와 대파를 넣어 간을 맞춰요.'],
  },
  {
    id: 'spicy-pork-stew',
    title: '돼지고기고추장찌개',
    cookTime: 30,
    difficulty: '보통',
    reason: '돼지고기와 고추장으로 밥도둑 찌개를 끓여요.',
    required: [
      { name: '돼지고기', isRequired: true },
      { name: '고추장', isRequired: true },
      { name: '감자', isRequired: false },
      { name: '양파', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '고춧가루', isRequired: false },
    ],
    steps: ['돼지고기를 볶다 고추장을 넣어요.', '감자와 양파, 물을 넣어 끓여요.', '대파를 올려 칼칼하게 마무리해요.'],
  },
  {
    id: 'chicken-soup',
    title: '닭백숙',
    cookTime: 60,
    difficulty: '보통',
    reason: '닭고기와 마늘로 든든하게 끓이는 보양식이에요.',
    required: [
      { name: '닭고기', isRequired: true },
      { name: '마늘', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '생강', isRequired: false },
      { name: '소금', isRequired: false },
    ],
    steps: ['닭을 깨끗이 손질해요.', '마늘, 생강과 함께 푹 삶아요.', '소금에 찍어 대파와 함께 먹어요.'],
  },
  {
    id: 'spinach-soup',
    title: '시금치국',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '시금치와 된장으로 부드럽고 구수해요.',
    required: [
      { name: '시금치', isRequired: true },
      { name: '된장', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '다진마늘', isRequired: false },
      { name: '멸치', isRequired: false },
    ],
    steps: ['멸치육수를 내고 된장을 풀어요.', '시금치를 넣어 살짝 끓여요.', '마늘과 대파로 간을 맞춰요.'],
  },
  {
    id: 'stir-fried-pork',
    title: '제육볶음',
    cookTime: 25,
    difficulty: '보통',
    reason: '돼지고기를 매콤달콤하게 볶는 인기 반찬이에요.',
    required: [
      { name: '돼지고기', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '고추장', isRequired: false },
      { name: '고춧가루', isRequired: false },
      { name: '설탕', isRequired: false },
    ],
    steps: ['돼지고기를 고추장 양념에 재워요.', '센 불에 양파와 함께 볶아요.', '대파를 넣어 마무리해요.'],
  },
  {
    id: 'dak-galbi',
    title: '닭갈비',
    cookTime: 30,
    difficulty: '보통',
    reason: '닭다리살과 양배추로 푸짐하게 볶아 먹어요.',
    required: [
      { name: '닭다리살', isRequired: true },
      { name: '양배추', isRequired: false },
      { name: '고구마', isRequired: false },
      { name: '고추장', isRequired: false },
      { name: '고춧가루', isRequired: false },
      { name: '떡', isRequired: false },
    ],
    steps: ['닭다리살을 고추장 양념에 재워요.', '양배추, 고구마, 떡과 함께 볶아요.', '닭이 익을 때까지 골고루 볶아요.'],
  },
  {
    id: 'squid-stir-fry',
    title: '오징어볶음',
    cookTime: 25,
    difficulty: '보통',
    reason: '오징어와 채소를 매콤하게 볶는 밥반찬이에요.',
    required: [
      { name: '오징어', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '고추장', isRequired: false },
      { name: '고춧가루', isRequired: false },
      { name: '설탕', isRequired: false },
    ],
    steps: ['오징어를 손질해 칼집을 넣어 썰어요.', '양파와 함께 센 불에 볶아요.', '고추장 양념을 넣어 빠르게 볶아요.'],
  },
  {
    id: 'fish-cake-stir-fry',
    title: '어묵볶음',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '어묵으로 만드는 도시락 단골 반찬이에요.',
    required: [
      { name: '어묵', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '물엿', isRequired: false },
      { name: '식용유', isRequired: false },
      { name: '깨', isRequired: false },
    ],
    steps: ['어묵을 먹기좋게 썰어요.', '양파와 함께 볶아요.', '간장과 물엿으로 간하고 깨를 뿌려요.'],
  },
  {
    id: 'sausage-stir-fry',
    title: '소시지야채볶음',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '소시지와 채소로 아이도 좋아하는 반찬이에요.',
    required: [
      { name: '소시지', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '파프리카', isRequired: false },
      { name: '케첩', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['소시지에 칼집을 내고 채소를 썰어요.', '식용유에 함께 볶아요.', '케첩으로 간하고 윤기나게 볶아요.'],
  },
  {
    id: 'spam-kimchi-stir-fry',
    title: '스팸김치볶음',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '스팸과 김치로 짭짤하게 볶는 밥도둑이에요.',
    required: [
      { name: '스팸', isRequired: true },
      { name: '김치', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['스팸을 도톰하게 썰어요.', '김치와 함께 볶아요.', '설탕과 참기름으로 마무리해요.'],
  },
  {
    id: 'mushroom-stir-fry',
    title: '버섯볶음',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '버섯을 간단히 볶아 향긋한 밑반찬을 만들어요.',
    required: [
      { name: '느타리버섯', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['버섯을 찢고 양파를 썰어요.', '팬에 함께 볶아요.', '간장과 참기름으로 간해요.'],
  },
  {
    id: 'zucchini-stir-fry',
    title: '애호박볶음',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '애호박을 새우젓 없이 담백하게 볶아요.',
    required: [
      { name: '애호박', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '다진마늘', isRequired: false },
      { name: '소금', isRequired: false },
      { name: '깨', isRequired: false },
    ],
    steps: ['애호박을 반달썰어요.', '소금에 살짝 절였다 볶아요.', '마늘과 깨로 마무리해요.'],
  },
  {
    id: 'potato-stir-fry',
    title: '감자볶음',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '감자만 있으면 만드는 기본 밑반찬이에요.',
    required: [
      { name: '감자', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '당근', isRequired: false },
      { name: '소금', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['감자를 채썰어 찬물에 헹궈요.', '식용유에 양파와 함께 볶아요.', '소금으로 간을 맞춰요.'],
  },
  {
    id: 'anchovy-stir-fry',
    title: '멸치볶음',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '멸치로 만드는 밑반찬으로 오래 두고 먹어요.',
    required: [
      { name: '멸치', isRequired: true },
      { name: '간장', isRequired: false },
      { name: '물엿', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '식용유', isRequired: false },
      { name: '깨', isRequired: false },
    ],
    steps: ['멸치를 기름 없이 볶아 비린내를 날려요.', '간장과 물엿 양념을 넣어요.', '물엿으로 윤기내고 깨를 뿌려요.'],
  },
  {
    id: 'bean-sprout-stir-fry',
    title: '콩나물볶음',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '콩나물을 아삭하게 볶는 부담 없는 반찬이에요.',
    required: [
      { name: '콩나물', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '고춧가루', isRequired: false },
      { name: '소금', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['콩나물을 씻어 물기를 빼요.', '팬에 콩나물을 넣고 볶아요.', '고춧가루와 참기름으로 무치듯 마무리해요.'],
  },
  {
    id: 'bacon-cabbage-stir-fry',
    title: '베이컨양배추볶음',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '베이컨과 양배추로 간단하고 든든해요.',
    required: [
      { name: '베이컨', isRequired: true },
      { name: '양배추', isRequired: true },
      { name: '마늘', isRequired: false },
      { name: '소금', isRequired: false },
      { name: '후추', isRequired: false },
    ],
    steps: ['베이컨과 양배추를 썰어요.', '마늘과 베이컨을 볶다 양배추를 넣어요.', '소금과 후추로 간해요.'],
  },
  {
    id: 'eggplant-stir-fry',
    title: '가지볶음',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '가지를 부드럽게 볶아 간장으로 간한 반찬이에요.',
    required: [
      { name: '가지', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '다진마늘', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['가지를 길게 썰어요.', '팬에 볶아 숨을 죽여요.', '간장과 마늘, 참기름으로 양념해요.'],
  },
  {
    id: 'broccoli-stir-fry',
    title: '브로콜리볶음',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '브로콜리를 마늘과 함께 볶아 건강하게 즐겨요.',
    required: [
      { name: '브로콜리', isRequired: true },
      { name: '마늘', isRequired: false },
      { name: '소금', isRequired: false },
      { name: '올리브유', isRequired: false },
      { name: '후추', isRequired: false },
    ],
    steps: ['브로콜리를 데쳐요.', '올리브유에 마늘을 볶아요.', '브로콜리를 넣고 소금후추로 간해요.'],
  },
  {
    id: 'japchae',
    title: '잡채',
    cookTime: 40,
    difficulty: '어려움',
    reason: '당면과 채소로 잔칫상에 빠지지 않는 요리예요.',
    required: [
      { name: '당면', isRequired: true },
      { name: '소고기', isRequired: false },
      { name: '시금치', isRequired: false },
      { name: '당근', isRequired: false },
      { name: '양파', isRequired: false },
      { name: '간장', isRequired: false },
    ],
    steps: ['당면을 삶아 간장양념에 무쳐요.', '고기와 채소를 각각 볶아요.', '모두 한데 섞어 깨와 참기름을 둘러요.'],
  },
  {
    id: 'beef-mushroom-stir-fry',
    title: '소고기버섯볶음',
    cookTime: 20,
    difficulty: '보통',
    reason: '소고기와 버섯을 간장으로 볶아 감칠맛이 좋아요.',
    required: [
      { name: '소고기', isRequired: true },
      { name: '표고버섯', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '굴소스', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['소고기를 밑간해 볶아요.', '버섯과 양파를 넣어 볶아요.', '간장과 굴소스로 간을 맞춰요.'],
  },
  {
    id: 'shrimp-garlic-stir-fry',
    title: '새우마늘볶음',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '새우와 마늘을 버터에 볶아 고소해요.',
    required: [
      { name: '새우', isRequired: true },
      { name: '마늘', isRequired: true },
      { name: '버터', isRequired: false },
      { name: '소금', isRequired: false },
      { name: '후추', isRequired: false },
    ],
    steps: ['새우를 손질해요.', '버터에 마늘을 볶아 향을 내요.', '새우를 넣고 소금후추로 볶아요.'],
  },
  {
    id: 'grilled-mackerel',
    title: '고등어구이',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '고등어를 노릇하게 구워 소금만으로 즐겨요.',
    required: [
      { name: '고등어', isRequired: true },
      { name: '소금', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['고등어에 소금을 뿌려 밑간해요.', '팬에 식용유를 두르고 구워요.', '껍질이 바삭해질 때까지 뒤집어 구워요.'],
  },
  {
    id: 'braised-mackerel',
    title: '고등어조림',
    cookTime: 35,
    difficulty: '보통',
    reason: '고등어와 무를 칼칼하게 조려 밥과 잘 맞아요.',
    required: [
      { name: '고등어', isRequired: true },
      { name: '무', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '고춧가루', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '다진마늘', isRequired: false },
    ],
    steps: ['무를 깔고 고등어를 올려요.', '양념장을 끼얹고 물을 부어 조려요.', '국물을 끼얹으며 졸여 대파를 올려요.'],
  },
  {
    id: 'grilled-salmon',
    title: '연어구이',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '연어를 버터에 구워 부드럽고 고소해요.',
    required: [
      { name: '연어', isRequired: true },
      { name: '버터', isRequired: false },
      { name: '소금', isRequired: false },
      { name: '후추', isRequired: false },
    ],
    steps: ['연어에 소금후추로 밑간해요.', '버터에 껍질부터 구워요.', '겉이 노릇해지면 뒤집어 익혀요.'],
  },
  {
    id: 'braised-tofu',
    title: '두부조림',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '두부를 간장양념에 조려 매콤짭짤해요.',
    required: [
      { name: '두부', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '고춧가루', isRequired: false },
      { name: '다진마늘', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['두부를 도톰하게 썰어 노릇하게 구워요.', '간장양념을 끼얹어요.', '물을 약간 넣고 조려 대파를 올려요.'],
  },
  {
    id: 'braised-potato',
    title: '감자조림',
    cookTime: 25,
    difficulty: '쉬움',
    reason: '감자를 간장에 조려 윤기나는 밑반찬이에요.',
    required: [
      { name: '감자', isRequired: true },
      { name: '간장', isRequired: false },
      { name: '물엿', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '깨', isRequired: false },
    ],
    steps: ['감자를 깍둑썰어요.', '간장과 물을 넣어 조려요.', '물엿으로 윤기내고 깨를 뿌려요.'],
  },
  {
    id: 'braised-quail-egg',
    title: '메추리알장조림',
    cookTime: 30,
    difficulty: '쉬움',
    reason: '메추리알을 간장에 조려 도시락 반찬으로 좋아요.',
    required: [
      { name: '메추리알', isRequired: true },
      { name: '간장', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '마늘', isRequired: false },
      { name: '청양고추', isRequired: false },
    ],
    steps: ['메추리알을 삶아 껍질을 까요.', '간장과 설탕, 물을 넣어 조려요.', '국물이 졸아들면 청양고추를 넣어요.'],
  },
  {
    id: 'braised-beef',
    title: '소고기장조림',
    cookTime: 50,
    difficulty: '보통',
    reason: '소고기를 결대로 찢어 짭짤하게 조린 반찬이에요.',
    required: [
      { name: '소고기', isRequired: true },
      { name: '간장', isRequired: false },
      { name: '마늘', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '청양고추', isRequired: false },
    ],
    steps: ['소고기를 삶아 결대로 찢어요.', '간장과 설탕, 마늘로 조려요.', '청양고추를 넣어 칼칼하게 마무리해요.'],
  },
  {
    id: 'grilled-pork-belly',
    title: '삼겹살구이',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '삼겹살을 노릇하게 구워 쌈장에 싸 먹어요.',
    required: [
      { name: '삼겹살', isRequired: true },
      { name: '마늘', isRequired: false },
      { name: '쌈장', isRequired: false },
      { name: '소금', isRequired: false },
    ],
    steps: ['삼겹살을 달군 팬에 올려요.', '겉이 노릇하게 양면을 구워요.', '마늘과 함께 쌈장에 싸 먹어요.'],
  },
  {
    id: 'jjimdak',
    title: '찜닭',
    cookTime: 45,
    difficulty: '보통',
    reason: '닭고기와 당면을 달콤짭짤하게 조린 인기 요리예요.',
    required: [
      { name: '닭고기', isRequired: true },
      { name: '당면', isRequired: true },
      { name: '감자', isRequired: false },
      { name: '당근', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '설탕', isRequired: false },
    ],
    steps: ['닭고기를 데쳐 잡내를 빼요.', '간장양념과 채소를 넣어 조려요.', '불린 당면을 넣어 마무리해요.'],
  },
  {
    id: 'grilled-chicken-thigh',
    title: '닭다리구이',
    cookTime: 30,
    difficulty: '보통',
    reason: '닭다리살을 간장양념에 구워 촉촉하고 짭짤해요.',
    required: [
      { name: '닭다리살', isRequired: true },
      { name: '간장', isRequired: false },
      { name: '마늘', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '후추', isRequired: false },
    ],
    steps: ['닭다리살을 간장양념에 재워요.', '팬에 껍질부터 노릇하게 구워요.', '양념을 발라가며 속까지 익혀요.'],
  },
  {
    id: 'grilled-cutlassfish',
    title: '갈치구이',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '갈치를 소금에 구워 담백하게 즐겨요.',
    required: [
      { name: '갈치', isRequired: true },
      { name: '소금', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['갈치에 칼집을 내고 소금을 뿌려요.', '식용유를 두른 팬에 구워요.', '양면이 바삭해지게 익혀요.'],
  },
  {
    id: 'braised-cutlassfish',
    title: '갈치조림',
    cookTime: 35,
    difficulty: '보통',
    reason: '갈치와 무를 매콤하게 조린 밥도둑이에요.',
    required: [
      { name: '갈치', isRequired: true },
      { name: '무', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '고춧가루', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '다진마늘', isRequired: false },
    ],
    steps: ['무를 깔고 갈치를 올려요.', '양념장과 물을 부어 조려요.', '국물을 끼얹으며 졸여 대파를 올려요.'],
  },
  {
    id: 'teriyaki-chicken',
    title: '데리야끼치킨',
    cookTime: 25,
    difficulty: '보통',
    reason: '닭다리살을 간장양념에 윤기나게 졸여요.',
    required: [
      { name: '닭다리살', isRequired: true },
      { name: '간장', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '맛술', isRequired: false },
      { name: '물엿', isRequired: false },
    ],
    steps: ['닭다리살을 노릇하게 구워요.', '간장, 설탕, 맛술 소스를 부어요.', '물엿으로 윤기나게 졸여요.'],
  },
  {
    id: 'pork-bulgogi',
    title: '돼지불고기',
    cookTime: 25,
    difficulty: '보통',
    reason: '돼지고기를 양념에 재워 달콤하게 볶아요.',
    required: [
      { name: '돼지고기', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '다진마늘', isRequired: false },
    ],
    steps: ['돼지고기를 간장양념에 재워요.', '양파와 함께 볶아요.', '대파를 넣어 마무리해요.'],
  },
  {
    id: 'kimchi-pancake',
    title: '김치전',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '익은 김치와 부침가루로 바삭하게 부쳐요.',
    required: [
      { name: '김치', isRequired: true },
      { name: '부침가루', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['김치를 잘게 썰어요.', '부침가루와 물을 넣어 반죽해요.', '식용유에 노릇하게 부쳐요.'],
  },
  {
    id: 'green-onion-pancake',
    title: '파전',
    cookTime: 20,
    difficulty: '보통',
    reason: '쪽파를 듬뿍 넣어 바삭하게 부친 전이에요.',
    required: [
      { name: '쪽파', isRequired: true },
      { name: '부침가루', isRequired: true },
      { name: '계란', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['쪽파를 팬 길이로 썰어요.', '부침가루 반죽에 쪽파를 깔아요.', '계란물을 올려 노릇하게 부쳐요.'],
  },
  {
    id: 'zucchini-pancake',
    title: '애호박전',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '애호박을 부침가루와 계란옷에 부쳐 부드러워요.',
    required: [
      { name: '애호박', isRequired: true },
      { name: '계란', isRequired: false },
      { name: '부침가루', isRequired: false },
      { name: '소금', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['애호박을 동그랗게 썰어 소금을 뿌려요.', '부침가루와 계란물을 입혀요.', '식용유에 노릇하게 부쳐요.'],
  },
  {
    id: 'potato-pancake',
    title: '감자전',
    cookTime: 25,
    difficulty: '보통',
    reason: '감자를 갈아 쫀득하게 부친 별미예요.',
    required: [
      { name: '감자', isRequired: true },
      { name: '소금', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['감자를 갈아 물기를 짜요.', '소금으로 간해 반죽해요.', '식용유에 노릇하게 부쳐요.'],
  },
  {
    id: 'tofu-pan-fry',
    title: '두부부침',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '두부를 노릇하게 부쳐 양념장에 찍어 먹어요.',
    required: [
      { name: '두부', isRequired: true },
      { name: '간장', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '고춧가루', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['두부를 도톰하게 썰어 물기를 닦아요.', '식용유에 노릇하게 부쳐요.', '간장양념장을 곁들여요.'],
  },
  {
    id: 'egg-pancake',
    title: '계란전',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '계란옷을 입혀 부드럽게 부친 반찬이에요.',
    required: [
      { name: '계란', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '당근', isRequired: false },
      { name: '소금', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['계란을 풀고 대파와 당근을 다져 넣어요.', '소금으로 간해요.', '식용유에 한 입 크기로 부쳐요.'],
  },
  {
    id: 'ham-pancake',
    title: '햄전',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '햄에 계란옷을 입혀 명절 분위기를 내요.',
    required: [
      { name: '햄', isRequired: true },
      { name: '계란', isRequired: true },
      { name: '밀가루', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['햄을 도톰하게 썰어요.', '밀가루와 계란물을 입혀요.', '식용유에 노릇하게 부쳐요.'],
  },
  {
    id: 'seafood-pancake',
    title: '해물파전',
    cookTime: 25,
    difficulty: '보통',
    reason: '오징어와 새우, 쪽파로 푸짐하게 부쳐요.',
    required: [
      { name: '오징어', isRequired: true },
      { name: '새우', isRequired: true },
      { name: '쪽파', isRequired: false },
      { name: '부침가루', isRequired: false },
      { name: '계란', isRequired: false },
    ],
    steps: ['해물을 잘게 썰어요.', '부침가루 반죽에 쪽파를 깔고 해물을 올려요.', '계란물을 둘러 양면을 노릇하게 부쳐요.'],
  },
  {
    id: 'meatball-pancake',
    title: '동그랑땡',
    cookTime: 30,
    difficulty: '보통',
    reason: '다짐육과 두부로 빚어 명절에 빠지지 않아요.',
    required: [
      { name: '돼지고기다짐육', isRequired: true },
      { name: '두부', isRequired: false },
      { name: '계란물', isRequired: false },
      { name: '당근', isRequired: false },
      { name: '밀가루', isRequired: false },
    ],
    steps: ['다짐육과 으깬 두부, 채소를 섞어 반죽해요.', '동그랗게 빚어 밀가루와 계란물을 입혀요.', '식용유에 노릇하게 부쳐요.'],
  },
  {
    id: 'perilla-pancake',
    title: '깻잎전',
    cookTime: 25,
    difficulty: '보통',
    reason: '깻잎에 고기소를 채워 향긋하게 부쳐요.',
    required: [
      { name: '깻잎', isRequired: true },
      { name: '돼지고기다짐육', isRequired: true },
      { name: '두부', isRequired: false },
      { name: '계란물', isRequired: false },
      { name: '밀가루', isRequired: false },
    ],
    steps: ['고기와 두부로 소를 만들어요.', '깻잎에 소를 넣어 반으로 접어요.', '밀가루와 계란물을 입혀 부쳐요.'],
  },
  {
    id: 'pumpkin-pancake',
    title: '단호박전',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '단호박을 부쳐 달큰하고 포근한 간식이에요.',
    required: [
      { name: '단호박', isRequired: true },
      { name: '부침가루', isRequired: false },
      { name: '계란', isRequired: false },
      { name: '식용유', isRequired: false },
    ],
    steps: ['단호박을 얇게 썰어 살짝 쪄요.', '부침가루와 계란물을 입혀요.', '식용유에 노릇하게 부쳐요.'],
  },
  {
    id: 'seasoned-spinach',
    title: '시금치나물',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '시금치를 데쳐 참기름에 무친 기본 나물이에요.',
    required: [
      { name: '시금치', isRequired: true },
      { name: '다진마늘', isRequired: false },
      { name: '국간장', isRequired: false },
      { name: '참기름', isRequired: false },
      { name: '깨', isRequired: false },
    ],
    steps: ['시금치를 끓는 물에 데쳐요.', '찬물에 헹궈 물기를 짜요.', '마늘, 국간장, 참기름으로 무쳐요.'],
  },
  {
    id: 'seasoned-bean-sprout',
    title: '콩나물무침',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '콩나물을 삶아 아삭하게 무친 밑반찬이에요.',
    required: [
      { name: '콩나물', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '다진마늘', isRequired: false },
      { name: '소금', isRequired: false },
      { name: '참기름', isRequired: false },
      { name: '깨', isRequired: false },
    ],
    steps: ['콩나물을 삶아 물기를 빼요.', '소금과 마늘로 간해요.', '참기름과 깨를 넣어 무쳐요.'],
  },
  {
    id: 'seasoned-cucumber',
    title: '오이무침',
    cookTime: 10,
    difficulty: '쉬움',
    reason: '오이를 새콤달콤 매콤하게 무친 반찬이에요.',
    required: [
      { name: '오이', isRequired: true },
      { name: '고춧가루', isRequired: false },
      { name: '식초', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '다진마늘', isRequired: false },
      { name: '깨', isRequired: false },
    ],
    steps: ['오이를 어슷하게 썰어요.', '고춧가루, 식초, 설탕으로 양념해요.', '마늘과 깨를 넣어 무쳐요.'],
  },
  {
    id: 'seasoned-chive',
    title: '부추무침',
    cookTime: 10,
    difficulty: '쉬움',
    reason: '부추를 매콤하게 무쳐 고기와 곁들이기 좋아요.',
    required: [
      { name: '부추', isRequired: true },
      { name: '고춧가루', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '식초', isRequired: false },
      { name: '깨', isRequired: false },
    ],
    steps: ['부추를 먹기좋게 썰어요.', '고춧가루, 간장, 식초로 양념해요.', '살살 버무려 깨를 뿌려요.'],
  },
  {
    id: 'seasoned-radish',
    title: '무생채',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '무를 채썰어 새콤달콤 매콤하게 무쳐요.',
    required: [
      { name: '무', isRequired: true },
      { name: '고춧가루', isRequired: false },
      { name: '식초', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '다진마늘', isRequired: false },
    ],
    steps: ['무를 가늘게 채썰어요.', '고춧가루로 색을 입혀요.', '식초, 설탕, 마늘로 무쳐요.'],
  },
  {
    id: 'cucumber-pickle',
    title: '오이피클',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '오이를 새콤하게 절여 느끼함을 잡아줘요.',
    required: [
      { name: '오이', isRequired: true },
      { name: '식초', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '소금', isRequired: false },
    ],
    steps: ['오이를 먹기좋게 썰어 통에 담아요.', '식초, 설탕, 소금, 물로 절임물을 끓여요.', '뜨거울 때 부어 식혀 보관해요.'],
  },
  {
    id: 'green-onion-salad',
    title: '파무침',
    cookTime: 10,
    difficulty: '쉬움',
    reason: '대파를 매콤하게 무쳐 고기와 환상궁합이에요.',
    required: [
      { name: '대파', isRequired: true },
      { name: '고춧가루', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '식초', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['대파를 가늘게 채썰어 찬물에 헹궈요.', '물기를 빼요.', '고춧가루 양념에 살살 무쳐요.'],
  },
  {
    id: 'egg-soy-braise',
    title: '계란장조림',
    cookTime: 25,
    difficulty: '쉬움',
    reason: '삶은 계란을 간장에 조려 짭짤한 밑반찬이에요.',
    required: [
      { name: '계란', isRequired: true },
      { name: '간장', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '청양고추', isRequired: false },
      { name: '마늘', isRequired: false },
    ],
    steps: ['계란을 삶아 껍질을 까요.', '간장과 설탕, 물을 넣어 조려요.', '청양고추를 넣어 칼칼하게 마무리해요.'],
  },
  {
    id: 'seasoned-cabbage',
    title: '양배추무침',
    cookTime: 10,
    difficulty: '쉬움',
    reason: '양배추를 새콤하게 무쳐 아삭하게 즐겨요.',
    required: [
      { name: '양배추', isRequired: true },
      { name: '고춧가루', isRequired: false },
      { name: '식초', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '깨', isRequired: false },
    ],
    steps: ['양배추를 채썰어요.', '고춧가루, 식초, 설탕으로 양념해요.', '버무려 깨를 뿌려요.'],
  },
  {
    id: 'kalguksu',
    title: '칼국수',
    cookTime: 30,
    difficulty: '보통',
    reason: '멸치육수에 칼국수면을 넣어 시원하고 든든해요.',
    required: [
      { name: '칼국수면', isRequired: true },
      { name: '멸치', isRequired: false },
      { name: '애호박', isRequired: false },
      { name: '감자', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '국간장', isRequired: false },
    ],
    steps: ['멸치로 육수를 우려요.', '애호박과 감자를 넣어 끓여요.', '칼국수면을 넣어 익히고 국간장으로 간해요.'],
  },
  {
    id: 'janchi-noodle',
    title: '잔치국수',
    cookTime: 25,
    difficulty: '쉬움',
    reason: '소면을 멸치육수에 말아 후루룩 먹기 좋아요.',
    required: [
      { name: '소면', isRequired: true },
      { name: '멸치', isRequired: false },
      { name: '계란', isRequired: false },
      { name: '애호박', isRequired: false },
      { name: '국간장', isRequired: false },
    ],
    steps: ['멸치육수를 내요.', '소면을 삶아 찬물에 헹궈요.', '면에 육수를 붓고 지단과 고명을 올려요.'],
  },
  {
    id: 'bibim-noodle',
    title: '비빔국수',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '소면을 고추장 양념에 새콤달콤 비벼요.',
    required: [
      { name: '소면', isRequired: true },
      { name: '오이', isRequired: false },
      { name: '고추장', isRequired: false },
      { name: '식초', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['소면을 삶아 찬물에 헹궈요.', '고추장, 식초, 설탕으로 양념장을 만들어요.', '면과 오이를 넣어 비벼요.'],
  },
  {
    id: 'kimchi-noodle',
    title: '김치말이국수',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '김치국물에 소면을 말아 시원하게 즐겨요.',
    required: [
      { name: '소면', isRequired: true },
      { name: '김치', isRequired: true },
      { name: '오이', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '김가루', isRequired: false },
    ],
    steps: ['김치를 잘게 썰어 김치국물과 물을 섞어요.', '소면을 삶아 찬물에 헹궈요.', '면에 김치국물을 붓고 오이와 김가루를 올려요.'],
  },
  {
    id: 'udon',
    title: '우동',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '우동면과 어묵으로 따끈하게 끓이는 간편식이에요.',
    required: [
      { name: '우동면', isRequired: true },
      { name: '어묵', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '간장', isRequired: false },
      { name: '계란', isRequired: false },
    ],
    steps: ['육수에 간장으로 간해요.', '어묵과 우동면을 넣어 끓여요.', '계란과 대파를 올려 마무리해요.'],
  },
  {
    id: 'tomato-spaghetti',
    title: '토마토스파게티',
    cookTime: 25,
    difficulty: '보통',
    reason: '토마토와 면으로 만드는 기본 파스타예요.',
    required: [
      { name: '스파게티', isRequired: true },
      { name: '토마토', isRequired: true },
      { name: '양파', isRequired: false },
      { name: '마늘', isRequired: false },
      { name: '올리브유', isRequired: false },
      { name: '소금', isRequired: false },
    ],
    steps: ['스파게티를 삶아요.', '올리브유에 마늘과 양파, 토마토를 볶아 소스를 만들어요.', '면을 넣어 소스와 버무려요.'],
  },
  {
    id: 'cream-pasta',
    title: '크림파스타',
    cookTime: 25,
    difficulty: '보통',
    reason: '우유와 베이컨으로 부드러운 크림파스타를 만들어요.',
    required: [
      { name: '스파게티', isRequired: true },
      { name: '베이컨', isRequired: true },
      { name: '우유', isRequired: false },
      { name: '양파', isRequired: false },
      { name: '치즈', isRequired: false },
    ],
    steps: ['스파게티를 삶아요.', '베이컨과 양파를 볶다 우유를 부어요.', '치즈를 녹여 면을 넣고 버무려요.'],
  },
  {
    id: 'aglio-olio',
    title: '알리오올리오',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '마늘과 올리브유만으로 향긋한 파스타를 즐겨요.',
    required: [
      { name: '스파게티', isRequired: true },
      { name: '마늘', isRequired: true },
      { name: '올리브유', isRequired: false },
      { name: '고추', isRequired: false },
      { name: '소금', isRequired: false },
    ],
    steps: ['스파게티를 삶아요.', '올리브유에 마늘과 고추를 천천히 볶아요.', '면과 면수를 넣어 유화시켜 버무려요.'],
  },
  {
    id: 'stir-fried-udon',
    title: '볶음우동',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '우동면과 채소를 굴소스에 볶아 든든해요.',
    required: [
      { name: '우동면', isRequired: true },
      { name: '양배추', isRequired: false },
      { name: '당근', isRequired: false },
      { name: '굴소스', isRequired: false },
      { name: '간장', isRequired: false },
    ],
    steps: ['우동면을 데쳐요.', '양배추와 당근을 볶아요.', '면과 굴소스를 넣어 볶아요.'],
  },
  {
    id: 'egg-ramen',
    title: '계란라면',
    cookTime: 10,
    difficulty: '쉬움',
    reason: '라면에 계란을 풀어 부드럽게 즐기는 야식이에요.',
    required: [
      { name: '라면', isRequired: true },
      { name: '계란', isRequired: true },
      { name: '대파', isRequired: false },
      { name: '청양고추', isRequired: false },
    ],
    steps: ['물을 끓여 면과 스프를 넣어요.', '계란을 풀어 넣어요.', '대파와 청양고추를 올려요.'],
  },
  {
    id: 'tteokbokki',
    title: '떡볶이',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '떡과 고추장으로 매콤달콤하게 즐기는 분식이에요.',
    required: [
      { name: '떡', isRequired: true },
      { name: '고추장', isRequired: true },
      { name: '어묵', isRequired: false },
      { name: '대파', isRequired: false },
      { name: '설탕', isRequired: false },
      { name: '고춧가루', isRequired: false },
    ],
    steps: ['떡을 물에 불려요.', '물에 고추장과 설탕 양념을 풀어 끓여요.', '떡과 어묵을 넣어 걸쭉하게 졸여요.'],
  },
  {
    id: 'rabokki',
    title: '라볶이',
    cookTime: 20,
    difficulty: '쉬움',
    reason: '떡볶이에 라면을 더해 더 든든하게 즐겨요.',
    required: [
      { name: '떡', isRequired: true },
      { name: '라면', isRequired: true },
      { name: '어묵', isRequired: false },
      { name: '고추장', isRequired: false },
      { name: '설탕', isRequired: false },
    ],
    steps: ['고추장 양념물을 끓여요.', '떡과 어묵을 넣어 끓여요.', '라면사리를 넣어 익혀요.'],
  },
  {
    id: 'gimbap',
    title: '김밥',
    cookTime: 30,
    difficulty: '보통',
    reason: '밥과 김에 좋아하는 재료를 말아 한 끼로 좋아요.',
    required: [
      { name: '밥', isRequired: true },
      { name: '김', isRequired: true },
      { name: '계란', isRequired: false },
      { name: '당근', isRequired: false },
      { name: '시금치', isRequired: false },
      { name: '참기름', isRequired: false },
    ],
    steps: ['밥에 참기름과 소금으로 간해요.', '계란지단, 당근, 시금치를 준비해요.', '김에 밥과 재료를 올려 말아 썰어요.'],
  },
  {
    id: 'cheese-toast',
    title: '치즈토스트',
    cookTime: 10,
    difficulty: '쉬움',
    reason: '식빵과 치즈, 계란으로 든든한 아침을 만들어요.',
    required: [
      { name: '식빵', isRequired: true },
      { name: '치즈', isRequired: true },
      { name: '계란', isRequired: false },
      { name: '버터', isRequired: false },
      { name: '양배추', isRequired: false },
    ],
    steps: ['버터에 식빵을 노릇하게 구워요.', '계란을 부치고 양배추를 볶아요.', '빵에 치즈와 재료를 올려 덮어요.'],
  },
  {
    id: 'chicken-salad',
    title: '닭가슴살샐러드',
    cookTime: 15,
    difficulty: '쉬움',
    reason: '닭가슴살과 채소로 가볍고 건강한 한 끼예요.',
    required: [
      { name: '닭가슴살', isRequired: true },
      { name: '양상추', isRequired: true },
      { name: '방울토마토', isRequired: false },
      { name: '오이', isRequired: false },
      { name: '올리브유', isRequired: false },
      { name: '소금', isRequired: false },
    ],
    steps: ['닭가슴살을 삶아 찢어요.', '양상추와 채소를 먹기좋게 썰어요.', '올리브유 드레싱을 뿌려 버무려요.'],
  },
];

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

export function matchRecipe(recipe: Recipe, fridge: FridgeItem[]): RecipeMatch {
  const names = new Set(fridge.filter((x) => x.stock !== 'empty').map((x) => x.name));
  const nearNames = new Set(
    fridge.filter((x) => { const d = daysUntil(x.expiry); return d != null && d <= 2; }).map((x) => x.name)
  );
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
  markAddedToFridge: (id: string, storage: string, stock: StockLevel, expiry: string | null) => void;
  renameShopping: (id: string, name: string) => void;
  removeShopping: (id: string) => void;
  clearCheckedShopping: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [fridge, setFridge] = useState<FridgeItem[]>(INITIAL_FRIDGE);
  const [shopping, setShopping] = useState<ShoppingItem[]>(INITIAL_SHOPPING);
  const [hydrated, setHydrated] = useState(false);

  // 앱 시작 시 저장된 냉장고/장보기 데이터를 한 번 복원한다.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [savedFridge, savedShopping] = await Promise.all([
        loadJSON<FridgeItem[]>(STORAGE_KEYS.fridge),
        loadJSON<ShoppingItem[]>(STORAGE_KEYS.shopping),
      ]);
      if (!alive) return;
      if (savedFridge) setFridge(savedFridge);
      if (savedShopping) setShopping(savedShopping);
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
      markAddedToFridge: (id, storage, stock, expiry) => {
        setShopping((prev) => {
          const it = prev.find((x) => x.id === id);
          if (it) {
            setFridge((pf) => [
              ...pf,
              { id: `fr-${it.name}-${pf.length}`, name: it.name, category: it.category ?? 'etc', storage, stock, expiry, added: todayISO() },
            ]);
          }
          return prev.map((x) => (x.id === id ? { ...x, addedToFridge: true, checked: true } : x));
        });
      },
      renameShopping: (id, name) =>
        setShopping((p) => p.map((x) => (x.id === id ? { ...x, name: name.trim() || x.name } : x))),
      removeShopping: (id) => setShopping((p) => p.filter((x) => x.id !== id)),
      // 구매 완료(체크된) 항목 일괄 삭제. 냉장고 재료는 그대로.
      clearCheckedShopping: () => setShopping((p) => p.filter((x) => !x.checked)),
    }),
    [fridge, shopping]
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
