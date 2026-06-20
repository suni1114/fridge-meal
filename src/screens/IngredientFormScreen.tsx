// 식재료 등록/수정 — 1) 카테고리 선택(그리드) → 2) 식재료·소비기한·보관·수량. + AI 등록(영수증·사진).
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { ScreenHeader, AppButton } from '../components/ui';
import {
  STORAGE_LABEL,
  FINE_CATEGORIES,
  FINE_CATEGORY_ITEMS,
  fineCategoryOf,
  coarseFromFine,
  unitOf,
  UNIT_SUFFIX,
  stockFromQty,
  emojiFor,
} from '../data/constants';
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

// 데모용 AI 인식 결과 (실제 영수증/사진 인식 대신 샘플 — 사용자가 확인·수정 후 등록).
const AI_MOCK: Record<string, { name: string; amount: string }[]> = {
  receipt: [
    { name: '계란', amount: '10' },
    { name: '우유', amount: '100' },
    { name: '돼지고기', amount: '500' },
    { name: '대파', amount: '2' },
    { name: '두부', amount: '2' },
  ],
  photo: [
    { name: '사과', amount: '5' },
    { name: '당근', amount: '3' },
    { name: '브로콜리', amount: '1' },
  ],
};

type AiItem = { id: string; name: string; amount: string };

// 모든 카테고리의 식재료 (검색용).
const ALL_INGREDIENTS = Object.values(FINE_CATEGORY_ITEMS).flat();

