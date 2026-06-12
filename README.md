# 냉장고비서 (fridge-meal) — V1.0 데모/시안

냉장고 식재료를 관리하고, 남은 재료로 만들 수 있는 요리와 장보기 목록을 알려주는 앱.
[개발 지시서](../docs/fridge_meal_v1_app_development_spec.md)와 [벤치마킹 문서](../docs/fridge_meal_benchmark_refrigerator_teolgi.md)를 기준으로 한 동작하는 UI 시안입니다.

## 기술 스택
- **React Native + Expo (TypeScript)** — 한 코드로 iOS·Android·웹, 데모 미리보기에 최적
- **Pretendard** 폰트, **Phosphor** 아이콘
- 디자인 토큰은 `src/theme/tokens.ts` (따뜻한 그린 + 크림 — 지시서 §19 디자인 방향)

> 참고: 개발 지시서는 Flutter 기준이지만, "데모를 보며 UX/UI를 다듬는다"는 목적에 맞춰 빠른 미리보기가 가능한 Expo로 시안을 만들었습니다. 정식 개발 시 Flutter로 옮기거나 이대로 Expo로 출시하는 선택 모두 가능합니다.

## 화면 (V1.0 전체 흐름)
| 구분 | 화면 | 파일 |
|---|---|---|
| 진입 | 온보딩 3단계 | `OnboardingScreen` |
| 진입 | 빠른 세팅 (유형→체크→추가→완료) | `QuickSetupScreen` |
| 탭 | 홈 대시보드 | `HomeScreen` |
| 탭 | 냉장고 (필터·정렬·상태변경·삭제) | `FridgeScreen` |
| 탭 | 요리추천 (바로/조금만/임박 탭) | `RecipeListScreen` |
| 탭 | 장보기 (자동·직접·완료 + 입고) | `ShoppingScreen` |
| 탭 | 설정 | `SettingsScreen` |
| 오버레이 | 레시피 상세 | `RecipeDetailScreen` |
| 오버레이 | 식재료 등록/수정 | `IngredientFormScreen` |

벤치마킹 반영: 유통기한 임박순 정렬, 보관 위치 필터, 가진/부족 재료 구분, 룰 기반 추천(§13), 장보기 완료 → 냉장고 입고 흐름.

## 실행
```bash
cd app
npm install      # 처음 한 번
npm run web      # 브라우저 미리보기 (http://localhost:8081)
# 또는
npm start        # QR 스캔 → 폰의 Expo Go 앱에서 미리보기
```

## 데이터
`src/data/store.ts` 의 인메모리 상태(목업)를 사용합니다. 화면 간 상호작용(상태 변경·장보기 체크·입고)이 실제로 반영돼요.
정식 버전에서는 SQLite/Drift(지시서 §11) 로 교체하면 됩니다.

## 폴더
```
app/
  App.tsx                 # 페이즈 라우팅 + 탭 + 오버레이 + 폰 프레임
  src/
    theme/                # tokens(색·반경), fonts(Pretendard)
    data/                 # constants(카테고리·보관·재고), store(상태·레시피 매칭)
    navigation/nav.tsx    # 페이즈/탭/오버레이 네비게이션
    components/           # Icon, TabBar, ui(타일·배지·버튼 등)
    screens/              # 9개 화면
```
