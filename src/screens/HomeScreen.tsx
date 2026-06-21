// 홈 대시보드 (spec §9.6) — 오늘 행동 중심.
import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { FoodTile, DdayBadge, SectionTitle, RecipeTile, HeaderActions } from '../components/ui';
import { useApp, matchAll } from '../data/store';
import { daysUntil } from '../data/date';
import { useNav } from '../navigation/nav';

export function HomeScreen() {
  const { fridge, shopping } = useApp();
  const nav = useNav();

  // 임박(5일 이내, D-0/지난 것 포함) 재료를 개수 제한 없이 임박순으로 모두 노출.
  const expiring = [...fridge]
    .map((x) => ({ item: x, d: daysUntil(x.expiry) }))
    .filter((e) => e.d != null && e.d <= 5)
    .sort((a, b) => a.d! - b.d!)
    .map((e) => e.item);
  const matches = matchAll(fridge);
  const ready = matches.filter((m) => m.missing.length === 0).slice(0, 3);
  const almost = matches.filter((m) => m.missing.length >= 1 && m.missing.length <= 2).slice(0, 2);
  const shop = shopping.filter((x) => !x.checked);

  // 웹: 임박 재료 가로 카드를 마우스로 끌어서 넘길 수 있게 한다(스크롤바 없이).
  const expRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const node = (expRef.current as any)?.getScrollableNode?.() as HTMLElement | undefined;
    if (!node) return;
    let down = false, startX = 0, startLeft = 0, moved = false;
    const onDown = (e: MouseEvent) => { down = true; moved = false; startX = e.pageX; startLeft = node.scrollLeft; node.style.cursor = 'grabbing'; };
    const onMove = (e: MouseEvent) => {
      if (!down) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 2) moved = true;
      if (moved) { e.preventDefault(); node.scrollLeft = startLeft - dx; }
    };
    const onUp = () => { down = false; node.style.cursor = 'grab'; };
    node.style.cursor = 'grab';
    node.style.userSelect = 'none';
    node.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      node.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [expiring.length]);

  return (
    <View style={s.root}>
      <View style={s.topbar}>
        <View style={s.brand}>
          <View style={s.brandDot}>
            <Icon name="snowflake" size={16} color={colors.white} weight="fill" />
          </View>
          <Text style={s.brandText}>냉장고비서</Text>
        </View>
        <HeaderActions showSearch={false} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {/* 1. 오늘 먼저 써야 할 재료 — 홈에서 가장 중요(긴급도 색으로 강조) */}
        <View style={[s.section, s.heroSection]}>
          <SectionTitle title="오늘 먼저 써야 할 재료" count={expiring.length} actionLabel="전체 보기" onAction={() => nav.setTab('fridge')} />
          {expiring.length > 0 ? (
            <ScrollView ref={expRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.expScroll}>
              {expiring.map((it) => (
                <View key={it.id} style={s.expCard}>
                  <FoodTile name={it.name} category={it.category} size={58} />
                  <Text style={s.expCardName} numberOfLines={1}>{it.name}</Text>
                  <DdayBadge expiry={it.expiry} />
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={s.card}>
              <Text style={s.expEmpty}>5일 안에 먹어야 할 재료가 없어요.</Text>
            </View>
          )}
        </View>

        {/* 2. 지금 만들 수 있어요 — 임박 재료보다 한 단계 낮은 비중 */}
        <View style={s.section}>
          <SectionTitle title="지금 만들 수 있어요" compact actionLabel="더보기" onAction={() => nav.setTab('recipe')} />
          <View style={{ gap: 8 }}>
            {ready.map((m) => (
              <Pressable key={m.recipe.id} style={s.recipeCard} onPress={() => nav.openRecipe(m.recipe.id)}>
                <RecipeTile id={m.recipe.id} size={42} bg={colors.primaryBg} />
                <View style={{ flex: 1 }}>
                  <Text style={s.recipeTitle}>{m.recipe.title}</Text>
                  <Text style={s.recipeMeta}>가진 재료 {m.haveCount}개 · {m.recipe.cookTime}분</Text>
                </View>
                <Icon name="caret-right" size={18} color={colors.inkAsst} weight="bold" />
              </Pressable>
            ))}
          </View>
        </View>

        {/* 3. 조금만 사면 가능해요 */}
        <View style={s.section}>
          <SectionTitle title="조금만 사면 가능해요" compact />
          <View style={{ gap: 8 }}>
            {almost.map((m) => (
              <Pressable key={m.recipe.id} style={s.recipeCard} onPress={() => nav.openRecipe(m.recipe.id)}>
                <RecipeTile id={m.recipe.id} size={42} bg={colors.accentBg} />
                <View style={{ flex: 1 }}>
                  <Text style={s.recipeTitle}>{m.recipe.title}</Text>
                  <View style={s.missingRow}>
                    <Text style={s.missingLabel}>부족 재료</Text>
                    {m.missing.map((n) => (
                      <View key={n} style={s.missingChip}>
                        <Text style={s.missingChipText}>{n}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Icon name="caret-right" size={18} color={colors.inkAsst} weight="bold" />
              </Pressable>
            ))}
          </View>
        </View>

        {/* 4. 장보기 요약 */}
        <View style={s.section}>
          <SectionTitle title="장보기 요약" compact count={shop.length} actionLabel="목록 보기" onAction={() => nav.setTab('shopping')} />
          <Pressable style={s.shopCard} onPress={() => nav.setTab('shopping')}>
            <View style={s.shopNames}>
              {shop.slice(0, 6).map((it) => (
                <View key={it.id} style={s.shopName}>
                  <View style={s.bullet} />
                  <Text style={s.shopNameText}>{it.name}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandDot: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontFamily: font.extrabold, fontSize: 20, color: colors.ink, letterSpacing: -0.5 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },

  section: { paddingHorizontal: 20, paddingTop: 30 },
  heroSection: { paddingTop: 16 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16 },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  expName: { flex: 1, fontFamily: font.bold, fontSize: 16, color: colors.ink },
  // 가로로 넘기는 세로 카드 (오늘 먼저 써야 할 재료)
  expScroll: { gap: 7, paddingVertical: 2, paddingRight: 4 },
  expCard: { width: 95, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', paddingVertical: 14, gap: 8 },
  expCardName: { fontFamily: font.extrabold, fontSize: 15.5, color: colors.ink, maxWidth: 85, letterSpacing: -0.3 },
  expEmpty: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAsst, textAlign: 'center', paddingVertical: 14 },

  recipeCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 10 },
  recipeThumb: { width: 42, height: 42, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  recipeTitle: { fontFamily: font.bold, fontSize: 14, color: colors.inkAlt },
  recipeMeta: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkAsst, marginTop: 3 },
  missingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  missingLabel: { fontFamily: font.semibold, fontSize: 12, color: colors.inkAsst },
  missingChip: { backgroundColor: colors.accentBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  missingChipText: { fontFamily: font.bold, fontSize: 11.5, color: colors.accentDark },

  shopCard: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: 16 },
  shopNames: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  shopName: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.inkAsst },
  shopNameText: { fontFamily: font.semibold, fontSize: 14, color: colors.inkAlt },
});
