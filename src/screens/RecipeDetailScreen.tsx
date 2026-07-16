// 레시피 상세 — 요리이미지 + 메인/서브 재료(가진·부족) + 추천레시피(외부)·유튜브 버튼. 조리단계 나열 안 함.
import React from 'react';
import { View, Text, ScrollView, Image, Linking, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { ScreenHeader, AppButton, RecipeTile, DifficultyStars } from '../components/ui';
import { useApp, matchRecipe } from '../data/store';
import { recipeImage } from '../data/recipeImages';
import { baseName } from '../data/constants';
import { daysUntil } from '../data/date';
import { useNav } from '../navigation/nav';

export function RecipeDetailScreen({ recipeId }: { recipeId: string }) {
  const { fridge, recipes, addToShopping } = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const recipe = recipes.find((r) => r.menuId === recipeId);
  if (!recipe) return null;
  const m = matchRecipe(recipe, fridge);
  const missingAll = [...m.missingMain, ...m.missingSub];
  const hero = recipeImage(recipe.menuId); // 번들된 요리 사진. 없으면 카테고리 아이콘으로 대체.

  const have = fridge.filter((x) => x.stock !== 'empty').map((x) => baseName(x.name));
  const has = (name: string) => name.length >= 2 && have.some((fn) => fn.length >= 2 && (name.includes(fn) || fn.includes(name)));

  // 이 재료명과 매칭되는 곳간 재료 중 가장 임박한 남은 일수. 소비기한 임박(≤2일)이면 그 값, 아니면 null.
  const nearDaysFor = (name: string): number | null => {
    if (name.length < 2) return null;
    const ds = fridge
      .filter((x) => x.stock !== 'empty')
      .filter((x) => { const b = baseName(x.name); return b.length >= 2 && (name.includes(b) || b.includes(name)); })
      .map((x) => daysUntil(x.expiry))
      .filter((d): d is number => d != null);
    if (!ds.length) return null;
    const min = Math.min(...ds);
    return min <= 2 ? min : null;
  };
  const ddayLabel = (d: number) => (d < 0 ? '지남' : d === 0 ? '오늘까지' : `D-${d}`);

  const onYoutube = () => Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.name + ' 레시피')}`);
  const onRecommend = () => recipe.recommendUrl && Linking.openURL(recipe.recommendUrl);

  // 재료 카드 안의 그룹. plain=양념(보유 가정이라 가진/부족 구분 없음). first면 위 구분선 없음.
  const Group = ({ title, items, plain, first }: { title: string; items: string[]; plain?: boolean; first?: boolean }) =>
    items.length === 0 ? null : (
      <View style={first ? undefined : s.groupDivided}>
        <Text style={s.groupTitle}>{title}</Text>
        <View style={s.chipWrap}>
          {items.map((name) => {
            const owned = !plain && has(name);
            const nd = owned ? nearDaysFor(name) : null; // 임박(≤2일)이면 남은 일수
            const near = nd != null;
            return (
              <View key={name} style={[s.ingChip, plain ? s.ingPlain : near ? s.ingNear : owned ? s.ingHave : s.ingMiss]}>
                {/* 임박만 불꽃 표시. 보유 여부는 칩 배경(흰색=보유 / 회색=없음)으로 구분한다. */}
                {near && <Icon name="flame" size={12} color={colors.nearFg} weight="fill" />}
                <Text style={[s.ingText, plain ? s.ingTextPlain : near ? s.ingTextNear : owned ? s.ingTextHave : s.ingTextMiss]}>{name}</Text>
                {near && <Text style={s.ingDday}>{ddayLabel(nd)}</Text>}
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
        {hero ? (
          <Image source={hero} style={s.heroImg} resizeMode="cover" />
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
            {/* 난이도 — 목록과 동일하게 별점(별이 많을수록 어려움) */}
            {!!recipe.difficulty && (
              <View style={[s.metaPill, s.metaPillOutline]}>
                <Text style={s.metaText}>난이도</Text>
                <DifficultyStars difficulty={recipe.difficulty} size={13} />
              </View>
            )}
          </View>

          <Text style={s.sectionTitle}>재료</Text>

          {/* 보유 현황 요약 — 아래 재료 카드와 구분되도록 옅은 초록 바로 */}
          <View style={s.summaryBar}>
            <Text style={s.haveText}>메인 재료 {m.matchedMain}/{m.totalMain} 보유{m.recommendable && m.missingSub.length > 0 ? ` · 서브 ${m.missingSub.length}개 더 필요` : ''}</Text>
          </View>
          {m.usesNearExpiry && (
            <View style={s.nearNote}>
              <Icon name="flame" size={13} color={colors.nearFg} weight="fill" />
              <Text style={s.nearNoteText}>불꽃 표시는 소비기한 임박 재료예요. 이 요리로 먼저 쓰면 좋아요.</Text>
            </View>
          )}

          {/* 재료 — 메인·서브·양념을 한 덩어리 카드로 묶는다 */}
          <View style={s.ingCard}>
            <Group title="메인 재료" items={recipe.mainIngredients} first />
            <Group title="서브 재료" items={recipe.subIngredients} />
            <Group title="양념" items={recipe.seasonings ?? []} plain />
            {!!recipe.seasonings?.length && <Text style={s.seasonNote}>양념은 기본으로 갖고 있다고 보고 부족 재료에서 빼요.</Text>}
          </View>
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
        <View style={s.footerBtns}>
          {!!recipe.recommendUrl && <AppButton label="만개의레시피" icon="fork-knife" onPress={onRecommend} style={{ flex: 1 }} />}
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
  root: { flex: 1, backgroundColor: colors.white },
  heroImg: { width: '100%', height: 200, backgroundColor: colors.primaryBg },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  // borderWidth를 기본으로 둬서(투명) outline 변형과 높이가 어긋나지 않게 한다.
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.fill, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: 'transparent' },
  // 난이도 별 알약 — 흰 배경 + 회색 라인 (금색 별이 또렷하게 보이도록)
  metaPillOutline: { backgroundColor: colors.surface, borderColor: colors.line },
  metaText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  sectionTitle: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink, marginTop: 24 },
  // 보유 현황 요약 — 재료 카드와 확실히 구분되도록 옅은 초록 바
  summaryBar: { alignSelf: 'flex-start', backgroundColor: colors.primaryBg, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 },
  // 밝은 로고 그린보다 한 톤 어둡게 (목록의 '바로 가능'과 동일)
  haveText: { fontFamily: font.bold, fontSize: 14, color: colors.primaryDark },
  // 재료 한 덩어리 카드 — 메인·서브·양념을 묶어 목록이 흩어져 보이지 않게
  ingCard: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 14 },
  // 카드 안 그룹 사이 구분선
  groupDivided: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
  groupTitle: { fontFamily: font.bold, fontSize: 13.5, color: colors.inkAlt, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  ingChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  // 기본(보유) — 흰 배경 + 어두운 글씨 + 회색 라인
  ingHave: { backgroundColor: colors.surface, borderColor: colors.lineStrong },
  // 없는 재료 — 회색 채움만. 테두리는 없앤다(높이 유지 위해 투명 처리).
  ingMiss: { backgroundColor: colors.fill, borderColor: 'transparent' },
  // 양념 — 보유 가정이라 체크는 없지만, 칩 모양은 다른 재료와 동일하게
  ingPlain: { backgroundColor: colors.surface, borderColor: colors.lineStrong },
  // 임박 — 붉은색만. 배경은 아주 연한 코랄(글씨·불꽃만 또렷하게), 라인은 없앤다(높이 유지 위해 투명).
  ingNear: { backgroundColor: colors.nearBg, borderColor: 'transparent' },
  ingText: { fontFamily: font.bold, fontSize: 13 },
  ingTextHave: { color: colors.ink },
  ingTextMiss: { color: colors.inkAsst },
  ingTextPlain: { color: colors.ink },
  ingTextNear: { color: colors.nearFg },
  ingDday: { fontFamily: font.extrabold, fontSize: 11, color: colors.nearFg },
  // 임박 안내 문구
  nearNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  nearNoteText: { fontFamily: font.medium, fontSize: 12.5, color: colors.nearFg },
  seasonNote: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkAsst, marginTop: 8 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  footerBtns: { flexDirection: 'row', gap: 10 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, paddingVertical: 10 },
  addText: { fontFamily: font.bold, fontSize: 13.5, color: colors.inkAlt },
});
