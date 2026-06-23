// 요리추천 (spec §9.9) — 바로 가능 / 조금만 사면 / 임박 재료로
//  · 냉장고와 동일한 탭(아이콘+개수) · 좌우 스와이프 전환 · 레시피 보기 / 유튜브 레시피
import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon, IconName } from '../components/Icon';
import { useApp, matchAll, RecipeMatch } from '../data/store';
import { RecipeTile, HeaderActions } from '../components/ui';
import { useNav } from '../navigation/nav';

const TABS: { key: string; label: string; icon: IconName }[] = [
  { key: 'ready', label: '바로 가능', icon: 'check-circle' },
  { key: 'almost', label: '조금만 사면', icon: 'basket' },
  { key: 'near', label: '임박 재료로', icon: 'flame' },
];

const matchesTab = (m: RecipeMatch, i: number) =>
  i === 0 ? m.missing.length === 0 : i === 1 ? m.missing.length >= 1 && m.missing.length <= 2 : m.usesNearExpiry;

export function RecipeListScreen() {
  const { fridge, addToShopping } = useApp();
  const nav = useNav();
  const [tab, setTab] = useState(0);
  const [w, setW] = useState(0);
  const pagerRef = useRef<ScrollView>(null);

  const all = matchAll(fridge);
  const listFor = (i: number) => all.filter((m) => matchesTab(m, i));

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
        <HeaderActions showSearch={false} showBell={false} />
      </View>

      {/* 탭 — 냉장고 보관위치 탭과 동일한 스타일(아이콘 + 개수) */}
      <View style={s.tabs}>
        {TABS.map((t, i) => {
          const on = i === tab;
          return (
            <Pressable key={t.key} style={[s.tab, on && s.tabOn]} onPress={() => goTab(i)}>
              <Text style={[s.tabText, on && s.tabTextOn]}>{t.label}</Text>
              <Text style={[s.tabCount, on && s.tabCountOn]}>{listFor(i).length}</Text>
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
            {TABS.map((t, i) => {
              const list = listFor(i);
              return (
                <ScrollView key={t.key} style={{ width: w }} contentContainerStyle={{ padding: 16, paddingTop: 6, gap: 9, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                  {list.map((m) => (
                    <RecipeCard
                      key={m.recipe.id}
                      m={m}
                      onOpen={() => nav.openRecipe(m.recipe.id)}
                      onAdd={() => m.missing.forEach((n) => addToShopping(n, 'recipe_missing', `${m.recipe.title}에 필요해요`))}
                    />
                  ))}
                  {list.length === 0 && <Text style={s.empty}>해당하는 요리가 아직 없어요.</Text>}
                </ScrollView>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function RecipeCard({ m, onOpen, onAdd }: { m: RecipeMatch; onOpen: () => void; onAdd: () => void }) {
  const hasMissing = m.missing.length > 0;
  const onYoutube = () =>
    Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(m.recipe.title + ' 레시피')}`);

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <RecipeTile id={m.recipe.id} size={46} bg={m.usesNearExpiry ? colors.coralBg : hasMissing ? colors.accentBg : colors.primaryBg} />
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{m.recipe.title}</Text>
          <View style={s.metaRow}>
            <Icon name="clock" size={12} color={colors.inkAsst} />
            <Text style={s.metaText}>{m.recipe.cookTime}분 · {m.recipe.difficulty}</Text>
            {m.usesNearExpiry && (
              <View style={s.flame}>
                <Icon name="flame" size={11} color={colors.coral} weight="fill" />
                <Text style={s.flameText}>임박</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={s.infoRow}>
        <Text style={s.infoHave}>가진 재료 {m.haveCount}개</Text>
        {hasMissing ? (
          <View style={s.missingWrap}>
            <Text style={s.infoMissingLabel}>부족 {m.missing.length}개</Text>
            {m.missing.map((n) => (
              <View key={n} style={s.missChip}><Text style={s.missChipText}>{n}</Text></View>
            ))}
          </View>
        ) : (
          <Text style={s.infoNone}>부족 재료 없음</Text>
        )}
      </View>

      {/* 하단 액션 — 차분한 버튼 2개 */}
      <View style={s.footer}>
        <Pressable style={s.viewBtn} onPress={onOpen}>
          <Text style={s.viewBtnText}>레시피 보기</Text>
        </Pressable>
        <Pressable style={s.ytBtn} onPress={onYoutube}>
          <Text style={s.ytPlay}>▶</Text>
          <Text style={s.ytText}>유튜브 레시피</Text>
        </Pressable>
      </View>

      {/* 부족 재료 담기 — 카드 우측 상단 */}
      {hasMissing && (
        <Pressable style={s.addChip} onPress={onAdd}>
          <Icon name="basket" size={12} color={colors.inkAlt} weight="bold" />
          <Text style={s.addChipText}>담기</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  sub: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAlt, marginTop: 5 },

  // 탭 — 냉장고 보관위치 탭과 동일
  tabs: { flexDirection: 'row', gap: 7, marginHorizontal: 20, marginTop: 4, marginBottom: 6 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 4, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
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
  infoHave: { fontFamily: font.bold, fontSize: 13, color: colors.ink },
  infoNone: { fontFamily: font.semibold, fontSize: 13, color: colors.inkAsst },
  missingWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  infoMissingLabel: { fontFamily: font.bold, fontSize: 13, color: colors.accentDark },
  missChip: { backgroundColor: colors.accentBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  missChipText: { fontFamily: font.bold, fontSize: 11.5, color: colors.accentDark },
  // 부족 재료 담기 — 카드 우측 상단 고정
  addChip: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.fill, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  addChipText: { fontFamily: font.bold, fontSize: 11.5, color: colors.ink },

  // 하단 액션 — 카드와 한 덩어리(구분선) + 차분한 버튼 2개
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  viewBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: radius.md, backgroundColor: colors.fill },
  viewBtnText: { fontFamily: font.medium, fontSize: 14, color: colors.inkAlt },
  ytBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  ytPlay: { fontFamily: font.bold, fontSize: 9, color: colors.coral },
  ytText: { fontFamily: font.medium, fontSize: 14, color: colors.inkAlt },

  empty: { fontFamily: font.medium, fontSize: 14, color: colors.inkAsst, textAlign: 'center', marginTop: 40 },
});
