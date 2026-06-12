// 식재료 등록/수정 (spec §9.8). 필수: 식재료명·보관위치·남은정도. 선택: 카테고리·유통기한·메모.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { ScreenHeader, AppButton } from '../components/ui';
import { CATEGORY, CategoryCode, STORAGE_LABEL, STOCK, STOCK_ORDER, StockLevel } from '../data/constants';
import { useApp, infoFor } from '../data/store';
import { useNav } from '../navigation/nav';

const STORAGE_PICKS = ['refrigerated', 'frozen', 'room_temp', 'sauce', 'etc'];
const DDAY_PICKS: { label: string; v: number | null }[] = [
  { label: '미입력', v: null },
  { label: '3일', v: 3 },
  { label: '7일', v: 7 },
  { label: '14일', v: 14 },
  { label: '30일', v: 30 },
];

export function IngredientFormScreen({ itemId, prefillName }: { itemId?: string; prefillName?: string }) {
  const { fridge, upsertFridge, removeFridge } = useApp();
  const nav = useNav();
  const editing = fridge.find((x) => x.id === itemId);

  const [name, setName] = useState(editing?.name ?? prefillName ?? '');
  const [category, setCategory] = useState<CategoryCode>(editing?.category ?? infoFor(prefillName ?? '').category);
  const [storage, setStorage] = useState(editing?.storage ?? 'refrigerated');
  const [stock, setStock] = useState<StockLevel>(editing?.stock ?? 'enough');
  const [dday, setDday] = useState<number | null>(editing?.dday ?? null);
  const [memo, setMemo] = useState(editing?.memo ?? '');

  const canSave = name.trim().length > 0;
  const save = () => {
    if (!canSave) return;
    upsertFridge({
      id: editing?.id ?? `fr-${Date.now()}`,
      name: name.trim(),
      category,
      storage,
      stock,
      dday,
      memo: memo.trim() || undefined,
    });
    nav.closeOverlay();
  };

  return (
    <View style={s.root}>
      <ScreenHeader title={editing ? '식재료 수정' : '식재료 추가'} onBack={() => nav.closeOverlay()} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Field label="식재료명" required>
          <TextInput value={name} onChangeText={setName} placeholder="예: 두부" placeholderTextColor={colors.inkAsst} style={s.input} />
        </Field>

        <Field label="카테고리">
          <View style={s.wrap}>
            {(Object.keys(CATEGORY) as CategoryCode[]).map((c) => (
              <Pressable key={c} onPress={() => setCategory(c)} style={[s.chip, category === c && s.chipOn]}>
                <Text style={[s.chipText, category === c && s.chipTextOn]}>{CATEGORY[c].label}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="보관 위치" required>
          <View style={s.wrap}>
            {STORAGE_PICKS.map((st) => (
              <Pressable key={st} onPress={() => setStorage(st)} style={[s.chip, storage === st && s.chipOn]}>
                <Text style={[s.chipText, storage === st && s.chipTextOn]}>{STORAGE_LABEL[st]}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="남은 정도" required>
          <View style={s.wrap}>
            {STOCK_ORDER.map((lv) => (
              <Pressable key={lv} onPress={() => setStock(lv)} style={[s.chip, stock === lv && s.chipOn]}>
                <Text style={[s.chipText, stock === lv && s.chipTextOn]}>{STOCK[lv].label}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="유통기한 (선택)">
          <View style={s.wrap}>
            {DDAY_PICKS.map((d) => (
              <Pressable key={d.label} onPress={() => setDday(d.v)} style={[s.chip, dday === d.v && s.chipOn]}>
                <Text style={[s.chipText, dday === d.v && s.chipTextOn]}>{d.label}</Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="메모 (선택)">
          <TextInput value={memo} onChangeText={setMemo} placeholder="간단한 메모" placeholderTextColor={colors.inkAsst} style={s.input} />
        </Field>

        {editing && (
          <Pressable style={s.deleteBtn} onPress={() => { removeFridge(editing.id); nav.closeOverlay(); }}>
            <Icon name="trash" size={18} color={colors.coral} />
            <Text style={s.deleteText}>이 재료 삭제</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={s.footer}>
        <AppButton label={editing ? '저장하기' : '냉장고에 추가'} onPress={save} disabled={!canSave} />
      </View>
    </View>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={s.label}>
        {label}
        {required && <Text style={{ color: colors.coral }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  label: { fontFamily: font.bold, fontSize: 14, color: colors.ink, marginBottom: 10 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontFamily: font.medium, fontSize: 15, color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  chipTextOn: { color: colors.white },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4 },
  deleteText: { fontFamily: font.bold, fontSize: 15, color: colors.coral },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
});
