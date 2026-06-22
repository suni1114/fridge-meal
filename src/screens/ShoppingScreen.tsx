// 장보기 (spec §9.11~9.12) — 자동 추천 / 직접 추가 / 구매 완료
//  · 체크 = 구매 완료 토글  · 항목 탭 = 액션(냉장고에 추가 / 이름 수정 / 삭제)
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon, IconName } from '../components/Icon';
import { FoodTile, SectionTitle, AppButton, HeaderActions } from '../components/ui';
import { STORAGE_LABEL, STOCK, StockLevel } from '../data/constants';
import { useApp, ShoppingItem, infoFor } from '../data/store';
import { daysUntil, isoInDays } from '../data/date';

const SOURCE_LABEL: Record<string, string> = {
  manual: '직접 추가',
  low_stock: '냉장고에서 부족',
  recipe_missing: '레시피 부족 재료',
  expired: '유통기한 지남',
};
const STORAGE_PICKS = ['refrigerated', 'frozen', 'room_temp', 'sauce'];
const DDAY_PICKS: { label: string; v: number | null }[] = [
  { label: '미입력', v: null },
  { label: '3일', v: 3 },
  { label: '7일', v: 7 },
  { label: '14일', v: 14 },
];

export function ShoppingScreen() {
  const insets = useSafeAreaInsets();
  // 바텀시트는 화면 하단에 붙으므로 실기기 제스처 바만큼 더 띄워 마지막 버튼(삭제)이 바닥에 붙지 않게 한다.
  const sheetPad = Platform.OS === 'web' ? 30 : insets.bottom + 30;
  const { shopping, toggleShoppingChecked, markAddedToFridge, addToShopping, renameShopping, removeShopping, clearCheckedShopping } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [actionItem, setActionItem] = useState<ShoppingItem | null>(null); // 액션 시트
  const [editItem, setEditItem] = useState<ShoppingItem | null>(null); // 이름 수정
  const [editName, setEditName] = useState('');
  const [restock, setRestock] = useState<ShoppingItem | null>(null);
  const [rStorage, setRStorage] = useState('refrigerated');
  const [rStock, setRStock] = useState<StockLevel>('enough');
  const [rExpiry, setRExpiry] = useState<string | null>(null);

  const auto = shopping.filter((x) => x.source !== 'manual' && !x.checked);
  const manual = shopping.filter((x) => x.source === 'manual' && !x.checked);
  const done = shopping.filter((x) => x.checked);

  const openRestock = (item: ShoppingItem) => {
    setRStorage(infoFor(item.name).storage);
    setRStock('enough');
    setRExpiry(null);
    setRestock(item);
  };
  const saveEdit = () => {
    if (editItem && editName.trim()) renameShopping(editItem.id, editName.trim());
    setEditItem(null);
  };

  const Row = ({ item }: { item: ShoppingItem }) => (
    <View style={s.row}>
      <Pressable hitSlop={8} onPress={() => toggleShoppingChecked(item.id)}>
        {item.checked ? <Icon name="check-circle" size={22} color={colors.primary} weight="fill" /> : <View style={s.ring} />}
      </Pressable>
      <Pressable style={s.rowMain} onPress={() => setActionItem(item)}>
        {item.category && <FoodTile name={item.name} category={item.category} size={40} />}
        <View style={{ flex: 1 }}>
          <Text style={[s.name, item.checked && s.nameDone]}>{item.name}</Text>
          <Text style={s.note}>{item.note ?? SOURCE_LABEL[item.source]}</Text>
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
        <Text style={s.title}>장보기</Text>
        <HeaderActions />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <SectionTitle title="자동 추천" count={auto.length} />
        <View style={s.group}>
          {auto.length ? auto.map((it) => <Row key={it.id} item={it} />) : <Text style={s.empty}>자동으로 모인 재료가 없어요.</Text>}
        </View>

        <SectionTitle title="직접 추가" count={manual.length} actionLabel="추가" onAction={() => setAddOpen(true)} style={{ marginTop: 22 }} />
        <View style={s.group}>
          {manual.length ? manual.map((it) => <Row key={it.id} item={it} />) : <Text style={s.empty}>직접 추가한 재료가 없어요.</Text>}
        </View>

        {done.length > 0 && (
          <>
            <SectionTitle title="구매 완료" count={done.length} actionLabel="전체 삭제" actionIcon="trash" onAction={() => setClearOpen(true)} style={{ marginTop: 22 }} />
            <View style={s.group}>{done.map((it) => <Row key={it.id} item={it} />)}</View>
          </>
        )}
      </ScrollView>

      {/* 직접 추가 모달 */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setAddOpen(false)}>
          <Pressable style={[s.sheet, { paddingBottom: sheetPad }]}>
            <Text style={s.sheetTitle}>장보기 항목 추가</Text>
            <View style={s.inputRow}>
              <TextInput
                value={addName}
                onChangeText={setAddName}
                placeholder="식재료 이름"
                placeholderTextColor={colors.inkAsst}
                style={s.input}
                autoFocus
                onSubmitEditing={() => {
                  if (addName.trim()) { addToShopping(addName.trim(), 'manual'); setAddName(''); setAddOpen(false); }
                }}
              />
            </View>
            <AppButton label="추가하기" onPress={() => { if (addName.trim()) { addToShopping(addName.trim(), 'manual'); setAddName(''); setAddOpen(false); } }} style={{ marginTop: 14 }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* 구매 완료 일괄 삭제 확인 */}
      <Modal visible={clearOpen} transparent animationType="fade" onRequestClose={() => setClearOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setClearOpen(false)}>
          <Pressable style={[s.sheet, { paddingBottom: sheetPad }]}>
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
        <Pressable style={s.backdrop} onPress={() => setEditItem(null)}>
          <Pressable style={[s.sheet, { paddingBottom: sheetPad }]}>
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
      </Modal>

      {/* 냉장고 입고 다이얼로그 */}
      <Modal visible={!!restock} transparent animationType="fade" onRequestClose={() => setRestock(null)}>
        <Pressable style={s.backdrop} onPress={() => setRestock(null)}>
          <Pressable style={[s.sheet, { paddingBottom: sheetPad }]}>
            {restock && (
              <>
                <Text style={s.sheetTitle}>{restock.name}를 냉장고에 추가할까요?</Text>

                <Text style={s.fieldLabel}>보관 위치</Text>
                <View style={s.pickRow}>
                  {STORAGE_PICKS.map((st) => {
                    const on = st === rStorage;
                    return (
                      <Pressable key={st} onPress={() => setRStorage(st)} style={[s.pick, on && s.pickOn]}>
                        <Text style={[s.pickText, on && s.pickTextOn]}>{STORAGE_LABEL[st]}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={s.fieldLabel}>남은 정도</Text>
                <View style={s.pickRow}>
                  {(['enough', 'low'] as StockLevel[]).map((lv) => {
                    const on = lv === rStock;
                    return (
                      <Pressable key={lv} onPress={() => setRStock(lv)} style={[s.pick, on && s.pickOn]}>
                        <Text style={[s.pickText, on && s.pickTextOn]}>{STOCK[lv].label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={s.fieldLabel}>유통기한 (선택)</Text>
                <View style={s.pickRow}>
                  {DDAY_PICKS.map((d) => {
                    const on = d.v === null ? rExpiry === null : daysUntil(rExpiry) === d.v;
                    return (
                      <Pressable key={d.label} onPress={() => setRExpiry(d.v === null ? null : isoInDays(d.v))} style={[s.pick, on && s.pickOn]}>
                        <Text style={[s.pickText, on && s.pickTextOn]}>{d.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={s.dialogBtns}>
                  <AppButton label="나중에" variant="ghost" onPress={() => setRestock(null)} style={{ flex: 1 }} />
                  <AppButton label="냉장고에 추가" onPress={() => { markAddedToFridge(restock.id, rStorage, rStock, rExpiry); setRestock(null); }} style={{ flex: 1.4 }} />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },

  group: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.lineStrong },
  name: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  nameDone: { color: colors.inkAsst, textDecorationLine: 'line-through' },
  note: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkAlt, marginTop: 2 },
  inTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryBg, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill },
  inTagText: { fontFamily: font.bold, fontSize: 11, color: colors.primary },
  empty: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAsst, paddingVertical: 16, textAlign: 'center' },

  backdrop: { flex: 1, backgroundColor: 'rgba(20,24,18,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
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
});
