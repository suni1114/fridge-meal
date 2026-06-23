// 장보기 (spec §9.11~9.12) — 자동 추천 / 직접 추가 / 구매 완료
//  · 체크 = 구매 완료 토글  · 항목 탭 = 액션(냉장고에 추가 / 이름 수정 / 삭제)
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, KeyboardAvoidingView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon, IconName } from '../components/Icon';
import { FoodTile, SectionTitle, AppButton, HeaderActions, SheetHandle } from '../components/ui';
import { STORAGE_LABEL, FINE_CATEGORIES, FINE_CATEGORY_ITEMS, fineCategoryOf, coarseFromFine, unitOf, UNIT_SUFFIX, stockFromQty, QtyUnit } from '../data/constants';
import { useApp, ShoppingItem, infoFor } from '../data/store';
import { fromISO, toISO, todayISO, startOfToday, addDays, fmtDot } from '../data/date';
import { uid } from '../data/id';
import { DatePickerModal } from './IngredientFormScreen';

const SOURCE_LABEL: Record<string, string> = {
  manual: '직접 추가',
  low_stock: '냉장고에서 부족',
  recipe_missing: '레시피 부족 재료',
  expired: '소비기한 지남',
  near_expiry: '소비기한 임박',
};
const STORAGE_PICKS = ['refrigerated', 'frozen', 'room_temp'];
const STORAGE_ICONS: Record<string, IconName> = { refrigerated: 'thermometer-cold', frozen: 'snowflake', room_temp: 'sun-horizon' };
const UNIT_PICKS: { code: QtyUnit; label: string }[] = [
  { code: 'count', label: '개수' },
  { code: 'gram', label: '그람(g)' },
  { code: 'percent', label: '퍼센트(%)' },
];

