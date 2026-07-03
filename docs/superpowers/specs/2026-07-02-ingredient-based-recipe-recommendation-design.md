# 재료기반 요리추천 개편 — 설계 문서

- 작성일: 2026-07-02
- 대상 앱: 냉장고비서 (fridge-meal, Expo/React Native + TypeScript)
- 상태: 설계안 (사용자 검토 대기)

## 배경

현재 요리추천은 식품안전나라 공공 API 데이터(`src/data/recipes.json`, 1,145개, ~1.8MB)를 번들해
`matchRecipe`가 레시피의 재료 원문(`parts`, 자유텍스트)을 파싱해 냉장고 재료와 부분일치로 매칭한다.
요리추천 탭은 매칭 결과 기반 3탭(**바로 가능 / 조금만 사면 / 임박 재료로**)이다.

이 방식을 **구조화된 재료기반 추천**으로 교체한다. 요리마다 메인/서브 식재료를 명시하고,
카테고리(국·찌개/반찬/메인/간편)로 분류하며, 관리자가 요리·식재료를 직접 추가할 수 있게 한다.

## 목표 (사용자 요구사항)

1. 공식 API 연동 요리추천 코드/데이터 **전부 삭제**.
2. 요리추천 탭을 **`전체 | 국·찌개 | 반찬 | 메인 | 간편`** 5개 카테고리로 변경.
3. 각 카테고리 요리 **50개씩**(총 200개) 우선 탑재. 데이터는 참고 파일(`korean_recipe_categories_for_claude.md`)에 이미 존재.
4. **관리자 화면**: 요리 추가 + 식재료 추가.
5. **재료기반 추천 로직**(ChatGPT 제안): 메인/서브/양념 재료 매칭 점수제.

## 확정 결정 (2026-07-02, 사용자 확정)

- **요리 데이터**: 참고 파일 200개(카테고리별 50개)를 파싱해 새 `recipes.json` 생성. 메인/서브 재료 기반.
- **추천 로직**: 메인 재료는 **전부 보유해야 추천 대상**. 서브까지 전부 보유하면 최상단, 서브 1~2개 부족도
  추천하되 "추가로 필요한 재료"로 안내. 양념(seasonings)은 이번 로직/화면에서 제외(모델엔 optional 유지).
- **목록 카드**: 카드에는 **상세보기 버튼만**.
- **상세 화면**: 요리이미지(없으면 카테고리 이모지 타일) + 메인식재료 + 서브식재료(가진·부족 구분)
  + **추천레시피 버튼(외부 링크)** + 유튜브 레시피 버튼. 앱 내에서 조리 단계는 나열하지 않는다.
- **관리자 (신규)**: 설정에서 진입. 앱 관리 화면.
  - **요리레시피 추가**: 이름·카테고리·메인식재료·서브식재료 + **추천레시피 링크(URL)** 입력. 목록/삭제.
  - **카테고리별 식재료 추가**: 이름·카테고리 + **아이콘(이모지)** 입력. 식재료 마스터에 등록, 목록/삭제.
  - 추가 데이터는 AsyncStorage(`persist.ts`)에 저장, 기본 200개/기본 마스터와 병합.
- **배경**: 현재 식재료 마스터에 빠진 재료가 많음 → 관리자에서 식재료(+아이콘)와 레시피를 지속 추가할 수 있게 한다.

## 데이터 모델

기존 공공 API 모델(`Recipe`: title/parts/steps/nutri/image/method, `RecipeStep`, `RecipeNutri`)을 **삭제**하고 교체:

```ts
export type RecipeCategory = '국·찌개' | '반찬' | '메인' | '간편';
export type Difficulty = '쉬움' | '보통' | '어려움';

export interface Recipe {
  menuId: string;              // 'stew-01'
  name: string;                // '돼지김치찌개'
  category: RecipeCategory;
  mainIngredients: string[];   // ['김치','돼지고기'] — 전부 보유해야 추천 대상
  subIngredients: string[];    // ['두부','대파','양파','청양고추'] — 보유율로 추천 순서 결정
  seasonings?: string[];       // optional, 이번 로직/화면 미사용(향후용). 기본 []
  image?: string;              // 요리 이미지 URL (없으면 카테고리 이모지 타일)
  recommendUrl?: string;       // 추천레시피 외부 링크 (관리자 입력)
  cookTimeMinutes?: number;
  difficulty?: Difficulty;
  tags?: string[];
}
```

- 사용자 정의 추가 요리는 동일 모델. `source: 'seed' | 'user'`를 런타임에서 구분(저장/삭제용).
- 식재료 마스터 항목: 기존 `INGREDIENT_INFO`(이름→{category, storage}) 확장. 관리자 추가분은 별도 저장 후 병합.

## 추천 로직 (`matchRecipe` 재작성)

**핵심 규칙(사용자 확정):**
1. **메인 재료 전부 보유** = 추천 대상(recommendable)의 필수 조건.
2. recommendable 중 **서브 재료도 전부 보유** → 추천 최상단.
3. recommendable 중 **서브 1~2개(이상) 부족** → 추천하되 "추가로 필요한 재료"로 서브 부족분 안내.
4. 메인이 하나라도 부족한 요리는 추천 하위(카테고리 브라우징용으로 목록엔 남기되 "메인 재료 부족" 표시).
5. 유통기한 임박(D-2 이내) 재료를 쓰면 가산.
6. 양념(seasonings)은 이번 로직에서 사용하지 않음.

