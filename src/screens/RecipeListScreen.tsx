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
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 9, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          {results.map((m) => (
            <RecipeCard key={m.recipe.menuId} m={m} onOpen={() => nav.openRecipe(m.recipe.menuId)} />
          ))}
          {results.length === 0 && <Text style={s.empty}>'{q}' 검색 결과가 없어요.</Text>}
        </ScrollView>
      ) : (<>
      {/* 탭 — 전체 / 국·찌개 / 반찬 / 메인 / 간편 (5개, 가로 스크롤) */}
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
                <ScrollView key={label} style={{ width: w }} contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 9, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                  {list.map((m) => (
                    <RecipeCard
                      key={m.recipe.menuId}
                      m={m}
                      onOpen={() => nav.openRecipe(m.recipe.menuId)}
                    />
                  ))}
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  sub: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAlt, marginTop: 5 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 14 },
  search: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink, paddingVertical: 11 },

  // 탭 — 전체 / 국·찌개 / 반찬 / 메인 / 간편 (5개, 가로 스크롤)
  tabsScroll: { flexGrow: 0, marginTop: 4, marginBottom: 6 },
  tabs: { flexDirection: 'row', gap: 7, paddingHorizontal: 20 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontFamily: font.bold, fontSize: 12, color: colors.inkAlt },
  tabTextOn: { color: colors.white },
  tabCount: { fontFamily: font.bold, fontSize: 10.5, color: colors.inkAlt, backgroundColor: colors.fill, minWidth: 16, height: 16, lineHeight: 16, borderRadius: 8, paddingHorizontal: 4, textAlign: 'center', overflow: 'hidden' },
  tabCountOn: { color: colors.primary, backgroundColor: colors.white },

  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: 13 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  cardTitle: { fontFamily: font.extrabold, fontSize: 16, color: colors.ink, letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkAlt },
  flame: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.coralBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, marginLeft: 2 },
  flameText: { fontFamily: font.extrabold, fontSize: 10.5, color: colors.coral },

  infoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  status: { fontFamily: font.bold, fontSize: 13 },
  statusReady: { color: colors.primary },
  statusAlmost: { color: colors.accentDark },
  statusNo: { color: colors.inkAsst },
  infoHave: { fontFamily: font.bold, fontSize: 13, color: colors.ink },
  missingWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  missChip: { backgroundColor: colors.accentBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  missChipText: { fontFamily: font.bold, fontSize: 11.5, color: colors.accentDark },
  missMore: { fontFamily: font.bold, fontSize: 11.5, color: colors.inkAsst },

  // 하단 액션 — 카드와 한 덩어리(구분선) + 상세보기 버튼
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  viewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: radius.md, backgroundColor: colors.fill },
  viewBtnText: { fontFamily: font.medium, fontSize: 14, color: colors.inkAlt },

  empty: { fontFamily: font.medium, fontSize: 14, color: colors.inkAsst, textAlign: 'center', marginTop: 40 },
});
