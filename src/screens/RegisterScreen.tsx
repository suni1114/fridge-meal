// 식재료 등록 — 장보기 '곳간으로 이동'으로 들어오는 배치 등록 화면.
// 구매완료(입고 전) 항목을 카드로 보여주고, 항목별로 보관위치(냉장·냉동·상온·생필품)와
// 유통기한(+3·+7·+30일)을 정한 뒤 한꺼번에 곳간에 넣는다. (생필품은 유통기한 없이 '상시 보관')
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { ScreenHeader, AppButton } from '../components/ui';
import { coarseFromFine, fineCategoryOf, unitOf, UNIT_SUFFIX, emojiFor, householdEmojiFor, householdUnitOf } from '../data/constants';
import { useApp, infoFor, RegisterEntry } from '../data/store';
import { uid } from '../data/id';
import { isoInDays, fromISO, toISO, addDays, startOfToday, fmtMD } from '../data/date';
import { DatePickerModal } from './IngredientFormScreen'; // 식재료 상세와 같은 달력 재사용
import { useNav } from '../navigation/nav';

type Loc = 'refrigerated' | 'frozen' | 'room_temp' | 'household';
const LOCS: { code: Loc; label: string }[] = [
  { code: 'refrigerated', label: '냉장' },
  { code: 'frozen', label: '냉동' },
  { code: 'room_temp', label: '상온' },
  { code: 'household', label: '생필품' },
];
// 유통기한 빠른 선택(일). 3일은 실제로 거의 안 쓰고, 날짜 칩까지 한 줄에 넣기 위해 뺐다.
const EXPIRY_PRESETS = [7, 30];

// 유통기한 칩 선택 상태 — 곳간의 보관위치 탭(냉장 등) 선택과 같은 톤: 차분한 초록 글자 + 아주 연한 초록 배경.
const SEL_GREEN = '#2A6B4C';
const SEL_GREEN_BG = '#F0F9F4';

// 알려진 보관위치 → 등록 화면의 4분류로 정규화. (양념/기타는 상온으로)
const normLoc = (s: string): Loc =>
  s === 'frozen' ? 'frozen'
    : s === 'household' ? 'household'
    : s === 'room_temp' || s === 'sauce' || s === 'etc' ? 'room_temp'
    : 'refrigerated';

// expiry는 절대 날짜(ISO). 프리셋(+7일 등)도 직접 선택한 날짜도 같은 형태로 담는다.
type Draft = { id: string; shoppingId?: string; name: string; loc: Loc; expiry: string | null };
// 이 날짜가 프리셋으로 만들어진 값인지 (아니면 사용자가 달력에서 직접 고른 날짜)
const isPresetIso = (e: string | null) => e != null && EXPIRY_PRESETS.some((d) => isoInDays(d) === e);

// 단위별 기본 수량 표기 (개=1, 리터=1, 그람=100, 퍼센트=100).
// 생필품은 개수/리터만 쓴다 (물티슈 → 1개, 주방세제 → 1L).
const defaultQty = (name: string, isHH: boolean): string => {
  const u = isHH ? householdUnitOf(name) : unitOf(name, fineCategoryOf(name));
  const amt = u === 'count' || u === 'liter' ? 1 : 100;
  return `${amt}${UNIT_SUFFIX[u]}`;
};

const EMOJI_FONT = Platform.OS === 'web' ? { fontFamily: '"Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif' } : null;

