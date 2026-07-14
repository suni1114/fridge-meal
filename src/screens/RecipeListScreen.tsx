// 요리추천 — 전체 / 국·찌개 / 반찬 / 메인 / 간편. 메인 전부 보유가 추천 상단.
// 목록은 한 줄에 2개씩 놓이는 사진 카드(사진 + 요리명). 냉장고 매칭 상태는 사진 위 배지로만 알린다.
import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, TextInput, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { useApp, matchAll, matchRecipe } from '../data/store';
import { RECIPE_CATEGORIES, RecipeMatch, isReady, needsOneMain } from '../data/recommend';
import { recipeImage } from '../data/recipeImages';
import { recipeCategoryEmoji } from '../data/constants';
import { HeaderActions, emojiFont } from '../components/ui';
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
          <View style={s.grid}>
            {results.map((m) => (
              <RecipeCard key={m.recipe.menuId} m={m} onOpen={() => nav.openRecipe(m.recipe.menuId)} />
            ))}
          </View>
          {results.length === 0 && <Text style={s.empty}>'{q}' 검색 결과가 없어요.</Text>}
        </ScrollView>
      ) : (<>
      {/* 탭 — 전체 / 국·찌개 / 반찬 / 메인 / 간편 (장보기·냉장고와 동일한 밑줄 스타일) */}
      <View style={s.tabs}>
        {TABS.map((label, i) => {
          const on = i === tab;
          return (
            <Pressable key={label} style={s.tab} onPress={() => goTab(i)}>
              <Text style={[s.tabText, on && s.tabTextOn]} numberOfLines={1}>{label}</Text>
              <View style={[s.tabUnderline, on && s.tabUnderlineOn]} />
            </Pressable>
          );
        })}
      </View>

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
                  <View style={s.grid}>
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

/** 한 줄에 2개 놓이는 사진 카드 — 정사각 사진 + 상태 배지, 그 아래 요리명. */
function RecipeCard({ m, onOpen }: { m: RecipeMatch; onOpen: () => void }) {
  const ready = isReady(m);
  const oneMain = needsOneMain(m);
  const img = recipeImage(m.recipe.menuId);
  // 배지: 바로 가능 / 재료 N개 / 메인 부족 — 목록에선 개수만, 어떤 재료인지는 상세에서.
  const badgeLabel = ready
    ? '바로 가능'
    : m.recommendable
    ? `재료 ${m.missingSub.length}개`
    : oneMain
    ? '재료 1개'
    : '메인 부족';
  const badgeStyle = ready ? s.badgeReady : m.recommendable || oneMain ? s.badgeAlmost : s.badgeNo;

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
        <View style={[s.badge, badgeStyle]}><Text style={s.badgeText}>{badgeLabel}</Text></View>
        {m.usesNearExpiry && (
          <View style={s.flame}><Icon name="flame" size={10} color={colors.white} weight="fill" /><Text style={s.flameText}>임박</Text></View>
        )}
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>{m.recipe.name}</Text>
        <Text style={s.metaText}>{m.recipe.category}{m.recipe.cookTimeMinutes ? ` · ${m.recipe.cookTimeMinutes}분` : ''}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  sub: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAlt, marginTop: 5 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 14 },
  search: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink, paddingVertical: 11 },

  // 탭 — 전체 / 국·찌개 / 반찬 / 메인 / 간편 (장보기 식재료·생활용품 탭과 동일한 밑줄 스타일)
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginTop: 4, borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { flex: 1, alignItems: 'center' },
  tabText: { fontFamily: font.bold, fontSize: 14, color: colors.inkAsst, paddingVertical: 9 },
  tabTextOn: { color: colors.ink },
  tabUnderline: { height: 2.5, width: '100%', backgroundColor: 'transparent', marginBottom: -1 },
  tabUnderlineOn: { backgroundColor: colors.ink },

  // 그리드 — 한 줄에 2개. 카드 너비 48%, 남는 4%가 가운데 여백이 된다.
  page: { padding: 16, paddingTop: 6, paddingBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  card: { width: '48%', backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },

  thumbWrap: { width: '100%', aspectRatio: 1 },
  thumb: { width: '100%', height: '100%', backgroundColor: colors.fill },
  thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryBg },
  thumbEmoji: { fontSize: 46, lineHeight: 58, textAlign: 'center' },

  badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  badgeReady: { backgroundColor: colors.primary },
  badgeAlmost: { backgroundColor: colors.accent },
  badgeNo: { backgroundColor: 'rgba(51,53,47,0.6)' },
  badgeText: { fontFamily: font.extrabold, fontSize: 10.5, color: colors.white },
  flame: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.coral, paddingHorizontal: 7, paddingVertical: 4, borderRadius: radius.pill },
  flameText: { fontFamily: font.extrabold, fontSize: 10, color: colors.white },

  cardBody: { paddingHorizontal: 11, paddingTop: 9, paddingBottom: 11, gap: 3 },
  cardTitle: { fontFamily: font.extrabold, fontSize: 14.5, color: colors.ink, letterSpacing: -0.3, lineHeight: 19 },
  metaText: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkAsst },

  empty: { fontFamily: font.medium, fontSize: 14, color: colors.inkAsst, textAlign: 'center', marginTop: 40 },
});
