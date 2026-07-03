# 냉장고한끼 V1.0 실제 앱 개발 지시서

## 0. 문서 목적

이 문서는 `냉장고한끼` 앱 V1.0을 실제 개발하기 위한 Claude 작업 지시서이다.

Claude는 이 문서를 기준으로 Flutter 앱을 구현한다.

중요 원칙:

- V1.0 범위만 구현한다.
- 기능을 임의로 확장하지 않는다.
- 서버 없이 로컬 DB 기반으로 구현한다.
- 사용자가 식재료를 하나하나 입력하지 않아도 시작할 수 있게 한다.
- 핵심은 `냉장고 빠른 세팅 → 냉장고 관리 → 요리추천 → 장보기 목록` 연결이다.

---

## 1. 프로젝트 기본 정보

### 앱 표시명

```text
냉장고한끼
```

### 영문 프로젝트/폴더명

```text
fridge-meal
```

### Flutter 프로젝트명

```text
fridge_meal
```

### 패키지명 예시

```text
com.doweb.fridgemeal
```

### 앱 한 줄 설명

```text
냉장고 속 식재료를 관리하고, 남은 재료로 만들 수 있는 요리와 장보기 목록을 알려주는 앱
```

---

## 2. V1.0 핵심 목표

V1.0의 목표는 완성형 냉장고 관리 앱이 아니다.

V1.0의 목표는 다음이다.

```text
사용자가 식재료를 하나하나 입력하지 않아도,
카테고리별 기본 식재료 세트를 선택해서 냉장고를 빠르게 만들고,
그 냉장고를 기준으로 오늘 만들 수 있는 요리와 장볼 재료를 확인할 수 있는 앱
```

사용자가 앱에서 해결해야 하는 핵심 질문은 3가지이다.

```text
1. 오늘 뭐 먹지?
2. 뭘 먼저 써야 하지?
3. 뭐 사야 하지?
```

따라서 화면도 이 질문에 답하는 구조여야 한다.

```text
홈 = 오늘 뭐 해야 하지?
냉장고 = 뭐가 남아 있지?
요리추천 = 뭐 만들어 먹지?
장보기 = 뭐 사야 하지?
```

---

## 3. V1.0 포함 기능

V1.0에 반드시 포함할 기능은 아래와 같다.

```text
1. 온보딩
2. 냉장고 빠른 세팅
3. 식생활 유형 선택
4. 기본 식재료 체크/해제
5. 빠진 식재료 추가
6. 냉장고 식재료 목록
7. 보관 위치별 필터
8. 식재료 등록/수정/삭제
9. 남은 정도 상태 변경
10. 유통기한 D-day 표시
11. 홈 대시보드
12. 요리추천 목록
13. 레시피 상세
14. 부족 재료 장보기 추가
15. 장보기 목록
16. 장보기 직접 추가
17. 구매 완료 체크
18. 구매 완료 후 냉장고에 추가
19. 설정
20. 데이터 초기화
```

---

## 4. V1.0 제외 기능

아래 기능은 V1.0에서 구현하지 않는다.

```text
회원가입
로그인
서버 API
클라우드 동기화
가족 공유
바코드 스캔
영수증 OCR
사진으로 식재료 인식
AI 레시피 생성
AI 추천
마트 가격 비교
온라인 주문 연동
영양 분석
칼로리 계산
식단 관리
커뮤니티
리뷰
쇼핑몰 연동
```

---

## 5. 추천 기술 스택

Flutter 기반으로 구현한다.

### 필수

```text
Flutter
Provider 기반 MVVM
SQLite 또는 Drift
shared_preferences
intl
```

### 선택

```text
flutter_local_notifications
```

V1.0에서는 알림 기능을 구조만 잡고 후순위로 구현해도 된다.

---

## 6. 전체 화면 구조

### 하단 탭

```text
홈
냉장고
요리추천
장보기
설정
```

### 최초 실행 전용 화면

```text
온보딩
냉장고 빠른 세팅
```

### 보조 화면

