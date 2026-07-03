# 재료기반 요리추천 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공식 API 기반 요리추천을 삭제하고, 구조화된 재료기반(메인=필수/서브=순서) 추천 + 카테고리 5탭 + 관리자 화면(요리·식재료 추가)으로 교체한다.

**Architecture:** 요리 데이터를 `recipes.json`(200개, 참고 md에서 생성)으로 번들하고, 순수 추천 로직을 `src/data/recommend.ts`로 분리한다. 요리·식재료 마스터(아이콘 포함)는 AppProvider 상태로 올려 AsyncStorage에 영속하고, 시드 데이터 + 사용자 추가분을 병합한다. 화면은 기존 커스텀 nav/컴포넌트 패턴을 따른다.

**Tech Stack:** React Native + Expo (SDK 56) + TypeScript, AsyncStorage, 인메모리 Context store.

## Global Constraints

- Expo SDK 56 (docs: https://docs.expo.dev/versions/v56.0.0/). 새 의존성 추가 금지 — 기존 패키지만 사용.
- 테스트 러너 없음. 각 태스크 검증 = `cd app && npx tsc --noEmit` (타입) + 필요 시 `npx expo export --platform web` (빌드) + 브라우저 스모크(`npx expo start --web`, http://localhost:8081). Windows는 PowerShell 툴로 expo 실행.
- 카테고리 라벨/순서는 정확히 `전체 | 국·찌개 | 반찬 | 메인 | 간편` (가운뎃점 `·` = U+00B7, 참고 md와 동일 문자).
- **추천 규칙**: 메인 재료 전부 보유해야 추천 대상(recommendable). recommendable 중 서브 전부 보유 → 최상단, 서브 1~2개 부족 → 추천+부족 안내. 메인 부족 → 목록 하위("메인 재료 부족"). 양념은 이번 로직/화면 미사용.
- **목록 카드는 "상세보기" 버튼만.** 상세 화면에만 "추천레시피"(외부 링크)·"유튜브 레시피" 버튼.
- 앱 표시명은 항상 **냉장고비서**. 색/폰트 토큰(`src/theme`)만 사용.
- git 저장소 아님 → 커밋 단계 생략(각 태스크 끝 tsc 통과로 대체).
- DRY, YAGNI: 추천 로직은 `recommend.ts` 한 곳에만.

## File Structure

- Create `app/src/data/recipes.json` — 200개 요리 시드(생성 스크립트 산출물).
- Create `app/scratchpad/genRecipes.cjs` — 참고 md → recipes.json 파서(재실행용).
- Create `app/src/data/recommend.ts` — 순수 추천 로직(모델 타입 + matchRecipe/matchAll + 헬퍼).
- Create `app/src/screens/AdminScreen.tsx` — 관리자(요리 추가 / 식재료 추가) 오버레이.
- Modify `app/src/data/store.ts` — 새 Recipe 모델·마스터(아이콘)·recipes 상태·add/remove·병합. 공공 API 잔재 삭제.
- Modify `app/src/data/persist.ts` — 저장 키 2개 추가.
- Modify `app/src/data/constants.ts` — 요리 카테고리 이모지 + 사용자 식재료 이모지 레지스트리.
- Modify `app/src/components/ui.tsx` — `RecipeTile`을 image/category 기반으로.
- Modify `app/src/navigation/nav.tsx` — admin 오버레이 라우트.
- Modify `app/src/screens/RecipeListScreen.tsx` — 5 카테고리 탭, 카드=상세보기만.
- Modify `app/src/screens/HomeScreen.tsx` — 새 매치 필드.
- Modify `app/src/screens/RecipeDetailScreen.tsx` — 재료기반 상세(추천레시피/유튜브 버튼).
- Modify `app/src/screens/SettingsScreen.tsx` — 관리자 진입 항목.

---

### Task 1: 요리 데이터 생성 (recipes.json)

**Files:**
- Create: `app/scratchpad/genRecipes.cjs`
- Create/Overwrite: `app/src/data/recipes.json`

**Interfaces:**
- Produces: `recipes.json` = `Recipe[]`, 각 항목 `{ menuId, name, category, mainIngredients, subIngredients }`. `menuId` = `${prefix}-${nn}` (prefix: 국·찌개=stew, 반찬=side, 메인=main, 간편=easy), 카테고리별 01~50.

- [ ] **Step 1: 파서 스크립트 작성** — `app/scratchpad/genRecipes.cjs`:

```js
// 참고 md의 4개 카테고리 표(| 번호 | 메뉴명 | 메인식재료 | 서브식재료 |)를 읽어 recipes.json 생성.
const fs = require('fs');
const path = require('path');

const SRC = 'C:/Users/wooripc_003/Downloads/korean_recipe_categories_for_claude.md';
const OUT = path.join(__dirname, '..', 'src', 'data', 'recipes.json');

const SECTIONS = [
  { re: /국·찌개/, category: '국·찌개', prefix: 'stew' },
  { re: /반찬/, category: '반찬', prefix: 'side' },
  { re: /메인/, category: '메인', prefix: 'main' },
  { re: /간편/, category: '간편', prefix: 'easy' },
];
const splitList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);
const recipes = [];
let cur = null;
const counter = {};
for (const line of lines) {
  const h = line.match(/^#\s*\d+\.\s*(.+)$/); // "# 1. 국·찌개 50개"
  if (h) { cur = SECTIONS.find((sec) => sec.re.test(h[1])) || null; continue; }
  if (!cur || !line.startsWith('|')) continue;
  const cells = line.split('|').map((c) => c.trim()); // ['', 번호, 메뉴명, 메인, 서브, '']
  if (cells.length < 5) continue;
  if (!/^\d+$/.test(cells[1])) continue; // 헤더/구분선 스킵
  counter[cur.prefix] = (counter[cur.prefix] || 0) + 1;
  const nn = String(counter[cur.prefix]).padStart(2, '0');
  recipes.push({
    menuId: `${cur.prefix}-${nn}`,
    name: cells[2],
    category: cur.category,
    mainIngredients: splitList(cells[3]),
    subIngredients: splitList(cells[4]),
  });
}
fs.writeFileSync(OUT, JSON.stringify(recipes, null, 2), 'utf8');
console.log(`wrote ${recipes.length} recipes`);
console.log(recipes.reduce((m, r) => ((m[r.category] = (m[r.category] || 0) + 1), m), {}));
```

- [ ] **Step 2: 실행** — Run (PowerShell): `node D:\test-project\fridge-meal\app\scratchpad\genRecipes.cjs`
  Expected: `wrote 200 recipes` 및 `{ '국·찌개': 50, '반찬': 50, '메인': 50, '간편': 50 }`

- [ ] **Step 3: 산출물 확인** — `recipes.json` 첫 항목:
```json
{ "menuId": "stew-01", "name": "돼지김치찌개", "category": "국·찌개",
  "mainIngredients": ["김치", "돼지고기"], "subIngredients": ["두부", "대파", "양파", "청양고추"] }
```

- [ ] **Step 4: 검증** — 개수 200 / 50·50·50·50 이면 완료.

---

### Task 2: 추천 로직 모듈 (recommend.ts)

**Files:** Create `app/src/data/recommend.ts`

**Interfaces:**
- Consumes: `FridgeItem`(store), `baseName`(constants), `daysUntil`(date).
- Produces: `RecipeCategory`, `Difficulty`, `Recipe`, `RECIPE_CATEGORIES`, `RecipeMatch`, `matchRecipe(recipe, fridge)`, `matchAll(recipes, fridge)`, `isReady(m)`, `needsSub(m)`.

- [ ] **Step 1: 모듈 작성** — `app/src/data/recommend.ts`:

```ts
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
  seasonings?: string[];   // 향후용, 미사용
  image?: string;          // 요리 이미지 URL
  recommendUrl?: string;   // 추천레시피 외부 링크
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
  pool.some((fn) => fn.length >= 2 && (item.includes(fn) || fn.includes(item)));

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

  // 메인 전부 보유(recommendable)가 항상 메인 부족보다 위에 오도록 큰 기저값 부여.
  const score = Math.round((recommendable ? 1000 : 0) + subCov * 100 + mainCov * 50 + (usesNear ? 10 : 0));
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
```

- [ ] **Step 2: 구문 검증** — Run: `cd app && npx tsc --noEmit`. `recommend.ts` 자체 구문 오류 없음 확인(다른 파일 에러는 Task 3~6에서 해소).

---

### Task 3: store.ts — 모델 교체·마스터(아이콘)·recipes 상태·병합

**Files:** Modify `app/src/data/store.ts`, `app/src/data/persist.ts`, `app/src/data/constants.ts`(이모지 레지스트리)

**Interfaces:**
- Consumes: `Recipe`, `RecipeMatch`, `matchAll`, `matchRecipe` from `./recommend`; `recipesData` from `./recipes.json`; `setUserEmoji` from `./constants`.
- Produces (context 추가): `recipes`, `addRecipe`, `removeRecipe`, `ingredientMaster`, `addIngredient`, `removeIngredient`. `infoFor`는 사용자 마스터 참조.
- 사용자 식재료 항목 타입: `UserIngredient = { name: string; category: CategoryCode; storage: string; emoji?: string }`.

- [ ] **Step 1: persist.ts 저장 키 추가** — `STORAGE_KEYS`에 추가:
```ts
  recipes: 'fm.recipes.v1',
  ingredients: 'fm.ingredients.v1',
```

- [ ] **Step 2: constants.ts — 사용자 이모지 레지스트리 + 카테고리 이모지**

`constants.ts` 맨 끝(`recipeEmojiFor` 아래)에 추가:
```ts
// 요리 카테고리 → 대표 이모지 (재료기반 요리 타일용).
export const RECIPE_CATEGORY_EMOJI: Record<string, string> = {
  '국·찌개': '🍲', '반찬': '🥗', '메인': '🍖', '간편': '🍚',
};
export function recipeCategoryEmoji(category: string): string {
  return RECIPE_CATEGORY_EMOJI[category] ?? '🍽️';
}

// 관리자가 추가한 식재료 아이콘(런타임). AppProvider가 로드/갱신.
let USER_EMOJI: Record<string, string> = {};
export function setUserEmoji(map: Record<string, string>) { USER_EMOJI = map; }
```

같은 파일의 `emojiFor`를 아래로 교체(사용자 이모지 우선):
```ts
export function emojiFor(name: string, category?: string): string {
  return USER_EMOJI[name] ?? USER_EMOJI[baseName(name)]
    ?? FOOD_EMOJI[name] ?? FOOD_EMOJI[baseName(name)]
    ?? (category ? CATEGORY_EMOJI[category] : undefined) ?? '🍽️';
}
```

- [ ] **Step 3: store.ts import·모델 정리**

`store.ts`의 `import recipesData ...`(10)와 옛 `Recipe/RecipeStep/RecipeNutri`(26~48), 옛 매칭 블록(203~270), `export const RECIPES ...`(194~195)를 삭제하고 상단 import에 추가:
```ts
import recipesData from './recipes.json';
import { Recipe, RecipeMatch, matchAll, matchRecipe } from './recommend';
import { setUserInfo } from './store-helpers-inline'; // (실제로는 아래 Step 4에서 store.ts 내부에 정의)
export type { Recipe, RecipeMatch };
export { matchAll, matchRecipe };
export const SEED_RECIPES: Recipe[] = recipesData as unknown as Recipe[];
```
주의: 위 `store-helpers-inline` import는 잘못된 예시다 — **그 줄은 넣지 말 것**. `setUserInfo`/`setUserEmoji`는 아래처럼 store.ts 내부·constants에서 가져온다. import 정리 최종형:
```ts
import recipesData from './recipes.json';
import { Recipe, RecipeMatch, matchAll, matchRecipe } from './recommend';
import { setUserEmoji } from './constants'; // 기존 constants import 줄에 합쳐도 됨
export type { Recipe, RecipeMatch };
export { matchAll, matchRecipe };
export const SEED_RECIPES: Recipe[] = recipesData as unknown as Recipe[];
```

- [ ] **Step 4: store.ts — 사용자 마스터 레지스트리 + infoFor**

`INGREDIENT_INFO` 정의 뒤에 추가:
```ts
export interface UserIngredient { name: string; category: CategoryCode; storage: string; emoji?: string }
// 관리자 추가 식재료 마스터(런타임). AppProvider가 로드/갱신.
let USER_INFO: Record<string, Info> = {};
export function setUserInfo(map: Record<string, Info>) { USER_INFO = map; }
```
`infoFor` 교체:
```ts
export function infoFor(name: string): Info {
  return INGREDIENT_INFO[name] ?? USER_INFO[name]
    ?? INGREDIENT_INFO[baseName(name)] ?? USER_INFO[baseName(name)]
    ?? { category: 'etc', storage: 'refrigerated' };
}
```

- [ ] **Step 5: AppState 확장**
```ts
  recipes: Recipe[];
  addRecipe: (r: Recipe) => void;
  removeRecipe: (menuId: string) => void;
  ingredientMaster: UserIngredient[];
  addIngredient: (x: UserIngredient) => void;
  removeIngredient: (name: string) => void;
```

- [ ] **Step 6: AppProvider 상태·복원·저장·value**

상태 선언 추가:
```ts
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [userIngredients, setUserIngredients] = useState<UserIngredient[]>([]);
```
마스터 동기화 헬퍼(컴포넌트 내부, useEffect들 위):
```ts
  const syncMasters = (list: UserIngredient[]) => {
    setUserInfo(Object.fromEntries(list.map((x) => [x.name, { category: x.category, storage: x.storage }])));
    setUserEmoji(Object.fromEntries(list.filter((x) => x.emoji).map((x) => [x.name, x.emoji as string])));
  };
```
복원 `useEffect`의 `Promise.all`에 두 키 로드 추가 + 반영:
```ts
      const [savedFridge, savedShopping, savedUsage, savedRecipes, savedIngredients] = await Promise.all([
        loadJSON<FridgeItem[]>(STORAGE_KEYS.fridge),
        loadJSON<ShoppingItem[]>(STORAGE_KEYS.shopping),
        loadJSON<UsageEntry[]>(STORAGE_KEYS.usage),
        loadJSON<Recipe[]>(STORAGE_KEYS.recipes),
        loadJSON<UserIngredient[]>(STORAGE_KEYS.ingredients),
      ]);
      if (!alive) return;
      if (savedFridge) setFridge(savedFridge);
      if (savedShopping) setShopping(savedShopping);
      if (savedRecipes) setUserRecipes(savedRecipes);
      if (savedIngredients) { setUserIngredients(savedIngredients); syncMasters(savedIngredients); }
```
저장 effect 2개 추가:
```ts
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.recipes, userRecipes); }, [userRecipes, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(STORAGE_KEYS.ingredients, userIngredients); }, [userIngredients, hydrated]);
```
`value = useMemo` 객체에 추가(deps에 `userRecipes, userIngredients` 추가):
```ts
      recipes: [...SEED_RECIPES, ...userRecipes],
      addRecipe: (r) => setUserRecipes((p) => [r, ...p.filter((x) => x.menuId !== r.menuId)]),
      removeRecipe: (menuId) => setUserRecipes((p) => p.filter((x) => x.menuId !== menuId)),
      ingredientMaster: userIngredients,
      addIngredient: (x) => setUserIngredients((p) => { const next = [x, ...p.filter((y) => y.name !== x.name)]; syncMasters(next); return next; }),
      removeIngredient: (name) => setUserIngredients((p) => { const next = p.filter((y) => y.name !== name); syncMasters(next); return next; }),
```

- [ ] **Step 7: 검증** — Run: `cd app && npx tsc --noEmit`. store.ts/recommend.ts/persist.ts/constants.ts 에러 없음(화면 에러는 Task 4~7에서 해소).

---

### Task 4: RecipeTile 컴포넌트 — image 우선, 없으면 카테고리 이모지

**Files:** Modify `app/src/components/ui.tsx`

**Interfaces:** `RecipeTile` 시그니처 `{ image?: string; category?: string; size?: number; bg: string }`.

- [ ] **Step 1: RecipeTile 교체**(84~95):
```tsx
/** 레시피 타일 — 요리 이미지(URL) 우선, 없으면 카테고리 대표 이모지 + 색 배경. */
export function RecipeTile({ image, category, size = 52, bg }: { image?: string; category?: string; size?: number; bg: string }) {
  const r = size * 0.28;
  if (image) return <Image source={{ uri: image }} style={{ width: size, height: size, borderRadius: r, backgroundColor: bg }} resizeMode="cover" />;
  const glyph = category ? recipeCategoryEmoji(category) : '🍽️';
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[{ fontSize: size * 0.5, lineHeight: size * 0.62, textAlign: 'center' }, emojiFont]}>{glyph}</Text>
    </View>
  );
}
```
`Image` import는 유지(위에서 사용). constants import(7)에 `recipeCategoryEmoji` 추가:
```ts
import { CATEGORY, CategoryCode, STOCK, StockLevel, emojiFor, recipeCategoryEmoji } from '../data/constants';
```

- [ ] **Step 2: 검증** — `cd app && npx tsc --noEmit` (ui.tsx/constants.ts 에러 없음).

---

### Task 5: RecipeListScreen — 5 카테고리 탭, 카드=상세보기만

**Files:** Modify `app/src/screens/RecipeListScreen.tsx`

- [ ] **Step 1: import + 탭/리스트 계산 교체**(1~45):
```tsx
// 요리추천 — 전체 / 국·찌개 / 반찬 / 메인 / 간편. 메인 전부 보유가 추천 상단.
import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { useApp, matchAll, matchRecipe } from '../data/store';
import { RECIPE_CATEGORIES, RecipeMatch, isReady } from '../data/recommend';
import { RecipeTile, HeaderActions } from '../components/ui';
import { useNav } from '../navigation/nav';

const TABS = ['전체', ...RECIPE_CATEGORIES]; // 전체 | 국·찌개 | 반찬 | 메인 | 간편

export function RecipeListScreen() {
  const { fridge, recipes } = useApp();
  const nav = useNav();
  const [tab, setTab] = useState(0);
  const [w, setW] = useState(0);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const pagerRef = useRef<ScrollView>(null);

  const all = matchAll(recipes, fridge);
  const listFor = (i: number) => (i === 0 ? all : all.filter((m) => m.recipe.category === TABS[i]));
  const q = query.trim();
  const results = q ? recipes.filter((r) => r.name.includes(q)).slice(0, 60).map((r) => matchRecipe(r, fridge)) : [];

  const goTab = (i: number) => { setTab(i); pagerRef.current?.scrollTo({ x: i * w, animated: true }); };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (w > 0) { const i = Math.round(e.nativeEvent.contentOffset.x / w); if (i !== tab) setTab(i); }
  };
```
(주의: 기존 파일에 `Linking` import가 있었다면 카드에서 유튜브를 제거하므로 사용처가 사라진다 → import에서 `Linking` 제거.)

- [ ] **Step 2: 탭 렌더 교체**(76~87, 5개라 가로 스크롤):
```tsx
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabs}>
        {TABS.map((label, i) => {
          const on = i === tab;
          return (
            <Pressable key={label} style={[s.tab, on && s.tabOn]} onPress={() => goTab(i)}>
              <Text style={[s.tabText, on && s.tabTextOn]}>{label}</Text>
              <Text style={[s.tabCount, on && s.tabCountOn]}>{listFor(i).length}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
```
`s.tabs` 스타일(192) 교체 + `tabsScroll`/`tab` 조정:
```ts
  tabsScroll: { flexGrow: 0, marginTop: 4, marginBottom: 6 },
  tabs: { flexDirection: 'row', gap: 7, paddingHorizontal: 20 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
```
(`tabOn/tabText/tabTextOn/tabCount/tabCountOn` 유지.)

- [ ] **Step 3: 페이지 슬라이스 제한 제거** — 페이지 렌더의 `list.slice(0, 40)`(104)를 `list`로 교체.

- [ ] **Step 4: RecipeCard 교체(상세보기 버튼만)**(124~181):
```tsx
function RecipeCard({ m, onOpen }: { m: RecipeMatch; onOpen: () => void }) {
  const ready = isReady(m);
  const statusBg = m.usesNearExpiry ? colors.coralBg : ready ? colors.primaryBg : m.recommendable ? colors.accentBg : colors.fill;
  // 상태 텍스트: 바로 가능 / 재료 N개 더 / 메인 부족
  const missing = m.recommendable ? m.missingSub : m.missingMain;
  const statusLabel = ready ? '바로 가능' : m.recommendable ? `재료 ${m.missingSub.length}개 더 있으면 완성` : '메인 재료 부족';

  return (
    <Pressable style={s.card} onPress={onOpen}>
      <View style={s.cardTop}>
        <RecipeTile image={m.recipe.image} category={m.recipe.category} size={46} bg={statusBg} />
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle} numberOfLines={1}>{m.recipe.name}</Text>
          <View style={s.metaRow}>
            <Text style={s.metaText}>{m.recipe.category}{m.recipe.cookTimeMinutes ? ` · ${m.recipe.cookTimeMinutes}분` : ''}</Text>
            {m.usesNearExpiry && (
              <View style={s.flame}><Icon name="flame" size={11} color={colors.coral} weight="fill" /><Text style={s.flameText}>임박</Text></View>
            )}
          </View>
        </View>
      </View>

      <View style={s.infoRow}>
        <Text style={[s.status, ready ? s.statusReady : m.recommendable ? s.statusAlmost : s.statusNo]}>{statusLabel}</Text>
        {missing.length > 0 && (
          <View style={s.missingWrap}>
            {missing.slice(0, 4).map((n) => (<View key={n} style={s.missChip}><Text style={s.missChipText}>{n}</Text></View>))}
            {missing.length > 4 && <Text style={s.missMore}>+{missing.length - 4}</Text>}
          </View>
        )}
      </View>

      <View style={s.footer}>
        <View style={s.viewBtn}><Text style={s.viewBtnText}>상세보기</Text><Icon name="caret-right" size={15} color={colors.inkAlt} weight="bold" /></View>
      </View>
    </Pressable>
  );
}
```
스타일 `s`에 추가/조정(기존 `infoHave/infoNone/infoMissingLabel/addChip*/ytBtn*` 등 미사용분은 남겨둬도 무방):
```ts
  status: { fontFamily: font.bold, fontSize: 13 },
  statusReady: { color: colors.primary },
  statusAlmost: { color: colors.accentDark },
  statusNo: { color: colors.inkAsst },
  missMore: { fontFamily: font.bold, fontSize: 11.5, color: colors.inkAsst },
  viewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: radius.md, backgroundColor: colors.fill },
```
(기존 `viewBtn`/`viewBtnText`가 이미 있으면 `viewBtn`만 위로 교체.)

- [ ] **Step 5: 호출부 정리** — 검색 결과·페이지 렌더의 `RecipeCard`에서 `onAdd` prop 제거, `key`/`onOpen`을 `m.recipe.menuId` 기준으로:
```tsx
  <RecipeCard key={m.recipe.menuId} m={m} onOpen={() => nav.openRecipe(m.recipe.menuId)} />
```
(70~72, 105~110의 `onAdd={...}` 및 `addToShopping` 사용 제거. `useApp()`에서 `addToShopping` 구조분해도 제거.)

- [ ] **Step 6: 검증** — `cd app && npx tsc --noEmit` (RecipeListScreen 에러 없음).

---

### Task 6: HomeScreen + RecipeDetailScreen 재구성

**Files:** Modify `app/src/screens/HomeScreen.tsx`, `app/src/screens/RecipeDetailScreen.tsx`

- [ ] **Step 1: HomeScreen 교체**
- import에 `import { isReady, needsSub } from '../data/recommend';` 추가.
- `const { fridge, shopping } = useApp();` → `const { fridge, shopping, recipes } = useApp();`
- 매치 계산(22~24):
```tsx
  const matches = matchAll(recipes, fridge);
  const ready = matches.filter(isReady).slice(0, 3);
  const almost = matches.filter(needsSub).slice(0, 2);
```
- ready 카드(91~101): `key`/`openRecipe` → `m.recipe.menuId`; `<RecipeTile image={m.recipe.image} category={m.recipe.category} size={42} bg={colors.primaryBg} />`; 제목 `m.recipe.title` → `m.recipe.name`; 메타 → `{m.recipe.category}{m.recipe.cookTimeMinutes ? ` · ${m.recipe.cookTimeMinutes}분` : ''}`.
- almost 카드(108~123): `key`/`openRecipe` → `menuId`; `<RecipeTile image={m.recipe.image} category={m.recipe.category} size={42} bg={colors.accentBg} />`; 제목 → `m.recipe.name`; `m.missing.map` → `m.missingSub.map`.

- [ ] **Step 2: HomeScreen 검증** — `cd app && npx tsc --noEmit`.

- [ ] **Step 3: RecipeDetailScreen 전체 교체**:
```tsx
// 레시피 상세 — 요리이미지 + 메인/서브 재료(가진·부족) + 추천레시피(외부)·유튜브 버튼. 조리단계 나열 안 함.
import React from 'react';
import { View, Text, ScrollView, Image, Linking, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { ScreenHeader, AppButton, RecipeTile } from '../components/ui';
import { useApp, matchRecipe } from '../data/store';
import { baseName } from '../data/constants';
import { useNav } from '../navigation/nav';

export function RecipeDetailScreen({ recipeId }: { recipeId: string }) {
  const { fridge, recipes, addToShopping } = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const recipe = recipes.find((r) => r.menuId === recipeId);
  if (!recipe) return null;
  const m = matchRecipe(recipe, fridge);
  const missingAll = [...m.missingMain, ...m.missingSub];

  const have = fridge.filter((x) => x.stock !== 'empty').map((x) => baseName(x.name));
  const has = (name: string) => have.some((fn) => fn.length >= 2 && (name.includes(fn) || fn.includes(name)));

  const onYoutube = () => Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.name + ' 레시피')}`);
  const onRecommend = () => recipe.recommendUrl && Linking.openURL(recipe.recommendUrl);

  const Group = ({ title, items }: { title: string; items: string[] }) =>
    items.length === 0 ? null : (
      <View style={{ marginTop: 16 }}>
        <Text style={s.groupTitle}>{title}</Text>
        <View style={s.chipWrap}>
          {items.map((name) => {
            const owned = has(name);
            return (
              <View key={name} style={[s.ingChip, owned ? s.ingHave : s.ingMiss]}>
                {owned && <Icon name="check-circle" size={12} color={colors.primary} weight="fill" />}
                <Text style={[s.ingText, owned ? s.ingTextHave : s.ingTextMiss]}>{name}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );

  return (
    <View style={s.root}>
      <ScreenHeader title="레시피" onBack={() => nav.closeOverlay()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {recipe.image ? (
          <Image source={{ uri: recipe.image }} style={s.heroImg} resizeMode="cover" />
        ) : (
          <View style={[s.heroImg, s.heroFallback, { backgroundColor: m.usesNearExpiry ? colors.coralBg : colors.primaryBg }]}>
            <RecipeTile category={recipe.category} size={92} bg="transparent" />
          </View>
        )}
        <View style={s.body}>
          <Text style={s.title}>{recipe.name}</Text>
          <View style={s.metaRow}>
            <View style={s.metaPill}><Text style={s.metaText}>{recipe.category}</Text></View>
            {recipe.cookTimeMinutes != null && (<View style={s.metaPill}><Icon name="flame" size={12} color={colors.inkAlt} weight="fill" /><Text style={s.metaText}>{recipe.cookTimeMinutes}분</Text></View>)}
            {!!recipe.difficulty && <View style={s.metaPill}><Text style={s.metaText}>{recipe.difficulty}</Text></View>}
          </View>

          <Text style={s.sectionTitle}>재료</Text>
          <Text style={s.haveText}>메인 재료 {m.matchedMain}/{m.totalMain} 보유{m.recommendable && m.missingSub.length > 0 ? ` · 서브 ${m.missingSub.length}개 더 필요` : ''}</Text>
          <Group title="메인 재료" items={recipe.mainIngredients} />
          <Group title="서브 재료" items={recipe.subIngredients} />
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
        <View style={s.footerBtns}>
          {!!recipe.recommendUrl && <AppButton label="추천레시피" icon="heart" onPress={onRecommend} style={{ flex: 1 }} />}
          <AppButton label="유튜브 레시피" variant="ghost" onPress={onYoutube} style={{ flex: 1 }} />
        </View>
        {missingAll.length > 0 && (
          <Pressable style={s.addRow} onPress={() => { missingAll.forEach((name) => addToShopping(name, 'recipe_missing', `${recipe.name}에 필요해요`)); nav.closeOverlay(); nav.setTab('shopping'); }}>
            <Icon name="basket" size={15} color={colors.inkAlt} weight="bold" />
            <Text style={s.addText}>부족한 재료 {missingAll.length}개 장보기 담기</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  heroImg: { width: '100%', height: 200, backgroundColor: colors.primaryBg },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.fill, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  metaText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  sectionTitle: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink, marginTop: 24 },
  haveText: { fontFamily: font.bold, fontSize: 14, color: colors.primary, marginTop: 8 },
  groupTitle: { fontFamily: font.bold, fontSize: 13.5, color: colors.inkAlt, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  ingChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  ingHave: { backgroundColor: colors.primaryBg, borderColor: colors.primaryBg },
  ingMiss: { backgroundColor: colors.surface, borderColor: colors.line },
  ingText: { fontFamily: font.bold, fontSize: 13 },
  ingTextHave: { color: colors.primaryDark },
  ingTextMiss: { color: colors.inkAlt },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  footerBtns: { flexDirection: 'row', gap: 10 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, paddingVertical: 10 },
  addText: { fontFamily: font.bold, fontSize: 13.5, color: colors.inkAlt },
});
```

- [ ] **Step 4: 아이콘·색 토큰 존재 확인** — Grep로 `Icon.tsx`에 `check-circle`, `basket`, `flame`, `heart`, `caret-right` 존재 / `tokens.ts`에 `primaryDark`, `coralBg`, `accentBg`, `primaryBg`, `accentDark` 존재 확인. 없으면 존재하는 유사값으로 대체.

- [ ] **Step 5: 검증** — `cd app && npx tsc --noEmit` (전 파일).

---

### Task 7: 관리자 화면(AdminScreen) + nav 라우트 + 설정 진입

**Files:** Create `app/src/screens/AdminScreen.tsx`; Modify `app/src/navigation/nav.tsx`, `app/src/screens/SettingsScreen.tsx`, 오버레이 렌더 상위(Step 2에서 위치 확인).

- [ ] **Step 1: nav.tsx admin 오버레이** — `Overlay` 유니온에 `| { name: 'admin' }`; `Nav`에 `openAdmin: () => void;`; `value`에 `openAdmin: () => setOverlay({ name: 'admin' }),`.

- [ ] **Step 2: 오버레이 렌더 지점 찾기** — Grep `overlay.name === 'recipeDetail'` (또는 `'ingredientForm'`) 렌더 파일 확인 후 admin 케이스 추가:
```tsx
{overlay?.name === 'admin' && <AdminScreen />}
```
그 파일 상단에 `import { AdminScreen } from './screens/AdminScreen';`(경로는 위치에 맞게).

- [ ] **Step 3: AdminScreen 작성** — `app/src/screens/AdminScreen.tsx`:
```tsx
// 관리자 — 요리레시피 추가(메인/서브/추천레시피 링크) / 카테고리별 식재료 추가(아이콘). 추가분은 AsyncStorage.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { ScreenHeader, AppButton } from '../components/ui';
import { useApp } from '../data/store';
import { RECIPE_CATEGORIES, RecipeCategory } from '../data/recommend';
import { FINE_CATEGORIES, coarseFromFine } from '../data/constants';
import { useNav } from '../navigation/nav';

const STORAGE_BY_FINE: Record<string, string> = {
  meat: 'refrigerated', seafood: 'refrigerated', egg_dairy: 'refrigerated', veg: 'refrigerated',
  fruit: 'room_temp', grain: 'room_temp', tofu_bean: 'refrigerated', processed: 'room_temp',
  sauce: 'sauce', nuts_snack: 'room_temp', bakery: 'room_temp', frozen: 'frozen', mealkit: 'room_temp',
  drink: 'refrigerated', etc: 'refrigerated',
};
const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const slug = (s: string) => 'user-' + Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);

export function AdminScreen() {
  const nav = useNav();
  const { recipes, addRecipe, removeRecipe, ingredientMaster, addIngredient, removeIngredient } = useApp();
  const [mode, setMode] = useState<'recipe' | 'ingredient'>('recipe');

  const [rName, setRName] = useState('');
  const [rCat, setRCat] = useState<RecipeCategory>('국·찌개');
  const [rMain, setRMain] = useState('');
  const [rSub, setRSub] = useState('');
  const [rTime, setRTime] = useState('');
  const [rUrl, setRUrl] = useState('');
  const userRecipes = recipes.filter((r) => r.menuId.startsWith('user-'));
  const submitRecipe = () => {
    const name = rName.trim(); const main = splitList(rMain);
    if (!name || main.length === 0) return;
    addRecipe({ menuId: slug(name), name, category: rCat, mainIngredients: main, subIngredients: splitList(rSub),
      cookTimeMinutes: rTime ? (Number(rTime) || undefined) : undefined, recommendUrl: rUrl.trim() || undefined });
    setRName(''); setRMain(''); setRSub(''); setRTime(''); setRUrl('');
  };

  const [iName, setIName] = useState('');
  const [iFine, setIFine] = useState('veg');
  const [iEmoji, setIEmoji] = useState('');
  const submitIngredient = () => {
    const name = iName.trim(); if (!name) return;
    addIngredient({ name, category: coarseFromFine(iFine), storage: STORAGE_BY_FINE[iFine] ?? 'refrigerated', emoji: iEmoji.trim() || undefined });
    setIName(''); setIEmoji('');
  };

  return (
    <View style={s.root}>
      <ScreenHeader title="관리자" onBack={() => nav.closeOverlay()} />
      <View style={s.segRow}>
        <Pressable style={[s.seg, mode === 'recipe' && s.segOn]} onPress={() => setMode('recipe')}><Text style={[s.segText, mode === 'recipe' && s.segTextOn]}>요리 추가</Text></Pressable>
        <Pressable style={[s.seg, mode === 'ingredient' && s.segOn]} onPress={() => setMode('ingredient')}><Text style={[s.segText, mode === 'ingredient' && s.segTextOn]}>식재료 추가</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {mode === 'recipe' ? (
          <>
            <Field label="요리 이름" value={rName} onChange={setRName} placeholder="예: 돼지김치찌개" />
            <Text style={s.label}>카테고리</Text>
            <View style={s.chipRow}>{RECIPE_CATEGORIES.map((c) => (<Pressable key={c} style={[s.chip, rCat === c && s.chipOn]} onPress={() => setRCat(c)}><Text style={[s.chipText, rCat === c && s.chipTextOn]}>{c}</Text></Pressable>))}</View>
            <Field label="메인 재료 (쉼표, 필수)" value={rMain} onChange={setRMain} placeholder="김치, 돼지고기" />
            <Field label="서브 재료 (쉼표)" value={rSub} onChange={setRSub} placeholder="두부, 대파, 양파" />
            <Field label="조리시간(분)" value={rTime} onChange={setRTime} placeholder="25" keyboardType="numeric" />
            <Field label="추천레시피 링크(URL)" value={rUrl} onChange={setRUrl} placeholder="https://..." />
            <AppButton label="요리 추가" icon="plus" onPress={submitRecipe} style={{ marginTop: 16 }} />
            <Text style={s.listHead}>추가한 요리 {userRecipes.length}개</Text>
            {userRecipes.map((r) => (
              <View key={r.menuId} style={s.listRow}>
                <Text style={s.listName}>{r.name} <Text style={s.listMeta}>· {r.category}</Text></Text>
                <Pressable hitSlop={8} onPress={() => removeRecipe(r.menuId)}><Icon name="trash" size={18} color={colors.coral} /></Pressable>
              </View>
            ))}
          </>
        ) : (
          <>
            <Field label="식재료 이름" value={iName} onChange={setIName} placeholder="예: 순두부" />
            <Field label="아이콘(이모지)" value={iEmoji} onChange={setIEmoji} placeholder="🍲" />
            <Text style={s.label}>분류</Text>
            <View style={s.chipRow}>{FINE_CATEGORIES.map((c) => (<Pressable key={c.code} style={[s.chip, iFine === c.code && s.chipOn]} onPress={() => setIFine(c.code)}><Text style={[s.chipText, iFine === c.code && s.chipTextOn]}>{c.emoji} {c.label}</Text></Pressable>))}</View>
            <AppButton label="식재료 추가" icon="plus" onPress={submitIngredient} style={{ marginTop: 16 }} />
            <Text style={s.listHead}>추가한 식재료 {ingredientMaster.length}개</Text>
            {ingredientMaster.map((x) => (
              <View key={x.name} style={s.listRow}>
                <Text style={s.listName}>{x.emoji ? `${x.emoji} ` : ''}{x.name}</Text>
                <Pressable hitSlop={8} onPress={() => removeIngredient(x.name)}><Icon name="trash" size={18} color={colors.coral} /></Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.inkAsst} style={s.input} keyboardType={keyboardType ?? 'default'} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  segRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  seg: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  segOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segText: { fontFamily: font.bold, fontSize: 14, color: colors.inkAlt },
  segTextOn: { color: colors.white },
  label: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt, marginBottom: 7 },
  input: { fontFamily: font.medium, fontSize: 15, color: colors.ink, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 4 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  chipTextOn: { color: colors.white },
  listHead: { fontFamily: font.extrabold, fontSize: 15, color: colors.ink, marginTop: 26, marginBottom: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  listName: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  listMeta: { fontFamily: font.medium, fontSize: 13, color: colors.inkAsst },
});
```

- [ ] **Step 4: SettingsScreen 관리자 진입** — `groups`의 '정보' 그룹 items 맨 앞에:
```ts
        { icon: 'gear', label: '관리자 (요리·식재료 관리)', onPress: () => nav.openAdmin() },
```

- [ ] **Step 5: 검증(타입+빌드)** — `cd app && npx tsc --noEmit` → 에러 없음. `cd app && npx expo export --platform web` → 빌드 성공, `dist/` 생성.

---

### Task 8: 통합 스모크 테스트 (브라우저)

- [ ] **Step 1: 웹 실행** — Run(PowerShell, background): `cd app; npx expo start --web` → http://localhost:8081
- [ ] **Step 2: 요리추천** — 탭 `전체·국·찌개·반찬·메인·간편` + 개수, 스와이프, 카드에 상태(바로 가능/재료 N개 더/메인 부족)·부족 칩·**상세보기 버튼만**.
- [ ] **Step 3: 상세** — 이미지(없으면 이모지) + 메인/서브 재료 가진·부족 + (링크 있으면)추천레시피·유튜브 버튼 + 부족 담기.
- [ ] **Step 4: 홈** — '지금 만들 수 있어요'(메인+서브 완비), '조금만 사면 가능해요'(서브 부족)에 카드 노출.
- [ ] **Step 5: 관리자** — 설정 → 관리자 → 요리 추가(추천레시피 링크 포함) → 상세에서 버튼 동작. 식재료 추가(아이콘) → 냉장고/타일에 이모지 반영. 브라우저 리로드 후 유지(영속).
- [ ] **Step 6: 문제 시** 해당 태스크로 돌아가 수정 후 tsc 재검증.

---

## Self-Review (작성자 체크)

**Spec coverage:** 공식 API 삭제(T1,T3) ✔ / 5탭(T5) ✔ / 200개(T1) ✔ / 메인-필수·서브-순서 추천(T2) ✔ / 카드 상세보기만(T5) ✔ / 상세 이미지·메인·서브·추천레시피·유튜브(T6) ✔ / 관리자 요리(추천링크)·식재료(아이콘)(T7) ✔ / 영속(T3) ✔.

**Placeholder scan:** Task 3 Step 3의 잘못된 `store-helpers-inline` import는 "넣지 말 것"으로 명시 + 최종형 제시. 그 외 TODO/TBD 없음.

**Type consistency:** `matchAll(recipes, fridge)`/`matchRecipe(recipe, fridge)`가 정의·호출부 일치. `RecipeMatch` 필드(matchedMain/totalMain/missingMain/matchedSub/totalSub/missingSub/recommendable/usesNearExpiry/score) 정의·사용 일치. `recipe.menuId/name/category/image/recommendUrl`로 통일. `UserIngredient`(name/category/storage/emoji) 정의·사용 일치.

**미결(구현 중 Grep 확인):** T6-4 아이콘/색 토큰 실존 / T7-2 오버레이 렌더 지점.
