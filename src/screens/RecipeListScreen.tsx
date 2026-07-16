// 요리추천 — 전체 / 국·찌개 / 반찬 / 메인 / 간편. 메인 전부 보유가 추천 상단.
// 목록은 한 줄에 2개씩 놓이는 사진 카드(사진 + 요리명). 냉장고 매칭 상태는 사진 위 배지로만 알린다.
import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, TextInput, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { useApp, matchAll, matchRecipe } from '../data/store';
import { RECIPE_CATEGORIES, RecipeMatch, isReady, recipeUsesIngredient } from '../data/recommend';
import { recipeImage } from '../data/recipeImages';
import { recipeCategoryEmoji } from '../data/constants';
import { HeaderActions, emojiFont, DifficultyStars } from '../components/ui';
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
  // 검색 — 냉장고 매칭과 무관하게 이름으로 전체 레시피에서 찾는다.
  const q = query.trim();
  const results = q ? recipes.filter((r) => r.name.includes(q)).slice(0, 60).map((r) => matchRecipe(r, fridge)) : [];
  // 재료 필터 — 곳간 '이 재료로 요리 보기'로 들어오면 그 재료가 든 요리만(검색 중이 아닐 때).
  const focus = nav.recipeFocus;
  const focusList = focus ? all.filter((m) => recipeUsesIngredient(m.recipe, focus)) : [];

  const goTab = (i: number) => {
    setTab(i);
    pagerRef.current?.scrollTo({ x: i * w, animated: true });
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (w > 0) {
      const i = Math.round(e.nativeEvent.contentOffset.x / w);
      if (i !== tab) setTab(i);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>오늘 뭐 먹지?</Text>
          <Text style={s.sub}>냉장고 재료로 만들 수 있는 요리예요</Text>
        </View>
        <HeaderActions showBell={false} searchActive={searchOpen} onSearch={() => setSearchOpen((o) => { if (o) setQuery(''); return !o; })} />
      </View>

      {searchOpen && (
        <View style={s.searchRow}>
          <Icon name="search" size={18} color={colors.inkAsst} />
          <TextInput value={query} onChangeText={setQuery} placeholder="레시피 이름 검색" placeholderTextColor={colors.inkAsst} style={s.search} autoFocus />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}><Icon name="x" size={16} color={colors.inkAsst} weight="bold" /></Pressable>
          )}
        </View>
      )}

      {q ? (
        /* 검색 결과 — 전체 레시피에서 이름 일치 */
        <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
          <View style={s.list}>
            {results.map((m) => (
              <RecipeCard key={m.recipe.menuId} m={m} onOpen={() => nav.openRecipe(m.recipe.menuId)} />
            ))}
          </View>
          {results.length === 0 && <Text style={s.empty}>'{q}' 검색 결과가 없어요.</Text>}
        </ScrollView>
      ) : focus ? (
        /* 재료 필터 — 그 재료가 든 요리만, 매칭 점수순(바로 가능 우선) */
        <>
          <View style={s.focusBar}>
            <Icon name="fork-knife" size={15} color={colors.primary} weight="fill" />
            <Text style={s.focusText} numberOfLines={1}>‘{focus}’ 들어간 요리 {focusList.length}개</Text>
            <Pressable onPress={() => nav.clearRecipeFocus()} hitSlop={8} style={s.focusClear}>
              <Text style={s.focusClearText}>전체 보기</Text>
              <Icon name="x" size={13} color={colors.inkAlt} weight="bold" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
            <View style={s.list}>
              {focusList.map((m) => (
                <RecipeCard key={m.recipe.menuId} m={m} onOpen={() => nav.openRecipe(m.recipe.menuId)} />
              ))}
            </View>
            {focusList.length === 0 && <Text style={s.empty}>‘{focus}’ 들어간 요리가 아직 없어요.</Text>}
          </ScrollView>
        </>
      ) : (<>
      {/* 탭 — 전체 / 국·찌개 / 반찬 / 메인 / 간편. 알약 칩(선택 시 검정 채움), 가로 스크롤. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsWrap} contentContainerStyle={s.tabs}>
        {TABS.map((label, i) => {
          const on = i === tab;
          return (
            <Pressable key={label} style={[s.tabChip, on && s.tabChipOn]} onPress={() => goTab(i)}>
              <Text style={[s.tabChipText, on && s.tabChipTextOn]} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 좌우 스와이프 페이지 */}
      <View style={{ flex: 1 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {TABS.map((label, i) => {
              const list = listFor(i);
              return (
                <ScrollView key={label} style={{ width: w }} contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
                  <View style={s.list}>
                    {list.map((m) => (
                      <RecipeCard
                        key={m.recipe.menuId}
                        m={m}
                        onOpen={() => nav.openRecipe(m.recipe.menuId)}
                      />
                    ))}
                  </View>
                  {list.length === 0 && <Text style={s.empty}>해당하는 요리가 아직 없어요.</Text>}
                </ScrollView>
              );
            })}
          </ScrollView>
        )}
      </View>
      </>)}
    </View>
  );
}

