# 재료기반 요리추천 — "메인 1개 부족" tier 추가 설계

- 날짜: 2026-07-03
- 대상: `app/src/data/recommend.ts`, `app/src/screens/RecipeListScreen.tsx`
- 브랜치: `feat/ingredient-based-recipes`

## 배경

재료기반 요리추천의 핵심 원칙:

1. **메인 재료 100% 보유** 메뉴를 최상단에 보여준다. (구현됨)
2. 그다음 **메인 재료 딱 1개 부족** 메뉴를 "재료 1개만 더 있으면 가능"으로 보여준다. (미구현)

현재 `recommend.ts`는 메인이 1개라도 빠지면 `score = 0`으로 처리해 "메인 재료 부족"이라는 하나의 최하단 버킷에 뭉뚱그린다. 스펙의 2번(중간 tier)이 표면에 드러나지 않는다.

## 결정 사항

- **범위**: 리스트 화면(`RecipeListScreen`)만 이번에 반영. `HomeScreen` 섹션 추가는 제외(YAGNI).
- **정렬**: "메인 1개 부족"은 서브 완비 여부와 무관하게 **항상 "메인 전부" 그룹 아래, "메인 2개+ 부족" 위**.
- **범위 밖**: `recipes.json`의 `seasonings/cookTimeMinutes/difficulty/tags` 데이터 채우기는 별도 작업.

## 설계

### 1. `recommend.ts` — 점수 등급 + 버킷 헬퍼

기존 점수식:

```ts
const score = Math.round((recommendable ? 1000 : 0) + subCov * 100 + mainCov * 50 + (usesNear ? 10 : 0));
```

중간 등급을 하나 추가한다. 기저값으로 세 구간이 절대 겹치지 않게 한다:

- 메인 전부 보유: `1000` + (subCov·mainCov·near 세부 정렬)
- 메인 1개 부족: `400` + (세부 정렬)
- 메인 2개+ 부족: `0` + (세부 정렬)

세부 정렬 최댓값(subCov*100 + mainCov*50 + near*10 = 160)이 기저 간격(600, 400)보다 작으므로 구간이 뒤섞이지 않는다.

```ts
const base = recommendable ? 1000 : missingMain.length === 1 ? 400 : 0;
const score = Math.round(base + subCov * 100 + mainCov * 50 + (usesNear ? 10 : 0));
```

버킷 헬퍼 신설(기존 `isReady`/`needsSub`와 같은 위치):

```ts
// 메인 1개만 부족 = 재료 1개만 더 있으면 가능.
export const needsOneMain = (m: RecipeMatch) => !m.recommendable && m.missingMain.length === 1;
```

`isReady`, `needsSub`는 그대로 둔다(메인 전부 보유 전제라 영향 없음).

### 2. `RecipeListScreen.tsx` — 카드 라벨 4단계

현재 `RecipeCard`의 상태 계산(라벨/색/부족칩)이 `recommendable` 기준 2분기다. 4단계로 확장:

| 조건 | 라벨 | 색 | 부족 칩 |
|------|------|-----|---------|
| `isReady` | 바로 가능 | primary(초록) | 없음 |
| `recommendable && !isReady` | 재료 N개 더 있으면 완성 | accentDark | `missingSub` |
| `needsOneMain` | **재료 1개만 더 있으면 가능** | accentDark | `missingMain` (그 1개) |
| 그 외 (메인 2개+ 부족) | 메인 재료 부족 | inkAsst | `missingMain` |

- `missing` 칩 목록: `recommendable`이면 `missingSub`, 아니면 `missingMain` — 기존 로직 그대로 두면 `needsOneMain`/그 외 모두 `missingMain`을 보여주므로 자연히 맞다.
- 색 스타일: `needsOneMain`도 `statusAlmost`(accentDark) 사용 → "거의 가능" 느낌을 메인 부족 케이스와 구분.
- 상태 배경(`statusBg`)도 `needsOneMain`이면 `accentBg`를 쓰도록 분기 추가(현재는 `recommendable`만 accent).

`import`에 `needsOneMain` 추가.

## 데이터 흐름

`matchAll` → 각 레시피 `matchRecipe`로 `score` 계산 → score 내림차순 정렬. 정렬 결과가 자동으로 [메인전부] → [메인1개부족] → [메인2개+부족] 순서가 된다. 리스트 화면은 정렬된 결과를 그대로 렌더하고, 카드가 자기 상태에 맞는 라벨만 고른다. 별도 그룹 헤더는 넣지 않는다(현행 UI 유지).

## 검증

- `matchRecipe` 단위 검증: 냉장고 재료 조합별로 (메인 전부 / 메인 1개 부족 / 메인 2개 부족) 각 케이스의 `score` 구간과 `needsOneMain` 값 확인.
- 정렬 검증: 세 등급이 섞이지 않는지(구간 경계) 확인.
- 웹 빌드(`npx expo start --web` 또는 tsc)로 타입/렌더 확인 후 브라우저에서 라벨 노출 육안 확인.

## 영향 없음(회귀 주의)

- `HomeScreen`의 `isReady`/`needsSub` 필터는 메인 전부 보유 전제라 동작 불변.
- `RecipeDetailScreen`, `store.ts`, `QuickSetupScreen`은 `RecipeMatch` 구조를 바꾸지 않으므로 영향 없음(필드 추가 없음).
