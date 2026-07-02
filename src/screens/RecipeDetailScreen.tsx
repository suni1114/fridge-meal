// 레시피 상세 — 요리이미지 + 메인/서브 재료(가진·부족) + 추천레시피(외부)·유튜브 버튼. 조리단계 나열 안 함.
import React from 'react';
import { View, Text, ScrollView, Image, Linking, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { ScreenHeader, AppButton, RecipeTile } from '../components/ui';
import { useApp, matchRecipe } from '../data/store';
import { baseName } from '../data/constants';
import { useNav } from '../navigation/nav';

export function RecipeDetailScreen({ recipeId }: { recipeId: string }) {
  const { fridge, recipes, addToShopping } = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const recipe = recipes.find((r) => r.menuId === recipeId);
  if (!recipe) return null;
  const m = matchRecipe(recipe, fridge);
  const missingAll = [...m.missingMain, ...m.missingSub];

  const have = fridge.filter((x) => x.stock !== 'empty').map((x) => baseName(x.name));
  const has = (name: string) => name.length >= 2 && have.some((fn) => fn.length >= 2 && (name.includes(fn) || fn.includes(name)));

  const onYoutube = () => Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.name + ' 레시피')}`);
  const onRecommend = () => recipe.recommendUrl && Linking.openURL(recipe.recommendUrl);

  const Group = ({ title, items }: { title: string; items: string[] }) =>
    items.length === 0 ? null : (
      <View style={{ marginTop: 16 }}>
        <Text style={s.groupTitle}>{title}</Text>
        <View style={s.chipWrap}>
          {items.map((name) => {
            const owned = has(name);
            return (
              <View key={name} style={[s.ingChip, owned ? s.ingHave : s.ingMiss]}>
                {owned && <Icon name="check-circle" size={12} color={colors.primary} weight="fill" />}
                <Text style={[s.ingText, owned ? s.ingTextHave : s.ingTextMiss]}>{name}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );

  return (
    <View style={s.root}>
      <ScreenHeader title="레시피" onBack={() => nav.closeOverlay()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {recipe.image ? (
          <Image source={{ uri: recipe.image }} style={s.heroImg} resizeMode="cover" />
        ) : (
          <View style={[s.heroImg, s.heroFallback, { backgroundColor: m.usesNearExpiry ? colors.coralBg : colors.primaryBg }]}>
            <RecipeTile category={recipe.category} size={92} bg="transparent" />
          </View>
        )}
        <View style={s.body}>
          <Text style={s.title}>{recipe.name}</Text>
          <View style={s.metaRow}>
            <View style={s.metaPill}><Text style={s.metaText}>{recipe.category}</Text></View>
            {recipe.cookTimeMinutes != null && (<View style={s.metaPill}><Icon name="flame" size={12} color={colors.inkAlt} weight="fill" /><Text style={s.metaText}>{recipe.cookTimeMinutes}분</Text></View>)}
            {!!recipe.difficulty && <View style={s.metaPill}><Text style={s.metaText}>{recipe.difficulty}</Text></View>}
          </View>

          <Text style={s.sectionTitle}>재료</Text>
          <Text style={s.haveText}>메인 재료 {m.matchedMain}/{m.totalMain} 보유{m.recommendable && m.missingSub.length > 0 ? ` · 서브 ${m.missingSub.length}개 더 필요` : ''}</Text>
          <Group title="메인 재료" items={recipe.mainIngredients} />
          <Group title="서브 재료" items={recipe.subIngredients} />
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
        <View style={s.footerBtns}>
          {!!recipe.recommendUrl && <AppButton label="추천레시피" icon="heart" onPress={onRecommend} style={{ flex: 1 }} />}
          <AppButton label="유튜브 레시피" variant="ghost" onPress={onYoutube} style={{ flex: 1 }} />
        </View>
        {missingAll.length > 0 && (
          <Pressable style={s.addRow} onPress={() => { missingAll.forEach((name) => addToShopping(name, 'recipe_missing', `${recipe.name}에 필요해요`)); nav.closeOverlay(); nav.setTab('shopping'); }}>
            <Icon name="basket" size={15} color={colors.inkAlt} weight="bold" />
            <Text style={s.addText}>부족한 재료 {missingAll.length}개 장보기 담기</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  heroImg: { width: '100%', height: 200, backgroundColor: colors.primaryBg },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.fill, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  metaText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  sectionTitle: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink, marginTop: 24 },
  haveText: { fontFamily: font.bold, fontSize: 14, color: colors.primary, marginTop: 8 },
  groupTitle: { fontFamily: font.bold, fontSize: 13.5, color: colors.inkAlt, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  ingChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  ingHave: { backgroundColor: colors.primaryBg, borderColor: colors.primaryBg },
  ingMiss: { backgroundColor: colors.surface, borderColor: colors.line },
  ingText: { fontFamily: font.bold, fontSize: 13 },
  ingTextHave: { color: colors.primaryDark },
  ingTextMiss: { color: colors.inkAlt },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  footerBtns: { flexDirection: 'row', gap: 10 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, paddingVertical: 10 },
  addText: { fontFamily: font.bold, fontSize: 13.5, color: colors.inkAlt },
});