```text
식재료 등록/수정
레시피 상세
장보기 항목 추가
냉장고 추가 확인
```

---

## 7. 전체 사이트맵

```text
냉장고한끼
│
├─ 온보딩
│  ├─ 앱 소개
│  ├─ 주요 기능 안내
│  └─ 시작하기
│
├─ 냉장고 빠른 세팅
│  ├─ 식생활 유형 선택
│  ├─ 기본 식재료 체크/해제
│  ├─ 빠진 식재료 추가
│  └─ 냉장고 생성 완료
│
├─ 홈
│  ├─ 오늘 먼저 써야 할 재료
│  ├─ 지금 만들 수 있는 요리
│  ├─ 조금만 사면 가능한 요리
│  ├─ 장볼 재료 요약
│  └─ 냉장고 상태 요약
│
├─ 냉장고
│  ├─ 식재료 목록
│  ├─ 보관 위치 필터
│  ├─ 유통기한 임박순 정렬
│  ├─ 식재료 등록
│  ├─ 식재료 수정
│  └─ 식재료 삭제
│
├─ 요리추천
│  ├─ 바로 가능
│  ├─ 조금만 사면 가능
│  ├─ 임박 재료로 가능
│  ├─ 레시피 상세
│  └─ 부족 재료 장보기 추가
│
├─ 장보기
│  ├─ 자동 추천 목록
│  ├─ 직접 추가 목록
│  ├─ 구매 완료 체크
│  ├─ 냉장고에 추가
│  └─ 완료 목록
│
└─ 설정
   ├─ 알림 설정
   ├─ 냉장고 빠른 세팅 다시 하기
   ├─ 기본 식재료 관리
   ├─ 데이터 초기화
   └─ 앱 정보
```

---

## 8. 사용자 핵심 플로우

### 8.1 첫 사용 플로우

```text
앱 실행
→ 온보딩
→ 식생활 유형 선택
→ 기본 식재료 체크/해제
→ 빠진 식재료 추가
→ 냉장고 생성
→ 홈 진입
```

### 8.2 냉장고 확인 플로우

```text
홈
→ 오늘 먼저 써야 할 재료 확인
→ 냉장고 화면 이동
→ 식재료 상태 변경
→ 거의 없음 선택
→ 장보기 목록 추가
```

### 8.3 요리 추천 플로우

```text
홈
→ 지금 만들 수 있는 요리 선택
→ 레시피 상세
→ 부족 재료 확인
→ 장보기 목록 추가
```

### 8.4 장보기 후 냉장고 반영 플로우

```text
장보기 화면
→ 구매 완료 체크
→ 냉장고에 추가할까요?
→ 보관 위치/유통기한 입력
→ 냉장고 목록 반영
```

---

# 9. 화면별 상세 기획

---

## 9.1 온보딩 화면

### 목적

앱의 가치를 빠르게 전달한다.

### 온보딩 1

```text
냉장고 속 재료,
이제 잊지 마세요.

식재료를 등록하면
유통기한과 남은 재료를 쉽게 확인할 수 있어요.
```

### 온보딩 2

```text
있는 재료로
오늘의 한 끼를 추천해요.

지금 만들 수 있는 요리와
조금만 사면 가능한 요리를 알려드려요.
```

### 온보딩 3

```text
장보기 목록까지
자동으로 정리해요.

떨어진 재료와 부족한 재료를
한 번에 장보기 목록으로 모아보세요.
```

### 버튼

```text
냉장고 시작하기
```

---

## 9.2 냉장고 빠른 세팅 - 식생활 유형 선택

### 목적

사용자의 기본 냉장고 재료를 빠르게 불러오기 위한 화면이다.

### 카드 목록

```text
집밥 기본형
기본 반찬과 찌개를 자주 먹어요.

간단 자취형
간단하게 데워 먹거나 볶아 먹어요.

아이 있는 집
아이 반찬과 가족 식사를 자주 준비해요.

다이어트/건강식
단백질과 채소 위주로 먹어요.
```

### 선택 후 동작

