// 관리자 — 요리레시피 추가(메인/서브/추천레시피 링크) / 카테고리별 식재료 추가(아이콘). 추가분은 AsyncStorage.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { ScreenHeader, AppButton, DifficultyStars } from '../components/ui';
import { useApp } from '../data/store';
import { RECIPE_CATEGORIES, RecipeCategory, DIFFICULTIES, Difficulty } from '../data/recommend';
import { FINE_CATEGORIES, coarseFromFine } from '../data/constants';
import { useNav } from '../navigation/nav';

const STORAGE_BY_FINE: Record<string, string> = {
  meat: 'refrigerated', seafood: 'refrigerated', egg_dairy: 'refrigerated', veg: 'refrigerated',
  fruit: 'room_temp', grain: 'room_temp', tofu_bean: 'refrigerated', processed: 'room_temp',
  sauce: 'sauce', nuts_snack: 'room_temp', bakery: 'room_temp', frozen: 'frozen', mealkit: 'room_temp',
  drink: 'refrigerated', etc: 'refrigerated',
};
const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const slug = (s: string) => 'user-' + Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);

export function AdminScreen() {
  const nav = useNav();
  const { recipes, addRecipe, removeRecipe, ingredientMaster, addIngredient, removeIngredient } = useApp();
  const [mode, setMode] = useState<'recipe' | 'ingredient'>('recipe');

  const [rName, setRName] = useState('');
  const [rCat, setRCat] = useState<RecipeCategory>('국·찌개');
  const [rMain, setRMain] = useState('');
  const [rSub, setRSub] = useState('');
  const [rSeason, setRSeason] = useState('');
  const [rTime, setRTime] = useState('');
  const [rDiff, setRDiff] = useState<Difficulty>('보통'); // 난이도(별점) — 기본 보통
  const [rUrl, setRUrl] = useState('');
  const userRecipes = recipes.filter((r) => r.menuId.startsWith('user-'));
  const submitRecipe = () => {
    const name = rName.trim(); const main = splitList(rMain);
    if (!name || main.length === 0) return;
    addRecipe({ menuId: slug(name), name, category: rCat, mainIngredients: main, subIngredients: splitList(rSub),
      seasonings: splitList(rSeason),
      cookTimeMinutes: rTime ? (Number(rTime) || undefined) : undefined, difficulty: rDiff, recommendUrl: rUrl.trim() || undefined });
    setRName(''); setRMain(''); setRSub(''); setRSeason(''); setRTime(''); setRDiff('보통'); setRUrl('');
  };

  const [iName, setIName] = useState('');
  const [iFine, setIFine] = useState('veg');
  const [iEmoji, setIEmoji] = useState('');
  const submitIngredient = () => {
    const name = iName.trim(); if (!name) return;
    addIngredient({ name, category: coarseFromFine(iFine), storage: STORAGE_BY_FINE[iFine] ?? 'refrigerated', emoji: iEmoji.trim() || undefined });
    setIName(''); setIEmoji('');
  };

  return (
    <View style={s.root}>
      <ScreenHeader title="관리자" onBack={() => nav.closeOverlay()} />
      <View style={s.segRow}>
        <Pressable style={[s.seg, mode === 'recipe' && s.segOn]} onPress={() => setMode('recipe')}><Text style={[s.segText, mode === 'recipe' && s.segTextOn]}>요리 추가</Text></Pressable>
        <Pressable style={[s.seg, mode === 'ingredient' && s.segOn]} onPress={() => setMode('ingredient')}><Text style={[s.segText, mode === 'ingredient' && s.segTextOn]}>식재료 추가</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {mode === 'recipe' ? (
          <>
            <Field label="요리 이름" value={rName} onChange={setRName} placeholder="예: 돼지김치찌개" />
            <Text style={s.label}>카테고리</Text>
            <View style={s.chipRow}>{RECIPE_CATEGORIES.map((c) => (<Pressable key={c} style={[s.chip, rCat === c && s.chipOn]} onPress={() => setRCat(c)}><Text style={[s.chipText, rCat === c && s.chipTextOn]}>{c}</Text></Pressable>))}</View>
            <Field label="메인 재료 (쉼표, 필수)" value={rMain} onChange={setRMain} placeholder="김치, 돼지고기" />
            <Field label="서브 재료 (쉼표)" value={rSub} onChange={setRSub} placeholder="두부, 대파, 양파" />
            <Field label="양념 (쉼표, 매칭 제외)" value={rSeason} onChange={setRSeason} placeholder="고춧가루, 국간장, 다진마늘" />
            <Field label="조리시간(분)" value={rTime} onChange={setRTime} placeholder="25" keyboardType="numeric" />
            {/* 난이도 — 별이 많을수록 어렵다 */}
            <Text style={s.label}>난이도</Text>
            <View style={s.diffCol}>
              {DIFFICULTIES.map((d) => {
                const on = rDiff === d;
                return (
                  <Pressable key={d} style={[s.diffRow, on && s.diffRowOn]} onPress={() => setRDiff(d)}>
                    <DifficultyStars difficulty={d} size={15} />
                    <Text style={[s.diffLabel, on && s.diffLabelOn]}>{d}</Text>
                    {on && <Icon name="check-circle" size={18} color={colors.primary} weight="fill" />}
                  </Pressable>
                );
              })}
            </View>
            <Field label="추천레시피 링크(URL)" value={rUrl} onChange={setRUrl} placeholder="https://www.10000recipe.com/..." />
            <AppButton label="요리 추가" icon="plus" onPress={submitRecipe} style={{ marginTop: 16 }} />
            <Text style={s.listHead}>추가한 요리 {userRecipes.length}개</Text>
            {userRecipes.map((r) => (
              <View key={r.menuId} style={s.listRow}>
                <Text style={s.listName}>{r.name} <Text style={s.listMeta}>· {r.category}</Text></Text>
                <Pressable hitSlop={8} onPress={() => removeRecipe(r.menuId)}><Icon name="trash" size={18} color={colors.coral} /></Pressable>
              </View>
            ))}
          </>
        ) : (
          <>
            <Field label="식재료 이름" value={iName} onChange={setIName} placeholder="예: 순두부" />
            <Field label="아이콘(이모지)" value={iEmoji} onChange={setIEmoji} placeholder="🍲" />
            <Text style={s.label}>분류</Text>
            <View style={s.chipRow}>{FINE_CATEGORIES.map((c) => (<Pressable key={c.code} style={[s.chip, iFine === c.code && s.chipOn]} onPress={() => setIFine(c.code)}><Text style={[s.chipText, iFine === c.code && s.chipTextOn]}>{c.emoji} {c.label}</Text></Pressable>))}</View>
            <AppButton label="식재료 추가" icon="plus" onPress={submitIngredient} style={{ marginTop: 16 }} />
            <Text style={s.listHead}>추가한 식재료 {ingredientMaster.length}개</Text>
            {ingredientMaster.map((x) => (
              <View key={x.name} style={s.listRow}>
                <Text style={s.listName}>{x.emoji ? `${x.emoji} ` : ''}{x.name}</Text>
                <Pressable hitSlop={8} onPress={() => removeIngredient(x.name)}><Icon name="trash" size={18} color={colors.coral} /></Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.inkAsst} style={s.input} keyboardType={keyboardType ?? 'default'} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  segRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  seg: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  segOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segText: { fontFamily: font.bold, fontSize: 14, color: colors.inkAlt },
  segTextOn: { color: colors.white },
  label: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt, marginBottom: 7 },
  input: { fontFamily: font.medium, fontSize: 15, color: colors.ink, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 4 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  chipTextOn: { color: colors.white },
  // 난이도 선택 — 별점 + 라벨 한 줄씩
  diffCol: { gap: 6, marginBottom: 4 },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  diffRowOn: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  diffLabel: { flex: 1, fontFamily: font.bold, fontSize: 13.5, color: colors.inkAlt },
  diffLabelOn: { color: colors.primaryDark },

  listHead: { fontFamily: font.extrabold, fontSize: 15, color: colors.ink, marginTop: 26, marginBottom: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  listName: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  listMeta: { fontFamily: font.medium, fontSize: 13, color: colors.inkAsst },
});
