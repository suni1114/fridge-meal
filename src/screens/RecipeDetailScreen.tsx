// 레시피 상세 — 식품안전나라 공공 레시피(완성사진·영양성분·단계별 사진·재료).
import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { ScreenHeader, AppButton, RecipeTile } from '../components/ui';
import { useApp, matchRecipe, RECIPES } from '../data/store';
import { useNav } from '../navigation/nav';

export function RecipeDetailScreen({ recipeId }: { recipeId: string }) {
  const { fridge, addToShopping } = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return null;
  const m = matchRecipe(recipe, fridge);
  const n = recipe.nutri;
  const nutri = [
    n.carb != null && { label: '탄수화물', num: String(n.carb), unit: 'g' },
    n.protein != null && { label: '단백질', num: String(n.protein), unit: 'g' },
    n.fat != null && { label: '지방', num: String(n.fat), unit: 'g' },
    n.sodium != null && { label: '나트륨', num: String(n.sodium), unit: 'mg' },
  ].filter(Boolean) as { label: string; num: string; unit: string }[];

  return (
    <View style={s.root}>
      <ScreenHeader title="레시피" onBack={() => nav.closeOverlay()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 + (m.missing.length > 0 ? 0 : insets.bottom) }} showsVerticalScrollIndicator={false}>
        {/* 완성 사진 */}
        {recipe.image ? (
          <Image source={{ uri: recipe.image }} style={s.heroImg} resizeMode="cover" />
        ) : (
          <View style={[s.heroImg, s.heroFallback]}>
            <RecipeTile size={88} bg={colors.primaryBg} />
          </View>
        )}

        <View style={s.body}>
          <Text style={s.title}>{recipe.title}</Text>
          <View style={s.metaRow}>
            {!!recipe.category && <View style={s.metaPill}><Text style={s.metaText}>{recipe.category}</Text></View>}
            {!!recipe.method && <View style={s.metaPill}><Text style={s.metaText}>{recipe.method}</Text></View>}
            {n.kcal != null && (
              <View style={s.metaPill}>
                <Icon name="flame" size={12} color={colors.inkAlt} weight="fill" />
                <Text style={s.metaText}>열량 {n.kcal}kcal</Text>
              </View>
            )}
          </View>

          {/* 영양성분 */}
          {nutri.length > 0 && (
            <View style={s.nutriCard}>
              {nutri.map((x) => (
                <View key={x.label} style={s.nutriCell}>
                  <Text style={s.nutriVal}>{x.num}{x.unit}</Text>
                  <Text style={s.nutriLabel}>{x.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 재료 */}
          <Text style={s.sectionTitle}>재료</Text>
          <View style={s.infoRow}>
            <Text style={s.haveText}>내가 가진 재료 {m.haveCount}개</Text>
            {m.missing.length > 0 && (
              <View style={s.missWrap}>
                {m.missing.map((name) => (
                  <View key={name} style={s.missChip}><Text style={s.missChipText}>{name}</Text></View>
                ))}
              </View>
            )}
          </View>
          {/* 식약처 데이터의 줄바꿈 찌꺼기 정리: "재료," 뒤의 줄바꿈은 공백으로(목록은 이어 흐르게). 섹션 구분 줄바꿈은 유지. */}
          {!!recipe.parts && <Text style={s.parts}>{recipe.parts.replace(/,\s*\n\s*/g, ', ')}</Text>}

          {/* 만드는 법 */}
          <Text style={s.sectionTitle}>만드는 법</Text>
          {recipe.steps.map((st, i) => (
            <View key={i} style={s.step}>
              <View style={s.stepHead}>
                <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
                <Text style={s.stepText}>{st.text}</Text>
              </View>
              {!!st.img && <Image source={{ uri: st.img }} style={s.stepImg} resizeMode="cover" />}
            </View>
          ))}

          {!!recipe.tip && (
            <View style={s.tipCard}>
              <Icon name="sparkle" size={16} color={colors.primary} weight="fill" />
              <Text style={s.tipText}>{recipe.tip}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {m.missing.length > 0 && (
        <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
          <AppButton
            label={`부족 재료 ${m.missing.length}개 장보기 추가`}
            icon="basket"
            onPress={() => {
              m.missing.forEach((name) => addToShopping(name, 'recipe_missing', `${recipe.title}에 필요해요`));
              nav.closeOverlay();
              nav.setTab('shopping');
            }}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  heroImg: { width: '100%', height: 220, backgroundColor: colors.primaryBg },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.fill, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  metaText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },

  nutriCard: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingVertical: 14, marginTop: 16 },
  nutriCell: { flexGrow: 1, flexBasis: '20%', alignItems: 'center', paddingVertical: 2 },
  nutriVal: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  nutriLabel: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkAsst, marginTop: 3 },

  sectionTitle: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink, marginTop: 24, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  haveText: { fontFamily: font.bold, fontSize: 14, color: colors.primary },
  missWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  missChip: { backgroundColor: colors.accentBg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  missChipText: { fontFamily: font.bold, fontSize: 12.5, color: colors.accentDark },
  parts: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAlt, lineHeight: 21, marginTop: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 14 },

  step: { marginBottom: 18 },
  stepHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontFamily: font.bold, fontSize: 13, color: colors.white },
  stepText: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink, lineHeight: 23 },
  stepImg: { width: '100%', height: 180, borderRadius: radius.lg, marginTop: 10, backgroundColor: colors.fill },

  tipCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.primaryBg, padding: 14, borderRadius: radius.lg, marginTop: 8 },
  tipText: { flex: 1, fontFamily: font.medium, fontSize: 13.5, color: colors.primaryDark, lineHeight: 20 },

  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
});