선택한 유형에 맞는 기본 식재료 목록을 불러온다.

---

## 9.3 냉장고 빠른 세팅 - 기본 식재료 체크

### 목적

기본 식재료 중 실제 우리집에 있는 재료만 남긴다.

### 화면 예시

```text
우리집에 있는 재료만 남겨주세요.

단백질
☑ 계란
☑ 두부
☐ 닭가슴살
☐ 돼지고기

채소
☑ 대파
☑ 양파
☑ 마늘
☐ 감자
☐ 당근

양념/소스
☑ 간장
☑ 고추장
☑ 된장
☑ 참기름
```

### UX 원칙

```text
기본은 체크된 상태
사용자는 없는 재료만 해제
유통기한은 이 단계에서 필수 입력하지 않음
```

---

## 9.4 냉장고 빠른 세팅 - 빠진 재료 추가

### 목적

기본 세트에 없는 재료를 추가한다.

### 화면 예시

```text
빠진 재료가 있나요?

[식재료 검색 또는 직접 입력]

추천 재료
우유  치즈  콩나물  토마토  버섯  참치캔

[냉장고 만들기]
```

### 저장 기본값

```text
보관 위치: 식재료 기본값
남은 정도: 충분함
유통기한: 미입력
source_type: default_pack 또는 manual
```

---

## 9.5 냉장고 생성 완료 화면

### 목적

첫 세팅 완료 후 홈으로 이동시킨다.

### 화면 예시

```text
냉장고가 준비됐어요.

등록된 식재료 18개
바로 만들 수 있는 요리 6개
조금만 사면 가능한 요리 12개

[홈으로 가기]
```

---

## 9.6 홈 화면

### 목적

앱을 켰을 때 오늘 필요한 정보를 보여주는 대시보드이다.

### 홈 섹션

```text
1. 오늘 먼저 써야 할 재료
2. 지금 만들 수 있는 요리
3. 조금만 사면 가능한 요리
4. 장보기 요약
5. 냉장고 상태 요약
```

### 섹션 1. 오늘 먼저 써야 할 재료

```text
오늘 먼저 써야 할 재료

두부 D-1
대파 D-2
콩나물 D-2

[전체 보기]
```

### 섹션 2. 지금 만들 수 있는 요리

```text
지금 만들 수 있어요

김치볶음밥
가진 재료 5개 · 부족 재료 없음 · 15분

두부김치
가진 재료 3개 · 부족 재료 없음 · 10분

[요리추천 더보기]
```

### 섹션 3. 조금만 사면 가능한 요리

```text
조금만 사면 가능해요

김치찌개
부족 재료: 돼지고기

된장찌개
부족 재료: 애호박, 버섯
```

### 섹션 4. 장보기 요약

```text
장볼 재료 4개

대파
돼지고기
우유
고추장

[장보기 목록 보기]
```

---

## 9.7 냉장고 화면

### 목적

등록된 식재료를 확인하고 관리한다.

### 상단 구성

```text
냉장고

[+ 식재료 추가]

검색창
보관 위치 필터
정렬 옵션
```

### 필터

```text
전체
냉장
냉동
실온
양념/소스
기타
```

### 정렬

```text
유통기한 임박순
최근 등록순
이름순
남은 정도순
```

기본 정렬은 유통기한 임박순이다.

### 식재료 카드

```text
두부
냉장 · 조금 남음
유통기한 D-1

[상태 변경] [수정] [장보기]
```

### 상태 변경

```text
충분함 → 조금 남음 → 거의 없음 → 없음
```

`거의 없음` 또는 `없음`이 되면 장보기 목록 추가를 제안한다.

```text
두부가 거의 없어요.
장보기 목록에 추가할까요?
```

---

## 9.8 식재료 등록/수정 화면

### 필드

```text
식재료명
카테고리
보관 위치
남은 정도
유통기한
메모
```

### 필수값

```text
식재료명
보관 위치
남은 정도
```

### 선택값

```text
카테고리
유통기한
메모
```

유통기한은 필수로 하지 않는다.

---