/** 가로 리스트 행 — 왼쪽 사진, 오른쪽에 요리명·정보·상태 배지. (배지는 사진 위에 올리지 않는다) */
function RecipeCard({ m, onOpen }: { m: RecipeMatch; onOpen: () => void }) {
  const img = recipeImage(m.recipe.menuId);
  // 상태 — 바로 가능 / 재료 3/5(보유·전체). 홈 '내 재료 5/5'와 같은 기준(양념 제외).
  const have = m.matchedMain + m.matchedSub;
  const total = m.totalMain + m.totalSub;
  const matchLabel = isReady(m) ? '바로 가능' : `재료 ${have}/${total}`;

  return (
    <Pressable style={s.card} onPress={onOpen}>
      <View style={s.thumbWrap}>
        {img ? (
          <Image source={img} style={s.thumb} resizeMode="cover" />
        ) : (
          <View style={[s.thumb, s.thumbFallback]}>
            <Text style={[s.thumbEmoji, emojiFont]}>{recipeCategoryEmoji(m.recipe.category)}</Text>
          </View>
        )}
      </View>
      <View style={s.info}>
        <Text style={s.cardTitle} numberOfLines={2}>{m.recipe.name}</Text>
        {/* 카테고리 · 조리시간 · 난이도(별점) */}
        <View style={s.metaRow}>
          <Text style={s.metaText}>
            {[m.recipe.category, m.recipe.cookTimeMinutes ? `${m.recipe.cookTimeMinutes}분` : null].filter(Boolean).join(' · ')}
          </Text>
          {!!m.recipe.difficulty && (
            <>
              <Text style={s.metaText}> · </Text>
              <DifficultyStars difficulty={m.recipe.difficulty} size={14} />
            </>
          )}
        </View>
        <View style={s.tagRow}>
          <Text style={s.matchText}>{matchLabel}</Text>
          {m.usesNearExpiry && (
            <View style={s.nearTag}>
              <Icon name="flame" size={12} color={colors.nearFg} weight="fill" />
              <Text style={s.nearText}>임박재료</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  sub: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAlt, marginTop: 5 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 14 },
  search: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink, paddingVertical: 11 },

  // 재료 필터 배너 ('이 재료로 요리 보기'로 진입 시)
  focusBar: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 20, marginTop: 4, marginBottom: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.primaryBg },
  focusText: { flex: 1, fontFamily: font.bold, fontSize: 13.5, color: colors.primaryDark },
  focusClear: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingLeft: 6 },
  focusClearText: { fontFamily: font.bold, fontSize: 12.5, color: colors.inkAlt },

  // 탭 — 알약 칩(선택 시 검정 채움). 가로 스크롤이라 카테고리가 늘어도 안전.
  tabsWrap: { flexGrow: 0, flexShrink: 0 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 },
  tabChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.fill },
  tabChipOn: { backgroundColor: colors.ink },
  tabChipText: { fontFamily: font.bold, fontSize: 14.5, color: colors.inkAlt },
  tabChipTextOn: { color: colors.white },

  // 리스트 — 가로 행(왼쪽 사진 + 오른쪽 정보/배지). 당근마켓·스타벅스 스타일.
  page: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20 },
  list: {},
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },

  thumbWrap: { width: 88, height: 88, borderRadius: radius.lg, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%', backgroundColor: colors.fill },
  thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryBg },
  thumbEmoji: { fontSize: 40, lineHeight: 50, textAlign: 'center' },

  // 오른쪽 정보 영역 — 요리명 · 카테고리·시간 · 상태 배지
  info: { flex: 1, gap: 5 },
  cardTitle: { fontFamily: font.extrabold, fontSize: 17.5, color: colors.ink, letterSpacing: -0.3, lineHeight: 23 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAsst },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },

  // 상태 — 알약 대신 초록 텍스트 (바로 가능 / 재료 3/5). 밝은 로고 그린보다 한 톤 어둡게.
  matchText: { fontFamily: font.extrabold, fontSize: 14, color: colors.primaryDark, letterSpacing: -0.2 },
  // 임박재료 — 상세페이지의 임박 칩과 동일한 색(연한 배경 + 진한 주황 글씨)
  nearTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.nearBg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  nearText: { fontFamily: font.extrabold, fontSize: 12, color: colors.nearFg },

  empty: { fontFamily: font.medium, fontSize: 14, color: colors.inkAsst, textAlign: 'center', marginTop: 40 },
});
