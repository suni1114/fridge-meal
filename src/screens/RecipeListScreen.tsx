// 요리추천 (spec §9.9) — 바로 가능 / 조금만 사면 가능 / 임박 재료로 가능
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { useApp, matchAll, RecipeMatch } from '../data/store';
import { RecipeTile } from '../components/ui';
import { useNav } from '../navigation/nav';

const TABS = [
  { key: 'ready', label: '바로 가능' },
  { key: 'almost', label: '조금만 사면' },
  { key: 'near', label: '임박 재료로' },
] as const;

export function RecipeListScreen() {
  const { fridge, addToShopping } = useApp();
  const nav = useNav();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('ready');

  const all = matchAll(fridge);
  const filtered = all.filter((m) => {
    if (tab === 'ready') return m.missing.length === 0;
    if (tab === 'almost') return m.missing.length >= 1 && m.missing.length <= 2;
    return m.usesNearExpiry;
  });

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>오늘 뭐 먹지?</Text>
        <Text style={s.sub}>냉장고 재료로 만들 수 있는 요리예요</Text>
      </View>

      <View style={s.tabs}>
        {TABS.map((t) => {
          const on = t.key === tab;
          const count = all.filter((m) =>
            t.key === 'ready' ? m.missing.length === 0 : t.key === 'almost' ? m.missing.length >= 1 && m.missing.length <= 2 : m.usesNearExpiry
          ).length;
          return (
            <Pressable key={t.key} style={[s.tab, on && s.tabOn]} onPress={() => setTab(t.key)}>
              <Text style={[s.tabText, on && s.tabTextOn]}>{t.label} {count}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12 }} showsVerticalScrollIndicator={false}>
        {filtered.map((m) => (
          <RecipeCard key={m.recipe.id} m={m} onOpen={() => nav.openRecipe(m.recipe.id)} onAdd={() => m.missing.forEach((n) => addToShopping(n, 'recipe_missing', `${m.recipe.title}에 필요해요`))} />
        ))}
        {filtered.length === 0 && <Text style={s.empty}>해당하는 요리가 아직 없어요.</Text>}
      </ScrollView>
    </View>
  );
}

function RecipeCard({ m, onOpen, onAdd }: { m: RecipeMatch; onOpen: () => void; onAdd: () => void }) {
  const hasMissing = m.missing.length > 0;
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <RecipeTile id={m.recipe.id} size={56} bg={m.usesNearExpiry ? colors.coralBg : hasMissing ? colors.accentBg : colors.primaryBg} />
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{m.recipe.title}</Text>
          <View style={s.metaRow}>
            <Icon name="clock" size={13} color={colors.inkAsst} />
            <Text style={s.metaText}>{m.recipe.cookTime}분 · {m.recipe.difficulty}</Text>
          </View>
        </View>
        {m.usesNearExpiry && (
          <View style={s.flame}>
            <Icon name="flame" size={13} color={colors.coral} weight="fill" />
            <Text style={s.flameText}>임박</Text>
          </View>
        )}
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

      <View style={s.btnRow}>
        {hasMissing && (
          <Pressable style={[s.cardBtn, s.cardBtnGhost]} onPress={onAdd}>
            <Icon name="basket" size={16} color={colors.primary} weight="bold" />
            <Text style={[s.cardBtnText, { color: colors.primary }]}>부족 재료 담기</Text>
          </Pressable>
        )}
        <Pressable style={[s.cardBtn, s.cardBtnPrimary, !hasMissing && { flex: 1 }]} onPress={onOpen}>
          <Text style={[s.cardBtnText, { color: colors.white }]}>레시피 보기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  sub: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAlt, marginTop: 5 },

  tabs: { flexDirection: 'row', gap: 7, paddingHorizontal: 20, paddingBottom: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.fill },
  tabOn: { backgroundColor: colors.primary },
  tabText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  tabTextOn: { color: colors.white },

  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  thumb: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  metaText: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkAlt },
  flame: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.coralBg, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill },
  flameText: { fontFamily: font.extrabold, fontSize: 11, color: colors.coral },

  infoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 13, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.line },
  infoHave: { fontFamily: font.bold, fontSize: 13, color: colors.primary },
  infoNone: { fontFamily: font.semibold, fontSize: 13, color: colors.inkAlt },
  missingWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  infoMissingLabel: { fontFamily: font.bold, fontSize: 13, color: colors.accentDark },
  missChip: { backgroundColor: colors.accentBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  missChipText: { fontFamily: font.bold, fontSize: 11.5, color: colors.accentDark },

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, flex: 1 },
  cardBtnPrimary: { backgroundColor: colors.primary },
  cardBtnGhost: { backgroundColor: colors.primaryBg },
  cardBtnText: { fontFamily: font.bold, fontSize: 14 },

  empty: { fontFamily: font.medium, fontSize: 14, color: colors.inkAsst, textAlign: 'center', marginTop: 40 },
});