## 9.9 요리추천 화면

### 목적

현재 냉장고 재료 기준으로 만들 수 있는 요리를 보여준다.

### 상단 탭

```text
바로 가능
조금만 사면 가능
임박 재료로 가능
```

### 바로 가능 조건

부족 재료가 0개인 레시피.

### 조금만 사면 가능 조건

부족 재료가 1~2개인 레시피.

### 임박 재료로 가능 조건

유통기한이 가까운 재료를 포함한 레시피.

### 카드 예시

```text
김치볶음밥

15분 · 쉬움
가진 재료 5개
부족 재료 없음

[레시피 보기]
```

```text
김치찌개

25분 · 보통
가진 재료 4개
부족 재료 1개: 돼지고기

[부족 재료 장보기 추가]
[레시피 보기]
```

---

## 9.10 레시피 상세 화면

### 구성

```text
요리명
소요 시간
난이도
추천 이유
필요 재료
내가 가진 재료
부족한 재료
만드는 방법
장보기 목록 추가 버튼
```

### 예시

```text
김치볶음밥

15분 · 쉬움

추천 이유
냉장고에 있는 김치와 밥을 바로 활용할 수 있어요.

필요 재료
김치, 밥, 계란, 대파, 참기름

내가 가진 재료
김치, 밥, 계란, 대파

부족한 재료
참기름

만드는 방법
1. 대파를 잘게 썰어요.
2. 팬에 기름을 두르고 대파를 볶아요.
3. 김치와 밥을 넣고 볶아요.
4. 계란을 올려 마무리해요.

[부족 재료 장보기 추가]
```

---

## 9.11 장보기 화면

### 목적

부족한 재료와 직접 추가한 재료를 구매 목록으로 관리한다.

### 구성

```text
장보기

[+ 직접 추가]

자동 추천
직접 추가
구매 완료
```

### 자동 추천 예시

```text
자동 추천

대파
냉장고에서 거의 없음

돼지고기
김치찌개에 필요해요

고추장
기본 양념 재료
```

### 직접 추가 예시

```text
직접 추가

우유
식빵
과일
```

### 구매 완료

체크한 항목은 완료 영역으로 이동한다.

```text
구매 완료

두부
계란
```

---

## 9.12 장보기 완료 후 냉장고 추가

### 목적

장보기 목록과 냉장고 재고를 연결한다.

### 팝업 예시

```text
두부를 냉장고에 추가할까요?

보관 위치: 냉장
남은 정도: 충분함
유통기한: 선택 입력

[냉장고에 추가]
[나중에]
```

이 기능은 중요하다.  
장보기와 냉장고 데이터가 이어져야 앱이 반복 사용된다.

---

## 9.13 설정 화면

### 메뉴

```text
알림 설정
냉장고 빠른 세팅 다시 하기
기본 식재료 관리
레시피 데이터 정보
데이터 초기화
앱 정보
문의하기
```

### 빠른 세팅 다시 하기

기존 냉장고 데이터를 덮어쓰면 안 된다.

선택지를 제공한다.

```text
기존 냉장고에 추가하기
기존 냉장고를 초기화하고 새로 세팅하기
```

기본값은 기존 냉장고에 추가하기이다.

---

# 10. V1.0 프리셋 데이터

## 10.1 식생활 유형

```text
home_basic: 집밥 기본형
single_simple: 간단 자취형
kids_family: 아이 있는 집
diet_health: 다이어트/건강식
```

---

## 10.2 집밥 기본형

```text
계란
두부
대파
양파
마늘
김치
밥
고추장
된장
간장
참기름
식용유
감자
당근
애호박
돼지고기
참치캔
```

---

## 10.3 간단 자취형

```text
계란
밥
라면
김치
참치캔
스팸
냉동만두
대파
양파
식용유
간장
고추장
치즈
우유
식빵
```

---

## 10.4 아이 있는 집

```text
계란
우유
치즈
두부
소고기
닭고기
당근
감자
양파
애호박
브로콜리
김
밥
간장
참기름
사과
바나나
요거트
```

