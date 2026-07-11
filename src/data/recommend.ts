// 재료기반 요리추천 — 순수 로직. 메인 전부 보유가 추천 필수조건, 서브 보유율로 순서.
import type { FridgeItem } from './store';
import { baseName } from './constants';
import { daysUntil } from './date';

export type RecipeCategory = '국·찌개' | '반찬' | '메인' | '간편';
export type Difficulty = '쉬움' | '보통' | '어려움';
export const RECIPE_CATEGORIES: RecipeCategory[] = ['국·찌개', '반찬', '메인', '간편'];

export interface Recipe {
  menuId: string;
  name: string;
  category: RecipeCategory;
  mainIngredients: string[];
  subIngredients: string[];
  seasonings?: string[];   // 양념 — 보유 가정, 매칭에서 제외하고 상세에만 표시
  image?: string;          // 요리 이미지 URL
  recommendUrl?: string;   // 추천레시피 외부 링크(만개의레시피)
  cookTimeMinutes?: number;
  difficulty?: Difficulty;
  tags?: string[];
}

export interface RecipeMatch {
  recipe: Recipe;
  matchedMain: number;
  totalMain: number;
  missingMain: string[];
  matchedSub: number;
  totalSub: number;
  missingSub: string[];
  recommendable: boolean;  // 메인 전부 보유
  usesNearExpiry: boolean;
  score: number;
}

// 레시피 재료명 ↔ 냉장고 재료명 양방향 부분일치(예: '다진돼지고기' ↔ '돼지고기').
const hit = (item: string, pool: string[]) =>
  item.length >= 2 && pool.some((fn) => fn.length >= 2 && (item.includes(fn) || fn.includes(item)));

export function matchRecipe(recipe: Recipe, fridge: FridgeItem[]): RecipeMatch {
  const have = fridge.filter((x) => x.stock !== 'empty').map((x) => baseName(x.name));
  const near = fridge
    .filter((x) => { const d = daysUntil(x.expiry); return d != null && d <= 2; })
    .map((x) => baseName(x.name));

  const missingMain: string[] = [];
  let matchedMain = 0;
  let usesNear = false;
  for (const item of recipe.mainIngredients) {
    if (hit(item, have)) { matchedMain++; if (hit(item, near)) usesNear = true; }
    else missingMain.push(item);
  }
  const missingSub: string[] = [];
  let matchedSub = 0;
  for (const item of recipe.subIngredients) {
    if (hit(item, have)) { matchedSub++; if (hit(item, near)) usesNear = true; }
    else missingSub.push(item);
  }

  const totalMain = recipe.mainIngredients.length;
  const totalSub = recipe.subIngredients.length;
  const recommendable = totalMain > 0 && missingMain.length === 0;
  const mainCov = totalMain ? matchedMain / totalMain : 0;
  const subCov = totalSub ? matchedSub / totalSub : 1; // 서브 없으면 완비로 간주

  // 메인 전부(1000) > 메인 1개 부족(400) > 메인 2개+ 부족(0). 세부 정렬 최댓값(160)보다 구간이 넓어 등급이 섞이지 않는다.
  const base = recommendable ? 1000 : missingMain.length === 1 ? 400 : 0;
  const score = Math.round(base + subCov * 100 + mainCov * 50 + (usesNear ? 10 : 0));
  return { recipe, matchedMain, totalMain, missingMain, matchedSub, totalSub, missingSub, recommendable, usesNearExpiry: usesNear, score };
}

export function matchAll(recipes: Recipe[], fridge: FridgeItem[]): RecipeMatch[] {
  return recipes
    .map((r) => matchRecipe(r, fridge))
    .sort((a, b) => b.score - a.score || a.recipe.name.localeCompare(b.recipe.name, 'ko'));
}

// 바로 가능 = 메인 전부 + 서브 전부. 재료 조금 더 = 메인 전부 + 서브 부족.
export const isReady = (m: RecipeMatch) => m.recommendable && m.missingSub.length === 0;
export const needsSub = (m: RecipeMatch) => m.recommendable && m.missingSub.length > 0;
// 재료 1개만 더 있으면 가능 = 메인 딱 1개 부족.
export const needsOneMain = (m: RecipeMatch) => !m.recommendable && m.missingMain.length === 1;