정렬 키(우선순위):
- `recommendable`(메인 전부 보유) 우선 → `missingSub.length` 적은 순 → `usesNearExpiry` → 이름순.
- 표시용 `score = (recommendable?1000:0) + subCoverage*100 + (usesNearExpiry?10:0)` + mainCoverage 보조 가산.

분류/표시:
- **recommendable && 서브 부족 0** → "바로 가능"(홈 "지금 만들 수 있어요").
- **recommendable && 서브 부족 1~2** → "재료 조금 더"(홈 "조금만 사면 가능해요"), 부족 서브 재료 칩 안내.
- **메인 부족** → "메인 재료 부족", 부족 메인 칩 안내(추천 하위).

반환 타입:
```ts
export interface RecipeMatch {
  recipe: Recipe;
  matchedMain: number;
  totalMain: number;
  missingMain: string[];    // 부족한 메인 재료
  matchedSub: number;
  totalSub: number;
  missingSub: string[];     // 부족한 서브 재료(추가 필요 안내·담기)
  recommendable: boolean;   // 메인 전부 보유
  usesNearExpiry: boolean;
  score: number;
}
```

재료 매칭은 냉장고 재료명 `baseName` 정규화 후 양방향 부분일치(예: '다진돼지고기' ↔ '돼지고기') 유지.

## 화면 변경

### 요리추천 (`RecipeListScreen`)
- 탭 3개(바로/조금만/임박) → **5개(`전체 | 국·찌개 | 반찬 | 메인 | 간편`)**로 교체. 좌우 스와이프 유지.
- '전체'는 모든 카테고리 통합. 각 탭 내 정렬: recommendable 우선 → 서브 부족 적은 순.
- 카드: 요리이미지(없으면 카테고리 이모지) + 요리명·카테고리·조리시간 메타 + 상태(바로 가능/재료 조금 더/메인 부족) + 부족 재료 칩. **버튼은 "상세보기"만.**
- 검색: 전체 요리에서 이름 일치(유지).

### 홈 (`HomeScreen`)
- "지금 만들 수 있어요"(recommendable && 서브 부족 0), "조금만 사면 가능해요"(recommendable && 서브 부족 1~2)로 매핑. 부족 칩은 서브 부족분.
- 카드 메타에서 `nutri.kcal` 등 제거 → 카테고리·조리시간으로 교체.

### 상세 (`RecipeDetailScreen`)
- 완성사진 히어로/영양카드/단계별 사진/원문(parts) 제거. **앱 내 조리 단계 나열 안 함.**
- 구성: 요리이미지(없으면 카테고리 이모지 타일) 히어로 + 카테고리·조리시간 메타 + 메인식재료(가진·부족) + 서브식재료(가진·부족) + **"추천레시피" 버튼(외부 `recommendUrl` 링크, 없으면 숨김)** + **"유튜브 레시피" 버튼** + (선택)부족 재료 담기.

### 관리자 (`AdminScreen`, 신규)
- 진입: 설정(`SettingsScreen`)에 "관리자" 항목.
- 탭 2개:
  - **요리레시피 추가**: 이름·카테고리·메인식재료·서브식재료(쉼표 구분)·조리시간·**추천레시피 링크(URL)**. 저장 시 AsyncStorage 반영, 추가 목록 표시/삭제.
  - **카테고리별 식재료 추가**: 이름·분류(세분 카테고리 선택)·**아이콘(이모지) 입력**. 식재료 마스터에 등록(분류→보관위치 자동), 목록/삭제.

## 저장 (`persist.ts`)
- `STORAGE_KEYS`에 추가: `recipes`(사용자 요리), `ingredients`(사용자 식재료 마스터, 아이콘 포함).
- 앱 시작 시 기본 200개 + 사용자 추가분 병합해 `recipes` 구성. 마스터도 `INGREDIENT_INFO` + 사용자 추가분 병합.
- 사용자 식재료 아이콘: constants에 `USER_EMOJI` 레지스트리 + setter 두고, `emojiFor`가 우선 참조(FoodTile 등에서 자동 반영).

## 삭제 대상
- `src/data/recipes.json`(공공데이터) → 새 200개 데이터로 대체.
- `store.ts`: `RecipeStep`, `RecipeNutri`, `Recipe.parts/steps/nutri/image/method`, 원문 파싱기(`recipeItems`, `cleanItemName`, `PANTRY_WORDS`, `SECTION_WORDS`, `isPantry`, `recipeItemsCache`).
- `RecipeListScreen`: 기존 3탭 매칭 로직(`matchesTab`).
- 상세/홈의 사진 URL·영양·parts 참조.

## 영향 파일 요약
`src/data/store.ts`(모델·매칭·마스터·병합), `src/data/recipes.json`(신규 200개),
`src/screens/RecipeListScreen.tsx`(탭), `src/screens/HomeScreen.tsx`(필드),
`src/screens/RecipeDetailScreen.tsx`(재구성), `src/screens/SettingsScreen.tsx`(관리자 진입),
`src/screens/AdminScreen.tsx`(신규), `src/data/persist.ts`(저장 키), `src/navigation/nav.tsx`(관리자 라우트).

## 미결/후속
- `seasonings` 데이터: 참고 파일 표엔 메인/서브만 있음 → 초기 [], 관리자·후속 보강.
- 선호 카테고리 +5 점수: V1 선택 구현.
- 데모 시드 냉장고와 200개 매칭 품질(메인 재료명이 마스터에 없을 수 있음) — 마스터 확장 필요분 점검.
- 검증: `tsc --noEmit`, `expo export --platform web`.