---

## 10.5 다이어트/건강식

```text
닭가슴살
계란
두부
양상추
오이
방울토마토
브로콜리
고구마
현미밥
그릭요거트
아몬드
참치캔
두유
양배추
버섯
```

---

# 11. 데이터베이스 설계

로컬 DB는 SQLite 또는 Drift를 사용한다.

---

## 11.1 ingredient_preset_packs

```sql
CREATE TABLE ingredient_preset_packs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);
```

---

## 11.2 ingredient_preset_items

```sql
CREATE TABLE ingredient_preset_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_code TEXT NOT NULL,
  ingredient_name TEXT NOT NULL,
  category TEXT NOT NULL,
  default_storage TEXT NOT NULL,
  default_stock_level TEXT NOT NULL DEFAULT 'enough',
  default_expire_days INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

---

## 11.3 fridge_items

```sql
CREATE TABLE fridge_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_name TEXT NOT NULL,
  category TEXT,
  storage_type TEXT NOT NULL,
  stock_level TEXT NOT NULL,
  expire_date TEXT,
  memo TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### storage_type

```text
refrigerated
frozen
room_temp
sauce
etc
```

### stock_level

```text
enough
low
very_low
empty
```

### source_type

```text
manual
default_pack
shopping
recipe_missing
```

---

## 11.4 recipes

```sql
CREATE TABLE recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  cook_time INTEGER,
  difficulty TEXT,
  image_url TEXT,
  source_type TEXT,
  source_url TEXT,
  created_at TEXT NOT NULL
);
```

---

## 11.5 recipe_ingredients

```sql
CREATE TABLE recipe_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL,
  ingredient_name TEXT NOT NULL,
  is_required INTEGER DEFAULT 1,
  amount_text TEXT,
  FOREIGN KEY(recipe_id) REFERENCES recipes(id)
);
```

---

## 11.6 recipe_steps

```sql
CREATE TABLE recipe_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL,
  step_order INTEGER NOT NULL,
  content TEXT NOT NULL,
  FOREIGN KEY(recipe_id) REFERENCES recipes(id)
);
```

---

## 11.7 shopping_items

```sql
CREATE TABLE shopping_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingredient_name TEXT NOT NULL,
  category TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_ref_id INTEGER,
  is_checked INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### shopping_items.source_type

```text
manual
low_stock
recipe_missing
expired
```

---

# 12. Flutter 모델 설계

## 12.1 IngredientPresetPack

```dart
class IngredientPresetPack {
  final int? id;
  final String code;
  final String name;
  final String? description;
  final int sortOrder;
  final bool isActive;

  const IngredientPresetPack({
    this.id,
    required this.code,
    required this.name,
    this.description,
    required this.sortOrder,
    required this.isActive,
  });
}
```

---

## 12.2 IngredientPresetItem

```dart
class IngredientPresetItem {
  final int? id;
  final String packCode;
  final String ingredientName;
  final String category;
  final String defaultStorage;
  final String defaultStockLevel;
  final int? defaultExpireDays;
  final int sortOrder;

  const IngredientPresetItem({
    this.id,
    required this.packCode,
    required this.ingredientName,
    required this.category,
    required this.defaultStorage,
    required this.defaultStockLevel,
    this.defaultExpireDays,
    required this.sortOrder,
  });
}
```

---

## 12.3 FridgeItem

```dart
class FridgeItem {
  final int? id;
  final String ingredientName;
  final String? category;
  final String storageType;
  final String stockLevel;
  final String? expireDate;
  final String? memo;
  final String sourceType;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  const FridgeItem({
    this.id,
    required this.ingredientName,
    this.category,
    required this.storageType,
    required this.stockLevel,
    this.expireDate,
    this.memo,
    required this.sourceType,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });
}
```

---

## 12.4 Recipe

```dart
class Recipe {
  final int? id;
  final String title;
  final String? description;
  final int? cookTime;
  final String? difficulty;
  final String? imageUrl;
  final String? sourceType;
  final String? sourceUrl;
  final DateTime createdAt;