export function IngredientFormScreen({ itemId, prefillName }: { itemId?: string; prefillName?: string }) {
  const { fridge, upsertFridge, removeFridge } = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const editing = fridge.find((x) => x.id === itemId);

  const initialName = editing?.name ?? prefillName ?? '';
  // 수정/프리필이면 바로 상세(1단계), 신규는 카테고리 선택(0단계)부터.
  const [step, setStep] = useState<0 | 1>(editing || prefillName ? 1 : 0);
  const [fineCat, setFineCat] = useState<string>(
    editing ? fineCategoryOf(editing.name, editing.category) : initialName ? fineCategoryOf(initialName) : 'meat'
  );
  const [name, setName] = useState(initialName);
  const [q, setQ] = useState(''); // 1단계 식재료 검색어
  const [storage, setStorage] = useState(editing?.storage ?? 'refrigerated');
  const [dday, setDday] = useState<number | null>(editing?.dday ?? null);
  const [memo, setMemo] = useState(editing?.memo ?? '');

  // 재료에 따라 수량 단위(개/그람/퍼센트) 자동 결정.
  const unit = unitOf(name);
  const defaultAmount = (u: string) => (u === 'percent' ? '100' : '1');
  const [amount, setAmount] = useState<string>(() => {
    const f = editing?.qty ? parseFloat(editing.qty) : NaN;
    return !isNaN(f) ? String(f) : defaultAmount(unitOf(initialName));
  });
  const firstUnit = useRef(true);
  useEffect(() => {
    if (firstUnit.current) { firstUnit.current = false; return; }
    setAmount(defaultAmount(unit));
  }, [unit]);

  const catMeta = FINE_CATEGORIES.find((c) => c.code === fineCat);
  const items = FINE_CATEGORY_ITEMS[fineCat] ?? [];
  const pickIngredient = (n: string) => {
    setName(n);
    setStorage(infoFor(n).storage);
  };
  const pickCategory = (code: string) => {
    setFineCat(code);
    setName('');
    setStep(1);
  };
  // 검색/직접입력으로 바로 선택 → 카테고리 자동 판별 후 2단계로.
  const selectIngredient = (n: string) => {
    const nm = n.trim();
    if (!nm) return;
    setName(nm);
    setFineCat(fineCategoryOf(nm));
    setStorage(infoFor(nm).storage);
    setStep(1);
  };
  const searchHits = q.trim() ? ALL_INGREDIENTS.filter((n) => n.includes(q.trim())).slice(0, 40) : [];

  const stepSize = unit === 'gram' ? 50 : 1;
  const adjust = (d: number) => {
    const v = parseFloat(amount) || 0;
    setAmount(String(Math.max(0, Math.round((v + d) * 10) / 10)));
  };

  const amt = parseFloat(amount) || 0;
  const canSave = name.trim().length > 0 && amt > 0;
  const save = () => {
    if (!canSave) return;
    upsertFridge({
      id: editing?.id ?? `fr-${Date.now()}`,
      name: name.trim(),
      category: coarseFromFine(fineCat),
      storage,
      stock: stockFromQty(unit, amt),
      qty: `${amt}${UNIT_SUFFIX[unit]}`,
      dday,
      memo: memo.trim() || undefined,
    });
    nav.closeOverlay();
  };

  // ── AI 등록 ───────────────────────────────────────────────
  const [aiItems, setAiItems] = useState<AiItem[] | null>(null);
  const runAi = (kind: 'receipt' | 'photo') =>
    setAiItems(AI_MOCK[kind].map((r, i) => ({ id: `ai-${i}-${Date.now()}`, ...r })));
  const setAiField = (id: string, field: 'name' | 'amount', val: string) =>
    setAiItems((arr) => (arr ? arr.map((x) => (x.id === id ? { ...x, [field]: val } : x)) : arr));
  const removeAi = (id: string) => setAiItems((arr) => (arr ? arr.filter((x) => x.id !== id) : arr));
  const addAiRow = () => setAiItems((arr) => [...(arr ?? []), { id: `ai-new-${Date.now()}`, name: '', amount: '1' }]);
  const aiSave = () => {
    if (!aiItems) return;
    aiItems.forEach((it, idx) => {
      const n = it.name.trim();
      const a = parseFloat(it.amount) || 0;
      if (!n || a <= 0) return;
      const u = unitOf(n);
      const info = infoFor(n);
      upsertFridge({
        id: `fr-ai-${Date.now()}-${idx}`,
        name: n,
        category: info.category,
        storage: info.storage,
        stock: stockFromQty(u, a),
        qty: `${a}${UNIT_SUFFIX[u]}`,
        dday: null,
      });
    });
    setAiItems(null);
    nav.closeOverlay();
  };

  const onBack = () => {
    if (step === 1 && !editing && !prefillName) setStep(0);
    else nav.closeOverlay();
  };

  return (
    <View style={s.root}>
      <ScreenHeader title={editing ? '식재료 수정' : '식재료 추가'} onBack={onBack} />

      {step === 0 ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* 검색 또는 직접 입력 */}
          <View style={s.searchRow}>
            <Icon name="search" size={18} color={colors.inkAsst} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="식재료 검색 또는 직접 입력"
              placeholderTextColor={colors.inkAsst}
              style={s.search}
            />
            {q.length > 0 && (
              <Pressable onPress={() => setQ('')} hitSlop={8}>
                <Icon name="x" size={16} color={colors.inkAsst} weight="bold" />
              </Pressable>
            )}
          </View>

          {q.trim() ? (
            <View>
              {searchHits.map((n) => (
                <Pressable key={n} style={s.resultRow} onPress={() => selectIngredient(n)}>
                  <Text style={s.resultEmoji}>{emojiFor(n, coarseFromFine(fineCategoryOf(n)))}</Text>
                  <Text style={s.resultName}>{n}</Text>
                  <Text style={s.resultCat}>{FINE_CATEGORIES.find((c) => c.code === fineCategoryOf(n))?.label}</Text>
                </Pressable>
              ))}
              {!ALL_INGREDIENTS.includes(q.trim()) && (
                <Pressable style={s.resultRow} onPress={() => selectIngredient(q.trim())}>
                  <Icon name="plus-circle" size={20} color={colors.primary} weight="fill" />
                  <Text style={[s.resultName, { color: colors.primary }]}>‘{q.trim()}’ 직접 등록</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              <View style={s.aiCard}>
                <View style={s.aiCardTop}>
                  <Text style={s.aiSparkle}>✨</Text>
                  <Text style={s.aiTitle}>AI로 빠르게 등록</Text>
                </View>
                <View style={s.aiBtnRow}>
                  <Pressable style={s.aiOpt} onPress={() => runAi('receipt')}>
                    <Text style={s.aiOptEmoji}>🧾</Text>
                    <Text style={s.aiOptText}>영수증 스캔</Text>
                  </Pressable>
                  <Pressable style={s.aiOpt} onPress={() => runAi('photo')}>
                    <Text style={s.aiOptEmoji}>📷</Text>
                    <Text style={s.aiOptText}>식재료 사진</Text>
                  </Pressable>
                </View>
                <Text style={s.aiHint}>인식한 재료를 확인·수정한 뒤 등록해요</Text>
              </View>

              <Text style={s.stepLabel}>어떤 종류인가요?</Text>
              <View style={s.catGrid}>
                {FINE_CATEGORIES.map((c) => (
                  <Pressable key={c.code} style={s.catGridItem} onPress={() => pickCategory(c.code)}>
                    <Text style={s.catGridEmoji}>{c.emoji}</Text>
                    <Text style={s.catGridLabel}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {/* 선택한 카테고리 */}
          <Pressable
            style={s.catBadge}
            onPress={() => { if (!editing && !prefillName) setStep(0); }}
            disabled={!!editing || !!prefillName}
          >
            <Text style={s.catBadgeEmoji}>{catMeta?.emoji}</Text>
            <Text style={s.catBadgeLabel}>{catMeta?.label}</Text>
            {!editing && !prefillName && <Text style={s.catBadgeChange}>변경</Text>}
          </Pressable>

          <Field label="식재료" required>
            {items.length > 0 && (
              <View style={s.wrap}>
                {items.map((n) => {
                  const on = name === n;
                  return (
                    <Pressable key={n} onPress={() => pickIngredient(n)} style={[s.chip, on && s.chipOn]}>
                      <Text style={s.chipEmoji}>{emojiFor(n, coarseFromFine(fineCat))}</Text>
                      <Text style={[s.chipText, on && s.chipTextOn]}>{n}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="목록에 없으면 직접 입력"
              placeholderTextColor={colors.inkAsst}
              style={[s.input, items.length > 0 && { marginTop: 10 }]}
            />
          </Field>

          <Field label="소비기한 (선택)">
            <View style={s.wrap}>
              {DDAY_PICKS.map((d) => (
                <Pressable key={d.label} onPress={() => setDday(d.v)} style={[s.chip, dday === d.v && s.chipOn]}>
                  <Text style={[s.chipText, dday === d.v && s.chipTextOn]}>{d.label}</Text>
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

          <Field label={`수량 (${unit === 'percent' ? '남은 비율' : unit === 'count' ? '개수' : '무게'})`} required>
            {unit === 'percent' ? (
              <View style={s.wrap}>
                {['100', '75', '50', '25'].map((p) => (
                  <Pressable key={p} onPress={() => setAmount(p)} style={[s.chip, amount === p && s.chipOn]}>
                    <Text style={[s.chipText, amount === p && s.chipTextOn]}>{p}%</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={s.stepperRow}>
                <Pressable onPress={() => adjust(-stepSize)} hitSlop={6}>
                  <Icon name="minus-circle" size={34} color={colors.primary} weight="fill" />
                </Pressable>
                <TextInput
                  value={amount}
                  onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.inkAsst}
                  style={s.stepInput}
                  textAlign="center"
                />
                <Pressable onPress={() => adjust(stepSize)} hitSlop={6}>
                  <Icon name="plus-circle" size={34} color={colors.primary} weight="fill" />
                </Pressable>
                <Text style={s.qtyUnit}>{unit === 'count' ? '개' : 'g'}</Text>
              </View>
            )}
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
      )}

      {step === 1 && (
        <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
          <AppButton label={editing ? '저장하기' : '냉장고에 추가'} onPress={save} disabled={!canSave} />
        </View>
      )}

      {/* AI 인식 결과 확인·수정 시트 */}
      <Modal visible={!!aiItems} transparent animationType="slide" onRequestClose={() => setAiItems(null)}>
        <View style={s.aiBackdrop}>
          <View style={[s.aiSheet, { paddingBottom: 16 + insets.bottom }]}>
            <View style={s.aiSheetHead}>
              <Text style={s.aiSheetTitle}>인식된 재료 확인</Text>
              <Pressable onPress={() => setAiItems(null)} hitSlop={8}>
                <Icon name="x" size={20} color={colors.inkAlt} weight="bold" />
              </Pressable>
            </View>
            <Text style={s.aiSheetSub}>잘못된 항목은 수정·삭제하고, 빠진 건 추가하세요.</Text>
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {aiItems?.map((it) => (
                <View key={it.id} style={s.aiItemRow}>
                  <Text style={s.aiItemEmoji}>{emojiFor(it.name)}</Text>
                  <TextInput
                    value={it.name}
                    onChangeText={(t) => setAiField(it.id, 'name', t)}
                    placeholder="재료명"
                    placeholderTextColor={colors.inkAsst}
                    style={s.aiNameInput}
                  />
                  <TextInput
                    value={it.amount}
                    onChangeText={(t) => setAiField(it.id, 'amount', t.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    style={s.aiAmtInput}
                    textAlign="center"
                  />
                  <Text style={s.aiUnit}>{UNIT_SUFFIX[unitOf(it.name)]}</Text>
                  <Pressable onPress={() => removeAi(it.id)} hitSlop={6}>
                    <Icon name="x" size={16} color={colors.inkAsst} weight="bold" />
                  </Pressable>
                </View>
              ))}
              <Pressable style={s.aiAddRow} onPress={addAiRow}>
                <Icon name="plus" size={15} color={colors.primary} weight="bold" />
                <Text style={s.aiAddText}>직접 추가</Text>
              </Pressable>
            </ScrollView>
            <AppButton label={`${aiItems?.length ?? 0}개 냉장고에 등록`} onPress={aiSave} disabled={!aiItems || aiItems.length === 0} style={{ marginTop: 14 }} />
          </View>
        </View>
      </Modal>
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

const EMOJI_FONT = Platform.OS === 'web' ? { fontFamily: '"Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif' } : null;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  label: { fontFamily: font.bold, fontSize: 14, color: colors.ink, marginBottom: 10 },
  stepLabel: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink, marginBottom: 14 },
  // 1단계 검색
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 14, marginBottom: 18 },
  search: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink, paddingVertical: 12 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.line },
  resultEmoji: { fontSize: 18, ...(EMOJI_FONT || {}) },
  resultName: { flex: 1, fontFamily: font.bold, fontSize: 15, color: colors.ink },
  resultCat: { fontFamily: font.semibold, fontSize: 12, color: colors.inkAsst },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontFamily: font.medium, fontSize: 15, color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 13, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipEmoji: { fontSize: 14, ...(EMOJI_FONT || {}) },
  chipText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  chipTextOn: { color: colors.white },

  // 카테고리 그리드 (3열 × 5줄, 균일 버튼)
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  catGridItem: { width: '31%', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 6 },
  catGridEmoji: { fontSize: 26, ...(EMOJI_FONT || {}) },
  catGridLabel: { fontFamily: font.bold, fontSize: 12, color: colors.ink, textAlign: 'center' },

  // 선택한 카테고리 표시
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: colors.primaryBg, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14, marginBottom: 18 },
  catBadgeEmoji: { fontSize: 16, ...(EMOJI_FONT || {}) },
  catBadgeLabel: { fontFamily: font.extrabold, fontSize: 14, color: colors.primaryDark },
  catBadgeChange: { fontFamily: font.bold, fontSize: 12, color: colors.primary, marginLeft: 2 },

  // 수량 스테퍼
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepInput: { minWidth: 70, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12, fontFamily: font.bold, fontSize: 16, color: colors.ink },
  qtyUnit: { fontFamily: font.bold, fontSize: 15, color: colors.inkAlt },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4 },
  deleteText: { fontFamily: font.bold, fontSize: 15, color: colors.coral },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },

  // AI 등록 카드
  aiCard: { backgroundColor: colors.primaryBg, borderRadius: radius.xl, padding: 16, marginBottom: 20 },
  aiCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  aiSparkle: { fontSize: 16, ...(EMOJI_FONT || {}) },
  aiTitle: { fontFamily: font.extrabold, fontSize: 15, color: colors.primaryDark },
  aiBtnRow: { flexDirection: 'row', gap: 10 },
  aiOpt: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 14 },
  aiOptEmoji: { fontSize: 24, ...(EMOJI_FONT || {}) },
  aiOptText: { fontFamily: font.bold, fontSize: 13.5, color: colors.ink },
  aiHint: { fontFamily: font.medium, fontSize: 12, color: colors.primaryDark, marginTop: 10, textAlign: 'center' },

  // AI 확인 시트
  aiBackdrop: { flex: 1, backgroundColor: 'rgba(20,24,18,0.4)', justifyContent: 'flex-end' },
  aiSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  aiSheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiSheetTitle: { fontFamily: font.extrabold, fontSize: 18, color: colors.ink },
  aiSheetSub: { fontFamily: font.medium, fontSize: 13, color: colors.inkAlt, marginTop: 6, marginBottom: 12 },
  aiItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.line },
  aiItemEmoji: { fontSize: 20, ...(EMOJI_FONT || {}) },
  aiNameInput: { flex: 1, fontFamily: font.bold, fontSize: 15, color: colors.ink, paddingVertical: 6 },
  aiAmtInput: { width: 54, backgroundColor: colors.fill, borderRadius: radius.sm, paddingVertical: 6, fontFamily: font.bold, fontSize: 15, color: colors.ink },
  aiUnit: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt, width: 18 },
  aiAddRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  aiAddText: { fontFamily: font.bold, fontSize: 14, color: colors.primary },
});
