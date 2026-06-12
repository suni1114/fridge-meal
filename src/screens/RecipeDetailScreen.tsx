// 레시피 상세 (spec §9.10)
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { ScreenHeader, AppButton, RecipeTile } from '../components/ui';
import { useApp, matchRecipe, RECIPES } from '../data/store';
import { useNav } from '../navigation/nav';

export function RecipeDetailScreen({ recipeId }: { recipeId: string }) {
  const { fridge, addToShopping } = useApp();
  const nav = useNav();
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return null;
  const m = matchRecipe(recipe, fridge);
  const have = recipe.required.filter((r) => !m.missing.includes(r.name)).map((r) => r.name);

  return (
    <View style={s.root}>
      <ScreenHeader title="레시피" onBack={() => nav.closeOverlay()} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <RecipeTile id={recipe.id} size={96} bg={colors.primaryBg} />
          <View style={{ height: 16 }} />
          <Text style={s.title}>{recipe.title}</Text>
          <View style={s.metaRow}>
            <View style={s.metaPill}><Icon name="clock" size={14} color={colors.inkAlt} /><Text style={s.metaText}>{recipe.cookTime}분</Text></View>
            <View style={s.metaPill}><Icon name="flame" size={14} color={colors.inkAlt} weight="fill" /><Text style={s.metaText}>{recipe.difficulty}</Text></View>
          </View>
        </View>

        <View style={s.reasonCard}>
          <Icon name="sparkle" size={18} color={colors.primary} weight="fill" />
          <View style={{ flex: 1 }}>
            <Text style={s.reasonLabel}>추천 이유</Text>
            <Text style={s.reasonText}>{recipe.reason}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>필요 재료</Text>
          <View style={s.tagWrap}>
            {recipe.required.map((r) => {
              const has = !m.missing.includes(r.name);
              return (
                <View key={r.name} style={[s.tag, has ? s.tagHave : s.tagMiss]}>
                  <Icon name={has ? 'check' : 'plus'} size={13} color={has ? colors.primary : colors.accentDark} weight="bold" />
                  <Text style={[s.tagText, { color: has ? colors.primary : colors.accentDark }]}>{r.name}</Text>
                  {!r.isRequired && <Text style={s.optText}>선택</Text>}
                </View>
              );
            })}
          </View>
          <View style={s.splitRow}>
            <Text style={s.splitHave}>내가 가진 재료 {have.length}</Text>
            {m.missing.length > 0 && <Text style={s.splitMiss}>부족한 재료 {m.missing.join(', ')}</Text>}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>만드는 방법</Text>
          {recipe.steps.map((step, i) => (
            <View key={i} style={s.step}>
              <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {m.missing.length > 0 && (
        <View style={s.footer}>
          <AppButton
            label={`부족 재료 ${m.missing.length}개 장보기 추가`}
            icon="basket"
            onPress={() => {
              m.missing.forEach((n) => addToShopping(n, 'recipe_missing', `${recipe.title}에 필요해요`));
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
  hero: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  heroIcon: { width: 96, height: 96, borderRadius: 30, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: font.extrabold, fontSize: 26, color: colors.ink, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.fill, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  metaText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },

  reasonCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: colors.primaryBg, marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: radius.lg },
  reasonLabel: { fontFamily: font.extrabold, fontSize: 13, color: colors.primaryDark },
  reasonText: { fontFamily: font.medium, fontSize: 14, color: colors.ink, marginTop: 5, lineHeight: 21 },

  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink, marginBottom: 12 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.pill },
  tagHave: { backgroundColor: colors.primaryBg },
  tagMiss: { backgroundColor: colors.accentBg },
  tagText: { fontFamily: font.bold, fontSize: 14 },
  optText: { fontFamily: font.medium, fontSize: 11, color: colors.inkAsst },
  splitRow: { marginTop: 14, gap: 6 },
  splitHave: { fontFamily: font.semibold, fontSize: 13.5, color: colors.primary },
  splitMiss: { fontFamily: font.semibold, fontSize: 13.5, color: colors.accentDark },

  step: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontFamily: font.bold, fontSize: 13, color: colors.white },
  stepText: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink, lineHeight: 23 },

  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
});