  const Recipe({
    this.id,
    required this.title,
    this.description,
    this.cookTime,
    this.difficulty,
    this.imageUrl,
    this.sourceType,
    this.sourceUrl,
    required this.createdAt,
  });
}
```

---

## 12.5 RecipeIngredient

```dart
class RecipeIngredient {
  final int? id;
  final int recipeId;
  final String ingredientName;
  final bool isRequired;
  final String? amountText;

  const RecipeIngredient({
    this.id,
    required this.recipeId,
    required this.ingredientName,
    required this.isRequired,
    this.amountText,
  });
}
```

---

## 12.6 RecipeStep

```dart
class RecipeStep {
  final int? id;
  final int recipeId;
  final int stepOrder;
  final String content;

  const RecipeStep({
    this.id,
    required this.recipeId,
    required this.stepOrder,
    required this.content,
  });
}
```

---

## 12.7 ShoppingItem

```dart
class ShoppingItem {
  final int? id;
  final String ingredientName;
  final String? category;
  final String sourceType;
  final int? sourceRefId;
  final bool isChecked;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ShoppingItem({
    this.id,
    required this.ingredientName,
    this.category,
    required this.sourceType,
    this.sourceRefId,
    required this.isChecked,
    required this.createdAt,
    required this.updatedAt,
  });
}
```

---

# 13. 레시피 추천 로직

V1.0에서는 AI를 사용하지 않는다.  
로컬 레시피 DB 기반 룰 매칭을 사용한다.

## 13.1 기본 매칭

```text
레시피 필요 재료 중 현재 냉장고에 있는 재료 수 계산
부족한 필수 재료 수 계산
유통기한 임박 재료 포함 여부 계산
```

## 13.2 분류 기준

```text
부족 재료 0개 → 바로 가능
부족 재료 1~2개 → 조금만 사면 가능
유통기한 임박 재료 포함 → 임박 재료로 가능
```

## 13.3 추천 점수 예시

```text
추천 점수 =
보유 재료 수 × 10
- 부족한 필수 재료 수 × 15
+ 유통기한 임박 재료 포함 수 × 20
- 조리시간 패널티
```

## 13.4 조리시간 패널티

```text
10분 이하: 0
20분 이하: -3
30분 이하: -5
30분 초과: -10
```

---

# 14. 초기 레시피 데이터 예시

V1.0에서는 최소 20개 레시피를 시드 데이터로 넣는다.  
실제 개발 중 확장 가능하게 구조를 만든다.

```text
김치볶음밥
계란볶음밥
계란국
두부김치
두부조림
김치찌개
된장찌개
콩나물국
감자조림
오므라이스
카레
제육볶음
닭볶음탕
참치마요덮밥
비빔밥
라면 응용요리
냉동만두국
김치전
계란말이
참치김치찌개
```

---

# 15. Flutter 폴더 구조

과도한 클린 아키텍처는 피한다.  
Provider MVVM 기반으로 기능별 구조를 사용한다.

```text
lib/
 ├─ main.dart
 ├─ app.dart
 │
 ├─ core/
 │   ├─ constants/
 │   │   ├─ app_constants.dart
 │   │   ├─ storage_types.dart
 │   │   └─ stock_levels.dart
 │   ├─ theme/
 │   │   └─ app_theme.dart
 │   ├─ utils/
 │   │   ├─ date_utils.dart
 │   │   └─ d_day_utils.dart
 │   └─ widgets/
 │       ├─ app_button.dart
 │       ├─ app_empty_state.dart
 │       ├─ app_section_title.dart
 │       └─ app_chip.dart
 │
 ├─ data/
 │   ├─ local/
 │   │   ├─ app_database.dart
 │   │   ├─ preset_dao.dart
 │   │   ├─ fridge_dao.dart
 │   │   ├─ recipe_dao.dart
 │   │   └─ shopping_dao.dart
 │   ├─ models/
 │   │   ├─ ingredient_preset_pack.dart
 │   │   ├─ ingredient_preset_item.dart
 │   │   ├─ fridge_item.dart
 │   │   ├─ recipe.dart
 │   │   ├─ recipe_ingredient.dart
 │   │   ├─ recipe_step.dart
 │   │   └─ shopping_item.dart
 │   └─ repositories/
 │       ├─ preset_repository.dart
 │       ├─ fridge_repository.dart
 │       ├─ recipe_repository.dart
 │       └─ shopping_repository.dart
 │
 ├─ features/
 │   ├─ onboarding/
 │   │   ├─ onboarding_page.dart
 │   │   └─ onboarding_view_model.dart
 │   │
 │   ├─ quick_setup/
 │   │   ├─ quick_setup_page.dart
 │   │   ├─ quick_setup_view_model.dart
 │   │   └─ widgets/
 │   │       ├─ preset_pack_card.dart
 │   │       ├─ preset_item_check_tile.dart
 │   │       └─ add_missing_ingredient_box.dart
 │   │
 │   ├─ home/
 │   │   ├─ home_page.dart
 │   │   ├─ home_view_model.dart
 │   │   └─ widgets/
 │   │       ├─ expiring_items_section.dart
 │   │       ├─ available_recipes_section.dart
 │   │       └─ shopping_summary_section.dart
 │   │
 │   ├─ fridge/
 │   │   ├─ fridge_page.dart
 │   │   ├─ fridge_view_model.dart
 │   │   └─ widgets/
 │   │       ├─ fridge_item_card.dart
 │   │       ├─ storage_filter_bar.dart
 │   │       └─ stock_level_selector.dart
 │   │
 │   ├─ ingredient_form/
 │   │   ├─ ingredient_form_page.dart
 │   │   └─ ingredient_form_view_model.dart
 │   │
 │   ├─ recipes/
 │   │   ├─ recipe_recommend_page.dart
 │   │   ├─ recipe_recommend_view_model.dart
 │   │   └─ widgets/
 │   │       ├─ recipe_card.dart
 │   │       └─ recipe_category_tabs.dart
 │   │
 │   ├─ recipe_detail/
 │   │   ├─ recipe_detail_page.dart
 │   │   └─ recipe_detail_view_model.dart
 │   │
 │   ├─ shopping/
 │   │   ├─ shopping_page.dart
 │   │   ├─ shopping_view_model.dart
 │   │   └─ widgets/
 │   │       ├─ shopping_item_tile.dart
 │   │       └─ add_to_fridge_dialog.dart
 │   │
 │   └─ settings/
 │       ├─ settings_page.dart
 │       └─ settings_view_model.dart