export function RegisterScreen({ kind }: { kind: 'food' | 'household' }) {
  const { shopping, registerToFridge } = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const isHousehold = kind === 'household';

  // 구매완료 중 아직 곳간에 안 넣은 항목을, 눌러 들어온 탭(식재료/생필품)만 스냅샷으로 담는다.
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    shopping
      .filter((x) => x.checked && !x.addedToFridge && (x.kind ?? 'food') === kind)
      .map((it) => ({
        id: it.id,
        shoppingId: it.id,
        name: it.name,
        loc: it.kind === 'household' ? 'household' : normLoc(infoFor(it.name).storage),
        expiry: null,
      }))
  );
  const [calFor, setCalFor] = useState<string | null>(null); // 달력을 연 항목 id

  const setLoc = (id: string, loc: Loc) => setDrafts((p) => p.map((d) => (d.id === id ? { ...d, loc } : d)));
  const setName = (id: string, name: string) => setDrafts((p) => p.map((d) => (d.id === id ? { ...d, name } : d)));
  // 같은 프리셋을 다시 누르면 해제(미설정).
  const togglePreset = (id: string, days: number) =>
    setDrafts((p) => p.map((d) => (d.id === id ? { ...d, expiry: d.expiry === isoInDays(days) ? null : isoInDays(days) } : d)));
  // 달력에서 고른 특정 날짜(과거 포함).
  const setExpiryDate = (id: string, isoDate: string) =>
    setDrafts((p) => p.map((d) => (d.id === id ? { ...d, expiry: isoDate } : d)));
  const removeDraft = (id: string) => setDrafts((p) => p.filter((d) => d.id !== id));
  const addDraft = () => setDrafts((p) => [...p, { id: `new-${uid()}`, name: '', loc: isHousehold ? 'household' : 'refrigerated', expiry: null }]);

  const validCount = drafts.filter((d) => d.name.trim()).length;
  const calDraft = drafts.find((d) => d.id === calFor); // 달력이 열린 항목

  const submit = () => {
    const entries: RegisterEntry[] = drafts
      .filter((d) => d.name.trim())
      .map((d) => {
        const name = d.name.trim();
        const isHH = d.loc === 'household';
        return {
          shoppingId: d.shoppingId,
          name,
          category: coarseFromFine(fineCategoryOf(name)),
          storage: d.loc,
          kind: isHH ? 'household' : undefined,
          qty: defaultQty(name, isHH),
          expiry: isHH ? null : d.expiry,
        };
      });
    if (!entries.length) return;
    registerToFridge(entries);
    // 넣은 결과를 곳간에서 바로 확인 — 생필품은 곳간의 생필품 탭, 식재료는 해당 보관위치 탭으로.
    nav.goToFridge(isHousehold ? 'household' : entries[0].storage);
    nav.closeOverlay();
  };

  return (
    <View style={s.root}>
      <ScreenHeader title={isHousehold ? '생필품 등록' : '식재료 등록'} onBack={() => nav.closeOverlay()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.sub}>
          {isHousehold ? '품목을 확인하고 곳간으로 옮기세요' : '보관위치와 유통기한을 확인하고 곳간에 넣으세요'}
        </Text>
        <View style={s.statusPill}>
          <View style={s.statusDot} />
          <Text style={s.statusText}>{validCount}개 품목 · 확인하고 곳간{isHousehold ? '으로 옮기세요' : '에 넣으세요'}</Text>
        </View>

        {drafts.map((d) => {
          const isHH = d.loc === 'household';
          const custom = d.expiry != null && !isPresetIso(d.expiry); // 달력으로 고른 특정 날짜
          return (
            <View key={d.id} style={s.card}>
              {/* 이름 (직접 수정 가능) + 삭제. 생필품은 이 줄만 있는 간단한 목록. */}
              <View style={[s.cardHead, isHousehold && s.cardHeadOnly]}>
                <Text style={s.emoji}>{isHH ? householdEmojiFor(d.name) : emojiFor(d.name, coarseFromFine(fineCategoryOf(d.name)))}</Text>
                <TextInput
                  value={d.name}
                  onChangeText={(t) => setName(d.id, t)}
                  placeholder="품목 이름"
                  placeholderTextColor={colors.inkAsst}
                  style={s.nameInput}
                />
                <Pressable onPress={() => removeDraft(d.id)} hitSlop={8}>
                  <Icon name="x" size={20} color={colors.inkAsst} weight="bold" />
                </Pressable>
              </View>

              {/* 생필품은 보관위치·유통기한이 필요 없어 이름 목록만 보여준다. */}
              {!isHousehold && (
                <>
                  {/* 보관위치 — 냉장/냉동/상온/생필품 */}
                  <View style={s.locRow}>
                    {LOCS.map((o) => {
                      const on = d.loc === o.code;
                      return (
                        <Pressable key={o.code} style={[s.locBtn, on && s.locBtnOn]} onPress={() => setLoc(d.id, o.code)}>
                          <Text style={[s.locText, on && s.locTextOn]}>{o.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* 유통기한 — +7/+30일 또는 날짜 직접 선택. (생필품으로 바꾼 항목은 '상시 보관') */}
                  <View style={s.expRow}>
                    <Text style={s.expLabel}>유통기한</Text>
                    {isHH ? (
                      <View style={s.foreverPill}>
                        <Text style={s.foreverText}>상시 보관</Text>
                      </View>
                    ) : (
                      <View style={s.expChips}>
                        {EXPIRY_PRESETS.map((days) => {
                          const on = d.expiry === isoInDays(days);
                          return (
                            <Pressable key={days} style={[s.expChip, on && s.expChipOn]} onPress={() => togglePreset(d.id, days)}>
                              <Text style={[s.expChipText, on && s.expChipTextOn]}>+{days}일</Text>
                            </Pressable>
                          );
                        })}
                        {/* 날짜 직접 선택 — 'YYYY-MM-DD'로 적힌 소비기한용(과거도 가능) */}
                        <Pressable style={[s.expChip, s.dateChip, custom && s.expChipOn]} onPress={() => setCalFor(d.id)}>
                          <Icon name="calendar" size={12} color={custom ? SEL_GREEN : colors.inkAlt} weight="bold" />
                          <Text style={[s.expChipText, custom && s.expChipTextOn]}>{custom ? fmtMD(fromISO(d.expiry!)) : '날짜'}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          );
        })}

        {/* 품목 직접 추가 */}
        <Pressable style={s.addRow} onPress={addDraft}>
          <Icon name="plus" size={16} color={colors.inkAlt} weight="bold" />
          <Text style={s.addText}>품목 직접 추가</Text>
        </Pressable>

        {drafts.length === 0 && <Text style={s.empty}>곳간에 넣을 품목이 없어요.</Text>}
      </ScrollView>

      {/* 하단 확정 버튼 */}
      <View style={[s.footer, { paddingBottom: 16 + insets.bottom }]}>
        <AppButton
          label={
            isHousehold
              ? (validCount > 0 ? `${validCount}개 곳간으로 이동하기` : '곳간으로 이동하기')
              : (validCount > 0 ? `${validCount}개 곳간에 넣기` : '곳간에 넣기')
          }
          onPress={submit}
          disabled={validCount === 0}
        />
      </View>

      {/* 소비기한 날짜 선택 달력 — 지난 날짜도 고를 수 있다(냉동 보관 등) */}
      <DatePickerModal
        visible={calFor !== null}
        value={calDraft?.expiry ? fromISO(calDraft.expiry) : addDays(startOfToday(), 7)}
        title="소비기한 선택"
        hint="포장에 적힌 날짜로 고르세요. 지난 날짜도 선택할 수 있어요."
        disableBefore={null}
        disableAfter={null}
        onSelect={(dd) => { if (calFor) setExpiryDate(calFor, toISO(dd)); setCalFor(null); }}
        onClose={() => setCalFor(null)}
        insetsBottom={insets.bottom}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  sub: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAlt, marginBottom: 12 },

  // 상태 배너 (초록 점 + 안내)
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryBg, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  statusText: { fontFamily: font.bold, fontSize: 13, color: colors.primaryDark },

  // 품목 카드
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  // 생필품 — 이름 줄만 있는 카드라 아래 구분선/여백을 없앤다.
  cardHeadOnly: { paddingBottom: 0, marginBottom: 0, borderBottomWidth: 0 },
  emoji: { fontSize: 22, ...(EMOJI_FONT || {}) },
  nameInput: { flex: 1, fontFamily: font.bold, fontSize: 16, color: colors.ink, padding: 0 },

  // 보관위치 4버튼
  locRow: { flexDirection: 'row', gap: 7 },
  locBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  locBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  locText: { fontFamily: font.bold, fontSize: 13.5, color: colors.inkAlt },
  locTextOn: { color: colors.white },

  // 유통기한
  expRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  expLabel: { fontFamily: font.bold, fontSize: 13.5, color: colors.inkAlt, marginRight: 12 },
  // +7일 · +30일 · 날짜 = 한 줄에 들어간다. wrap은 긴 날짜(12/31 등) 대비 안전장치.
  expChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, flex: 1 },
  expChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.fill, borderWidth: 1.5, borderColor: colors.line },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expChipOn: { backgroundColor: SEL_GREEN_BG, borderColor: SEL_GREEN },
  expChipText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  expChipTextOn: { color: SEL_GREEN },
  foreverPill: { paddingVertical: 7, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryBg },
  foreverText: { fontFamily: font.bold, fontSize: 13, color: colors.primary },

  // 품목 직접 추가 (점선 버튼)
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 16, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.lineStrong, borderStyle: 'dashed', marginTop: 2 },
  addText: { fontFamily: font.bold, fontSize: 14.5, color: colors.inkAlt },
  empty: { fontFamily: font.medium, fontSize: 14, color: colors.inkAsst, textAlign: 'center', marginTop: 30 },

  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
});