export function ShoppingScreen() {
  const insets = useSafeAreaInsets();
  // 바텀시트는 화면 하단에 붙으므로 실기기 제스처 바만큼 더 띄워 마지막 버튼(삭제)이 바닥에 붙지 않게 한다.
  const sheetPad = Platform.OS === 'web' ? 30 : insets.bottom + 30;
  const { shopping, toggleShoppingChecked, addToShopping, renameShopping, removeShopping, clearCheckedShopping, upsertFridge, markShoppingDone } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false); // 장보기 사용법 안내
  const [pickCat, setPickCat] = useState<string | null>(null); // 펼친 카테고리
  const [selected, setSelected] = useState<string[]>([]); // 카테고리에서 고른(아직 담기 전) 재료들
  const [clearOpen, setClearOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [actionItem, setActionItem] = useState<ShoppingItem | null>(null); // 액션 시트
  const [editItem, setEditItem] = useState<ShoppingItem | null>(null); // 이름 수정
  const [editName, setEditName] = useState('');
  // 냉장고 입고 바텀시트
  const [restock, setRestock] = useState<ShoppingItem | null>(null);
  const [rFineCat, setRFineCat] = useState('etc');
  const [rStorage, setRStorage] = useState('refrigerated');
  const [rUnit, setRUnit] = useState<QtyUnit>('count');
  const [rAmount, setRAmount] = useState('1');
  const [rExpiry, setRExpiry] = useState<string | null>(null);
  const [rCalOpen, setRCalOpen] = useState(false);
  const [rUnitOpen, setRUnitOpen] = useState(false); // 단위 풀다운 열림

  // 자동 추천 — 최근 추가된 것이 가장 위로.
  const auto = shopping.filter((x) => x.source !== 'manual' && !x.checked).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  // 직접 추가 — 최근 추가한 것이 가장 위로.
  const manual = shopping.filter((x) => x.source === 'manual' && !x.checked).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  // 구매완료 — 최근 변경(체크)된 것이 가장 위로.
  const done = shopping.filter((x) => x.checked).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));

  // 카테고리 모드: 이미 목록(미구매)에 담긴 이름들 — 칩 토글/체크 표시에 사용.
  const inListNames = new Set(shopping.filter((x) => !x.checked).map((x) => x.name));
  const openAdd = () => { setPickCat(null); setAddName(''); setSelected([]); setAddOpen(true); };
  const closeAdd = () => { setAddOpen(false); setPickCat(null); setAddName(''); setSelected([]); };
  const openCat = (code: string) => { setSelected([]); setPickCat(code); };
  const backToCats = () => { setSelected([]); setPickCat(null); };
  const submitText = () => {
    if (addName.trim()) { addToShopping(addName.trim(), 'manual'); setAddName(''); }
  };
  // 카테고리 칩: 탭하면 선택만(하이라이트), 하단 '추가' 버튼으로 한 번에 담는다.
  const togglePick = (name: string) => setSelected((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));
  const commitPicks = () => { selected.forEach((n) => addToShopping(n, 'manual')); setSelected([]); };

  const saveEdit = () => {
    if (editItem && editName.trim()) renameShopping(editItem.id, editName.trim());
    setEditItem(null);
  };

  // 냉장고 입고 — 카테고리/보관/단위/수량/소비기한을 정해 냉장고에 등록(장보기는 완료 처리, 화면 이동 없음)
  const normStorage = (sgg: string) => (STORAGE_PICKS.includes(sgg) ? sgg : 'room_temp');
  const openRestock = (item: ShoppingItem) => {
    const fc = fineCategoryOf(item.name, item.category);
    const u = unitOf(item.name, fc);
    setRFineCat(fc);
    setRStorage(normStorage(infoFor(item.name).storage));
    setRUnit(u);
    setRAmount(u === 'count' ? '1' : '100');
    setRExpiry(null);
    setRUnitOpen(false);
    setRestock(item);
  };
  const rStep = rUnit === 'gram' ? 50 : rUnit === 'percent' ? 25 : 1;
  const adjustR = (d: number) => setRAmount((a) => String(Math.max(0, Math.round(((parseFloat(a) || 0) + d) * 10) / 10)));
  const pickRUnit = (u: QtyUnit) => { setRUnit(u); setRAmount(u === 'count' ? '1' : '100'); };
  const saveRestock = () => {
    if (!restock) return;
    const amt = parseFloat(rAmount) || 0;
    if (amt <= 0) return;
    upsertFridge({
      id: uid(),
      name: restock.name,
      category: coarseFromFine(rFineCat),
      storage: rStorage,
      stock: stockFromQty(rUnit, amt),
      qty: `${amt}${UNIT_SUFFIX[rUnit]}`,
      expiry: rExpiry,
      added: todayISO(),
    });
    markShoppingDone(restock.id);
    setRestock(null); // 냉장고로 이동하지 않고 장보기에 머문다
  };

  const Row = ({ item }: { item: ShoppingItem }) => (
    <View style={s.row}>
      <Pressable hitSlop={8} onPress={() => toggleShoppingChecked(item.id)}>
        {item.checked ? <Icon name="check-circle" size={22} color={colors.primary} weight="fill" /> : <View style={s.ring} />}
      </Pressable>
      <Pressable style={s.rowMain} onPress={() => setActionItem(item)}>
        {item.category && <FoodTile name={item.name} category={item.category} size={34} />}
        <View style={{ flex: 1 }}>
          <Text style={[s.name, item.checked && s.nameDone]}>{item.name}</Text>
          {/* 직접 추가 항목엔 보조문구를 숨기고, 자동 추천/메모가 있을 때만 표시 */}
          {item.note ? (
            <Text style={s.note}>{item.note}</Text>
          ) : item.source !== 'manual' ? (
            <Text style={s.note}>{SOURCE_LABEL[item.source]}</Text>
          ) : null}
        </View>
        {item.checked && item.addedToFridge ? (
          <View style={s.inTag}>
            <Icon name="snowflake" size={12} color={colors.primary} weight="fill" />
            <Text style={s.inTagText}>입고됨</Text>
          </View>
        ) : (
          <Icon name="caret-right" size={16} color={colors.inkAsst} weight="bold" />
        )}
      </Pressable>
    </View>
  );

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <Text style={s.title}>장보기</Text>
          <Pressable onPress={() => setHelpOpen(true)} hitSlop={8}>
            <Icon name="info" size={20} color={colors.inkAsst} />
          </Pressable>
        </View>
        <HeaderActions showSearch={false} showBell={false} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <SectionTitle title="자동 추천" count={auto.length} compact style={s.secTitle} />
        <View style={s.group}>
          {auto.length ? auto.map((it) => <Row key={it.id} item={it} />) : <Text style={s.empty}>자동으로 모인 재료가 없어요.</Text>}
        </View>

        <SectionTitle title="직접 추가" count={manual.length} actionLabel="추가" onAction={openAdd} compact style={s.secTitleGap} />
        <View style={s.group}>
          {manual.length ? manual.map((it) => <Row key={it.id} item={it} />) : <Text style={s.empty}>직접 추가한 재료가 없어요.</Text>}
        </View>

        {done.length > 0 && (
          <>
            <SectionTitle title="구매 완료" count={done.length} actionLabel="전체 삭제" actionIcon="trash" onAction={() => setClearOpen(true)} compact style={s.secTitleGap} />
            <View style={s.group}>{done.map((it) => <Row key={it.id} item={it} />)}</View>
          </>
        )}
      </ScrollView>

      {/* 직접 추가 모달 — 상단 입력칸 + 하단 카테고리 (긴 시트) */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={closeAdd}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <Pressable style={s.backdrop} onPress={closeAdd}>
            <Pressable style={[s.addSheet, { paddingBottom: sheetPad }]}>
              <SheetHandle />
              <View style={s.addHead}>
                <Text style={s.sheetTitle}>장보기 항목 추가</Text>
                <Pressable onPress={closeAdd} hitSlop={8}>
                  <Icon name="x" size={20} color={colors.inkAlt} weight="bold" />
                </Pressable>
              </View>

              {/* 상단: 식재료 직접 입력 */}
              <View style={s.addInputRow}>
                <Icon name="plus" size={18} color={colors.inkAsst} weight="bold" />
                <TextInput
                  value={addName}
                  onChangeText={setAddName}
                  placeholder="식재료 이름 입력"
                  placeholderTextColor={colors.inkAsst}
                  style={s.addInput}
                  onSubmitEditing={submitText}
                  returnKeyType="done"
                />
                <Pressable onPress={submitText} disabled={!addName.trim()} style={[s.addBtn, !addName.trim() && s.addBtnOff]}>
                  <Text style={s.addBtnText}>추가</Text>
                </Pressable>
              </View>

              {/* 하단: 카테고리에서 고르기 */}
              {pickCat === null ? (
                <>
                  <Text style={s.pickHint}>카테고리에서 고르기</Text>
                  <ScrollView style={s.pickScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={s.catGrid}>
                      {FINE_CATEGORIES.map((c) => (
                        <Pressable key={c.code} style={s.catTile} onPress={() => openCat(c.code)}>
                          <Text style={s.catEmoji}>{c.emoji}</Text>
                          <Text style={s.catLabel}>{c.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </>
              ) : (
                <>
                  <Pressable style={s.catBadge} onPress={backToCats}>
                    <Icon name="caret-left" size={14} color={colors.primary} weight="bold" />
                    <Text style={s.catBadgeEmoji}>{FINE_CATEGORIES.find((c) => c.code === pickCat)?.emoji}</Text>
                    <Text style={s.catBadgeLabel}>{FINE_CATEGORIES.find((c) => c.code === pickCat)?.label}</Text>
                  </Pressable>
                  <ScrollView style={s.pickScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={s.chipWrap}>
                      {[...(FINE_CATEGORY_ITEMS[pickCat] ?? [])].sort((a, b) => a.localeCompare(b, 'ko')).map((n) => {
                        const added = inListNames.has(n); // 이미 목록에 담긴 재료
                        const picked = selected.includes(n); // 이번에 선택(아직 담기 전)
                        return (
                          <Pressable key={n} disabled={added} style={[s.chip, picked && s.chipOn, added && s.chipAdded]} onPress={() => togglePick(n)}>
                            <Text style={[s.chipText, picked && s.chipTextOn, added && s.chipTextAdded]}>{n}</Text>
                            {added ? <Icon name="check" size={13} color={colors.primary} weight="bold" /> : picked ? <Icon name="check" size={13} color={colors.white} weight="bold" /> : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                  <AppButton label={selected.length ? `${selected.length}개 추가` : '추가'} onPress={commitPicks} disabled={!selected.length} style={{ marginTop: 12 }} />
                </>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* 구매 완료 일괄 삭제 확인 */}
      <Modal visible={clearOpen} transparent animationType="fade" onRequestClose={() => setClearOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setClearOpen(false)}>
          <Pressable style={[s.sheet, { paddingBottom: sheetPad }]}>
            <SheetHandle />
            <Text style={s.sheetTitle}>구매 완료 {done.length}개를 모두 삭제할까요?</Text>
            <Text style={s.confirmSub}>장보기 목록에서만 지워져요. 이미 냉장고에 넣은 재료는 그대로 남아요.</Text>
            <View style={s.dialogBtns}>
              <AppButton label="취소" variant="ghost" onPress={() => setClearOpen(false)} style={{ flex: 1 }} />
              <AppButton label="전체 삭제" onPress={() => { clearCheckedShopping(); setClearOpen(false); }} style={{ flex: 1.4 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 항목 액션 시트 */}
      <Modal visible={!!actionItem} transparent animationType="fade" onRequestClose={() => setActionItem(null)}>
        <Pressable style={s.backdrop} onPress={() => setActionItem(null)}>
          <Pressable style={[s.sheet, { paddingBottom: sheetPad }]}>
            <SheetHandle />
            {actionItem && (
              <>
                <View style={s.sheetHead}>
                  {actionItem.category && <FoodTile name={actionItem.name} category={actionItem.category} size={40} />}
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetName}>{actionItem.name}</Text>
                    <Text style={s.note}>{actionItem.note ?? SOURCE_LABEL[actionItem.source]}</Text>
                  </View>
                </View>
                {!actionItem.addedToFridge && (
                  <SheetAction icon="snowflake" label="냉장고에 추가" onPress={() => { const it = actionItem; setActionItem(null); openRestock(it); }} />
                )}
                <SheetAction icon="pencil" label="이름 수정" onPress={() => { setEditName(actionItem.name); setEditItem(actionItem); setActionItem(null); }} />
                <SheetAction icon="trash" label="삭제" danger onPress={() => { removeShopping(actionItem.id); setActionItem(null); }} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* 이름 수정 모달 */}
      <Modal visible={!!editItem} transparent animationType="fade" onRequestClose={() => setEditItem(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <Pressable style={s.backdrop} onPress={() => setEditItem(null)}>
            <Pressable style={[s.sheet, { paddingBottom: sheetPad }]}>
              <SheetHandle />
              <Text style={s.sheetTitle}>이름 수정</Text>
              <View style={s.inputRow}>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="식재료 이름"
                  placeholderTextColor={colors.inkAsst}
                  style={s.input}
                  autoFocus
                  onSubmitEditing={saveEdit}
                />
              </View>
              <AppButton label="저장" onPress={saveEdit} disabled={!editName.trim()} style={{ marginTop: 14 }} />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>


      {/* 냉장고 입고 바텀시트 — 카테고리/보관/단위/수량/소비기한 */}
      <Modal visible={!!restock} transparent animationType="slide" onRequestClose={() => setRestock(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <Pressable style={s.backdrop} onPress={() => setRestock(null)}>
            <Pressable style={[s.restockSheet, { paddingBottom: sheetPad }]}>
              <SheetHandle />
              {restock && (
                <>
                  <View style={s.addHead}>
                    <Text style={s.sheetTitle}>냉장고에 추가 / {restock.name}</Text>
                    <Pressable onPress={() => setRestock(null)} hitSlop={8}>
                      <Icon name="x" size={20} color={colors.inkAlt} weight="bold" />
                    </Pressable>
                  </View>

                  <Text style={s.rLabel}>카테고리</Text>
                  <View style={s.rCatGrid}>
                    {FINE_CATEGORIES.map((c) => {
                      const on = c.code === rFineCat;
                      return (
                        <Pressable key={c.code} onPress={() => setRFineCat(c.code)} style={[s.rCatChip, on && s.rCatChipOn]}>
                          <Text style={s.rCatEmoji}>{c.emoji}</Text>
                          <Text style={[s.rCatLabel, on && s.rCatLabelOn]}>{c.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={s.rLabel}>보관 위치</Text>
                  <View style={s.rSegRow}>
                    {STORAGE_PICKS.map((st) => {
                      const on = st === rStorage;
                      return (
                        <Pressable key={st} onPress={() => setRStorage(st)} style={[s.rSeg, on && s.rSegOn]}>
                          <Icon name={STORAGE_ICONS[st]} size={15} color={on ? colors.white : colors.inkAlt} weight="bold" />
                          <Text style={[s.rSegText, on && s.rSegTextOn]}>{STORAGE_LABEL[st]}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={s.rLabel}>수량</Text>
                  <View style={s.rQtyRow}>
                    {/* 단위 풀다운 (왼쪽) */}
                    <View style={s.rUnitWrap}>
                      <Pressable style={s.rUnitBtn} onPress={() => setRUnitOpen((o) => !o)}>
                        <Text style={s.rUnitBtnText}>{UNIT_PICKS.find((u) => u.code === rUnit)?.label}</Text>
                        <Icon name="caret-down" size={14} color={colors.inkAlt} weight="bold" />
                      </Pressable>
                      {rUnitOpen && (
                        <View style={s.rUnitMenu}>
                          {UNIT_PICKS.map((u) => (
                            <Pressable key={u.code} style={s.rUnitOpt} onPress={() => { pickRUnit(u.code); setRUnitOpen(false); }}>
                              <Text style={[s.rUnitOptText, u.code === rUnit && { color: colors.primary }]}>{u.label}</Text>
                              {u.code === rUnit && <Icon name="check" size={14} color={colors.primary} weight="bold" />}
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                    {/* 수량 — 퍼센트는 칩 선택, 그 외는 스텝퍼(남는 폭 꽉 차게) */}
                    {rUnit === 'percent' ? (
                      <View style={s.rPctRow}>
                        {['100', '75', '50', '25'].map((p) => (
                          <Pressable key={p} onPress={() => setRAmount(p)} style={[s.rPctChip, rAmount === p && s.rPctChipOn]}>
                            <Text style={[s.rPctText, rAmount === p && s.rPctTextOn]}>{p}%</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <>
                        <View style={s.rStepper}>
                          <Pressable onPress={() => adjustR(-rStep)} hitSlop={8}><Icon name="minus-circle" size={26} color={colors.inkAlt} weight="fill" /></Pressable>
                          <TextInput value={rAmount} onChangeText={(t) => setRAmount(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={s.rStepInput} textAlign="center" />
                          <Pressable onPress={() => adjustR(rStep)} hitSlop={8}><Icon name="plus-circle" size={26} color={colors.inkAlt} weight="fill" /></Pressable>
                        </View>
                        <Text style={s.rUnitSuffix}>{UNIT_SUFFIX[rUnit]}</Text>
                      </>
                    )}
                  </View>

                  <Text style={s.rLabel}>소비기한</Text>
                  <Pressable style={s.rDateRow} onPress={() => setRCalOpen(true)}>
                    <Text style={[s.rDateText, !rExpiry && s.rDateMuted]}>{rExpiry ? fmtDot(fromISO(rExpiry)) : '날짜 선택 (선택)'}</Text>
                    <Icon name="caret-right" size={16} color={colors.inkAsst} weight="bold" />
                  </Pressable>

                  <AppButton label="냉장고에 추가" onPress={saveRestock} style={{ marginTop: 16 }} />
                </>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* 소비기한 달력 (등록 폼과 동일) */}
      <DatePickerModal
        visible={rCalOpen}
        value={rExpiry ? fromISO(rExpiry) : addDays(startOfToday(), 7)}
        title="소비기한 선택"
        hint="날짜를 고르면 남은 일수가 자동 계산돼요."
        disableBefore={startOfToday()}
        presets={[{ label: '미설정', days: null }, { label: '3일', days: 3 }, { label: '7일', days: 7 }, { label: '14일', days: 14 }, { label: '30일', days: 30 }]}
        presetSel={rExpiry === null ? 'none' : null}
        onClear={() => { setRExpiry(null); setRCalOpen(false); }}
        onSelect={(d) => { setRExpiry(toISO(d)); setRCalOpen(false); }}
        onClose={() => setRCalOpen(false)}
        insetsBottom={insets.bottom}
      />

      {/* 장보기 사용법 안내 */}
      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setHelpOpen(false)}>
          <Pressable style={[s.sheet, { paddingBottom: sheetPad }]}>
            <SheetHandle />
            <Text style={s.sheetTitle}>장보기 이렇게 써요</Text>
            <View style={s.helpList}>
              <HelpStep icon="check-circle" title="담은 재료를 체크" desc="장 보면서 담은 재료를 체크하면 ‘구매 완료’로 내려가요." />
              <HelpStep icon="snowflake" title="구매 완료 → 냉장고에 추가" desc="구매 완료 항목을 누르면 바로 냉장고에 넣을 수 있어요." />
              <HelpStep icon="arrows-clockwise" title="체크를 풀면 다시 장바구니로" desc="구매 완료에서 체크를 해제하면 ‘직접 추가’ 목록으로 되돌아가요. 깜빡하고 못 산 재료에 편해요." />
            </View>
            <AppButton label="알겠어요" onPress={() => setHelpOpen(false)} style={{ marginTop: 16 }} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function HelpStep({ icon, title, desc }: { icon: IconName; title: string; desc: string }) {
  return (
    <View style={s.helpStep}>
      <View style={s.helpIcon}><Icon name={icon} size={18} color={colors.primary} weight="fill" /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.helpStepTitle}>{title}</Text>
        <Text style={s.helpStepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function SheetAction({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={s.action} onPress={onPress}>
      <Icon name={icon} size={20} color={danger ? colors.coral : colors.ink} />
      <Text style={[s.actionText, danger && { color: colors.coral }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  secTitle: { marginBottom: 8 },
  secTitleGap: { marginTop: 14, marginBottom: 8 },

  group: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.lineStrong },
  name: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  nameDone: { color: colors.inkAsst, textDecorationLine: 'line-through' },
  note: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkAlt, marginTop: 2 },
  inTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryBg, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill },
  inTagText: { fontFamily: font.bold, fontSize: 11, color: colors.primary },
  empty: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAsst, paddingVertical: 16, textAlign: 'center' },

  kav: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,24,18,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  // 추가 시트 — 길게(상단 입력 + 하단 카테고리)
  addSheet: { backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30, height: '82%' },
  addInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 14, marginTop: 4 },
  addInput: { flex: 1, fontFamily: font.medium, fontSize: 16, color: colors.ink, paddingVertical: 14 },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill },
  addBtnOff: { backgroundColor: colors.lineStrong },
  addBtnText: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  sheetTitle: { fontFamily: font.extrabold, fontSize: 18, color: colors.ink, marginBottom: 8 },
  confirmSub: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAlt, marginTop: 2, lineHeight: 20 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  sheetName: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  inputRow: { backgroundColor: colors.fill, borderRadius: radius.md, paddingHorizontal: 14, marginTop: 8 },
  input: { fontFamily: font.medium, fontSize: 16, color: colors.ink, paddingVertical: 14 },

  action: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
  actionText: { fontFamily: font.bold, fontSize: 15.5, color: colors.ink },

  fieldLabel: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt, marginTop: 16, marginBottom: 8 },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pick: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.fill },
  pickOn: { backgroundColor: colors.primary },
  pickText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  pickTextOn: { color: colors.white },
  dialogBtns: { flexDirection: 'row', gap: 10, marginTop: 24 },

  // 추가 모달 — 헤더 + 방식 토글 + 카테고리 선택
  addHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.fill },
  segOn: { backgroundColor: colors.primary },
  segText: { fontFamily: font.bold, fontSize: 13.5, color: colors.inkAlt },
  segTextOn: { color: colors.white },
  pickScroll: { flex: 1, marginTop: 6 },
  pickHint: { fontFamily: font.bold, fontSize: 12.5, color: colors.inkAlt, marginTop: 16, marginBottom: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  catTile: { width: '31.5%', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: 5 },
  catEmoji: { fontSize: 24 },
  catLabel: { fontFamily: font.bold, fontSize: 12, color: colors.ink },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: colors.primaryBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, marginTop: 12 },
  catBadgeEmoji: { fontSize: 16 },
  catBadgeLabel: { fontFamily: font.bold, fontSize: 13.5, color: colors.ink },
  catBadgeChange: { fontFamily: font.bold, fontSize: 12, color: colors.primary, marginLeft: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.fill, borderWidth: 1.5, borderColor: colors.line },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipEmoji: { fontSize: 15 },
  chipText: { fontFamily: font.bold, fontSize: 13.5, color: colors.ink },
  chipTextOn: { color: colors.white },
  chipAdded: { backgroundColor: colors.primaryBg, borderColor: colors.primaryBg },
  chipTextAdded: { color: colors.primary },

  // 냉장고 입고 바텀시트
  restockSheet: { backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  restockScroll: { maxHeight: 400 },
  rLabel: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt, marginTop: 16, marginBottom: 8 },
  rCatRow: { gap: 8, paddingRight: 8 },
  rCatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rCatChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  rCatChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  rCatEmoji: { fontSize: 15 },
  rCatLabel: { fontFamily: font.bold, fontSize: 13, color: colors.ink },
  rCatLabelOn: { color: colors.white },
  rSegRow: { flexDirection: 'row', gap: 8 },
  rSeg: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  rSegOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  rSegText: { fontFamily: font.bold, fontSize: 13.5, color: colors.inkAlt },
  rSegTextOn: { color: colors.white },
  rPctRow: { flex: 1, flexDirection: 'row', gap: 6 },
  rPctChip: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  rPctChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  rPctText: { fontFamily: font.bold, fontSize: 13.5, color: colors.ink },
  rPctTextOn: { color: colors.white },
  rQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10 },
  rUnitWrap: { position: 'relative', zIndex: 20 },
  rUnitBtn: { width: 144, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  rUnitBtnText: { fontFamily: font.bold, fontSize: 13.5, color: colors.ink },
  rUnitMenu: { position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 144, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingVertical: 4, zIndex: 30, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  rUnitOpt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  rUnitOptText: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  rStepper: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md },
  rStepInput: { flex: 1, fontFamily: font.extrabold, fontSize: 18, color: colors.ink, minWidth: 30, padding: 0, textAlign: 'center' },
  rUnitSuffix: { fontFamily: font.bold, fontSize: 15, color: colors.inkAlt, marginLeft: 2 },
  rDateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13 },
  rDateText: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  rDateMuted: { fontFamily: font.medium, color: colors.inkAsst },

  // 사용법 안내
  helpList: { gap: 14, marginTop: 8 },
  helpStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  helpIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  helpStepTitle: { fontFamily: font.bold, fontSize: 14.5, color: colors.ink },
  helpStepDesc: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkAlt, marginTop: 3, lineHeight: 18 },
});