```

---

# 16. Provider MVVM 규칙

## 16.1 View

- UI 렌더링만 담당한다.
- DB를 직접 호출하지 않는다.
- Repository를 직접 호출하지 않는다.
- 사용자 이벤트는 ViewModel에 위임한다.

## 16.2 ViewModel

- 화면 상태를 관리한다.
- 사용자 액션을 처리한다.
- Repository를 호출한다.
- `ChangeNotifier`를 사용한다.
- 로딩/에러/빈 상태를 관리한다.

## 16.3 Repository

- 데이터 접근을 추상화한다.
- DAO를 호출한다.
- 여러 DAO를 조합한 비즈니스 로직을 처리할 수 있다.

## 16.4 DAO

- 실제 SQLite/Drift 쿼리를 담당한다.

---

# 17. 상태 관리 기본 구조

각 ViewModel은 아래 상태를 관리한다.

```dart
bool isLoading;
String? errorMessage;
```

리스트 화면은 빈 상태를 반드시 처리한다.

```text
냉장고에 등록된 재료가 없어요.
빠른 세팅으로 냉장고를 만들어볼까요?
```

---

# 18. 개발 우선순위

아래 순서로 개발한다.

```text
1. Flutter 프로젝트 생성 및 기본 구조 세팅
2. Theme / 공통 위젯 / 하단 탭 구성
3. 로컬 DB 및 DAO 작성
4. 프리셋 시드 데이터 작성
5. 온보딩 구현
6. 냉장고 빠른 세팅 구현
7. 냉장고 목록 구현
8. 식재료 등록/수정/삭제 구현
9. 장보기 목록 구현
10. 초기 레시피 시드 데이터 작성
11. 레시피 추천 로직 구현
12. 요리추천 화면 구현
13. 레시피 상세 화면 구현
14. 홈 대시보드 구현
15. 설정 화면 구현
16. 예외 처리 / 빈 상태 / UI 마감
```

---

# 19. 디자인 방향

## 톤

```text
깔끔함
따뜻함
실용적
가정적인
복잡하지 않음
```

## 컬러

```text
메인 컬러: 따뜻한 그린
보조 컬러: 크림 화이트
강조 컬러: 오렌지 또는 옐로우
위험/임박: 코랄 레드
텍스트: 진한 회색
```

## 피해야 할 느낌

```text
마트 앱처럼 너무 상업적
관리자 페이지처럼 데이터 위주
영양관리 앱처럼 너무 딱딱함
레시피 앱처럼 음식 사진만 강조
```

---

# 20. UX 원칙

```text
1. 첫 냉장고 세팅은 3분 안에 끝나야 한다.
2. 식재료 등록은 10초 안에 끝나야 한다.
3. 유통기한은 필수가 아니다.
4. 수량은 정확한 숫자보다 단계형으로 시작한다.
5. 홈에서는 오늘 필요한 행동만 보여준다.
6. 장보기 완료 후 냉장고에 반영하는 흐름이 반드시 있어야 한다.
7. 사용자가 직접 입력하는 양을 최소화한다.
8. V1.0에서는 정확성보다 반복 사용성을 우선한다.
```

---

# 21. Claude 작업 요청 방식

Claude는 이 문서를 기준으로 아래 순서로 작업한다.

```text
1. 전체 구현 계획 요약
2. 사용할 Flutter 패키지 제안
3. pubspec.yaml 작성
4. 폴더 구조 작성
5. 모델 클래스 작성
6. DB/DAO 작성
7. Repository 작성
8. ViewModel 작성
9. 각 화면 UI 작성
10. 추천 알고리즘 작성
11. 시드 데이터 작성
12. 리팩토링 및 예외 처리
```

코드는 파일 단위로 제공한다.

각 파일은 실제 Flutter 프로젝트에 바로 붙여넣을 수 있어야 한다.

V1.0 범위를 벗어나는 기능은 제안만 하고 구현하지 않는다.

---

# 22. Claude에게 전달할 첫 요청 문장

아래 문장을 Claude에게 함께 전달한다.

```text
위 문서를 기준으로 냉장고한끼(fridge-meal) V1.0 Flutter 앱을 구현하려고 한다.
Provider MVVM 구조와 로컬 DB 기반으로 개발해줘.
먼저 전체 구현 계획과 패키지 구성을 제안하고,
이후 파일 단위로 실제 코드를 작성해줘.
V1.0 범위를 벗어나는 OCR, AI, 로그인, 서버 기능은 구현하지 마.
```

---

# 23. V1.0 완료 기준

V1.0은 아래가 되면 완료로 본다.

```text
1. 앱 첫 실행 시 온보딩이 표시된다.
2. 사용자가 식생활 유형을 선택할 수 있다.
3. 기본 식재료를 체크/해제할 수 있다.
4. 빠진 식재료를 추가할 수 있다.
5. 냉장고 목록이 생성된다.
6. 식재료를 등록/수정/삭제할 수 있다.
7. 식재료의 남은 정도를 변경할 수 있다.
8. 유통기한 D-day가 표시된다.
9. 냉장고 재료 기준으로 레시피가 분류된다.
10. 부족 재료가 표시된다.
11. 부족 재료를 장보기 목록에 추가할 수 있다.
12. 장보기 항목을 체크 완료할 수 있다.
13. 구매 완료한 재료를 냉장고에 추가할 수 있다.
14. 홈 화면에서 임박 재료, 가능한 요리, 장보기 요약이 표시된다.
```
