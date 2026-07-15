// 장보기 — 식재료 / 생활용품 탭. 각 탭은 구매목록(미구매) + 구매 완료.
//  · 식재료: 자동추천(위쪽) + 직접추가를 '구매목록'으로 묶음. 항목 탭 = 냉장고에 추가 / 이름 수정 / 삭제.
//  · 생활용품: 함께 살 휴지·세제 등. 식재료처럼 카테고리에서 골라 담고 이모지 타일로 보인다.
//    (냉장고에는 들어가지 않으므로 항목 탭 = 이름 수정 / 삭제만)
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, KeyboardAvoidingView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon, IconName } from '../components/Icon';
import { FoodTile, HouseholdTile, SectionTitle, AppButton, HeaderActions, SheetHandle } from '../components/ui';
import { FINE_CATEGORIES, FINE_CATEGORY_ITEMS, HOUSEHOLD_CATEGORIES, HOUSEHOLD_CATEGORY_ITEMS } from '../data/constants';
import { useApp, ShoppingItem, ShoppingKind } from '../data/store';
import { useNav } from '../navigation/nav';

const SOURCE_LABEL: Record<string, string> = {
  manual: '직접 추가',
  low_stock: '냉장고에서 부족',
  recipe_missing: '레시피 부족 재료',
  expired: '소비기한 지남',
  near_expiry: '소비기한 임박',
};

const TABS: { key: ShoppingKind; label: string }[] = [
  { key: 'food', label: '식재료' },
  { key: 'household', label: '생활용품' },
];

const recent = (a: ShoppingItem, b: ShoppingItem) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
const isAuto = (x: ShoppingItem) => x.source !== 'manual' && (x.kind ?? 'food') === 'food';
// 천 단위 콤마 (RN 엔진 무관하게 안전하게). 예: 41300 → "41,300"
const won = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function ShoppingScreen() {
  const insets = useSafeAreaInsets();
  // 바텀시트는 화면 하단에 붙으므로 실기기 제스처 바만큼 더 띄워 마지막 버튼(삭제)이 바닥에 붙지 않게 한다.
  const sheetPad = Platform.OS === 'web' ? 30 : insets.bottom + 30;
  const { shopping, toggleShoppingChecked, addToShopping, renameShopping, removeShopping, clearCheckedShopping, setShoppingPrice, moveCheckedToFridge } = useApp();
  const nav = useNav();
  const [tab, setTab] = useState<ShoppingKind>('food');
  const [pricingId, setPricingId] = useState<string | null>(null); // 금액 인라인 편집 중인 행
  const [priceDraft, setPriceDraft] = useState('');
  const [moveOpen, setMoveOpen] = useState(false); // 곳간으로 이동 확인
  const [addOpen, setAddOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false); // 장보기 사용법 안내
  const [pickCat, setPickCat] = useState<string | null>(null); // 펼친 카테고리 (식재료 전용)
  const [selected, setSelected] = useState<string[]>([]); // 카테고리에서 고른(아직 담기 전) 재료들
  const [clearOpen, setClearOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [actionItem, setActionItem] = useState<ShoppingItem | null>(null); // 액션 시트
  const [editItem, setEditItem] = useState<ShoppingItem | null>(null); // 이름 수정
  const [editName, setEditName] = useState('');

  // 현재 탭(식재료/생활용품)에 속한 항목.
  const inTab = (x: ShoppingItem) => (tab === 'food' ? (x.kind ?? 'food') === 'food' : x.kind === 'household');
  const unchecked = shopping.filter((x) => inTab(x) && !x.checked);
  // 구매목록 — 자동추천을 위쪽으로, 그 다음 직접추가. 각각 최근 추가가 위로. (생활용품은 자동추천이 없어 그대로)
  const buyList = [...unchecked.filter(isAuto).sort(recent), ...unchecked.filter((x) => !isAuto(x)).sort(recent)];
  // 구매완료 — 최근 변경(체크)된 것이 가장 위로.
  const done = shopping.filter((x) => inTab(x) && x.checked).sort(recent);
  // 합계 — 현재 탭 구매완료 합계 + 두 탭(식재료+생활용품) 합친 전체 합계. 금액 입력된 것만 더한다.
  const tabTotal = done.reduce((sum, x) => sum + (x.price ?? 0), 0);
  const grandTotal = shopping.filter((x) => x.checked).reduce((sum, x) => sum + (x.price ?? 0), 0);
  const movable = done.filter((x) => !x.addedToFridge); // 아직 곳간에 안 올린 구매완료 항목

  const startPrice = (it: ShoppingItem) => { setPriceDraft(it.price != null ? String(it.price) : ''); setPricingId(it.id); };
  const commitPrice = () => {
    if (!pricingId) return;
    const n = parseInt(priceDraft.replace(/[^0-9]/g, ''), 10);
    setShoppingPrice(pricingId, isNaN(n) || n <= 0 ? undefined : n);
    setPricingId(null); setPriceDraft('');
  };

  const openAdd = () => { setPickCat(null); setAddName(''); setSelected([]); setAddOpen(true); };
  const closeAdd = () => { setAddOpen(false); setPickCat(null); setAddName(''); setSelected([]); };
  const openCat = (code: string) => { setSelected([]); setPickCat(code); };
  const backToCats = () => { setSelected([]); setPickCat(null); };
  // 직접 입력 한 줄 추가 (식재료/생활용품 공용) — 현재 탭 kind로 담고 목록으로.
  const submitText = () => {
    if (addName.trim()) { addToShopping(addName.trim(), 'manual', undefined, tab); closeAdd(); }
  };
  // 카테고리 칩: 탭하면 선택만(하이라이트), 하단 '추가' 버튼으로 한 번에 담는다.
  const togglePick = (name: string) => setSelected((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));
  const addCount = selected.length + (addName.trim() ? 1 : 0);
  const commitAll = () => {
    if (!addCount) return;
    selected.forEach((n) => addToShopping(n, 'manual', undefined, tab));
    if (addName.trim()) addToShopping(addName.trim(), 'manual', undefined, tab);
    closeAdd();
  };

  // 추가 시트의 카테고리 — 식재료/생활용품 각각의 목록을 쓴다.
  const cats = tab === 'food' ? FINE_CATEGORIES : HOUSEHOLD_CATEGORIES;
  const catItems = tab === 'food' ? FINE_CATEGORY_ITEMS : HOUSEHOLD_CATEGORY_ITEMS;

  const saveEdit = () => {
    if (editItem && editName.trim()) renameShopping(editItem.id, editName.trim());
    setEditItem(null);
  };

  // 냉장고에 추가 — 식재료 추가 상세화면(IngredientForm)을 그대로 재사용한다. (식재료 전용)
  const openRestock = (item: ShoppingItem) => nav.openIngredientForm({ prefillName: item.name, shoppingId: item.id });

  // 항목 앞 타일 — 식재료는 식재료 이모지, 생활용품은 생활용품 이모지.
  const Lead = ({ item, size }: { item: ShoppingItem; size: number }) =>
    item.kind === 'household' ? (
      <HouseholdTile name={item.name} size={size} />
    ) : item.category ? (
      <FoodTile name={item.name} category={item.category} size={size} />
    ) : null;

  const Row = ({ item, checkSize = 22 }: { item: ShoppingItem; checkSize?: number }) => {
    const auto = isAuto(item);
    return (
      <View style={s.row}>
        <Pressable hitSlop={8} onPress={() => toggleShoppingChecked(item.id)}>
          {item.checked ? (
            <Icon name="check-circle" size={checkSize} color={colors.primary} weight="fill" />
          ) : (
            <View style={[s.ring, { width: checkSize, height: checkSize, borderRadius: checkSize / 2 }]} />
          )}
        </Pressable>
        <Pressable style={s.rowMain} onPress={() => setActionItem(item)}>
          <Lead item={item} size={34} />
          <View style={{ flex: 1 }}>
            <View style={s.nameLine}>
              <Text style={[s.name, item.checked && s.nameDone]} numberOfLines={1}>{item.name}</Text>
              {auto && <View style={s.autoBadge}><Text style={s.autoBadgeText}>비서추천</Text></View>}
              {item.checked && item.addedToFridge && (
                <View style={s.inTag}>
                  <Icon name="check" size={11} color={colors.primary} weight="bold" />
                  <Text style={s.inTagText}>입고됨</Text>
                </View>
              )}
            </View>
            {item.note ? <Text style={s.note}>{item.note}</Text> : auto ? <Text style={s.note}>{SOURCE_LABEL[item.source]}</Text> : null}
          </View>
          {/* 구매완료 행: 금액 인라인 입력/수정 · 구매목록 행: 자세히 보기 캐럿 */}
          {item.checked ? (
            pricingId === item.id ? (
              <TextInput
                autoFocus
                value={priceDraft}
                onChangeText={(t) => setPriceDraft(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                onBlur={commitPrice}
                onSubmitEditing={commitPrice}
                placeholder="0"
                placeholderTextColor={colors.inkAsst}
                style={s.priceInput}
                returnKeyType="done"
              />
            ) : (
              <Pressable hitSlop={6} onPress={() => startPrice(item)}>
                {item.price != null
                  ? <Text style={s.priceText}>{won(item.price)}원</Text>
                  : <Text style={s.priceEmpty}>금액 입력</Text>}
              </Pressable>
            )
          ) : (
            <Icon name="caret-right" size={16} color={colors.inkAsst} weight="bold" />
          )}
        </Pressable>
      </View>
    );
  };

  const emptyMsg = tab === 'food' ? '담은 재료가 없어요.' : '담을 생활용품을 추가해 보세요.';

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <Text style={s.title}>장보기 목록</Text>
            <Pressable onPress={() => setHelpOpen(true)} hitSlop={8}>
              <Icon name="info" size={20} color={colors.inkAsst} />
            </Pressable>
          </View>
          <Text style={s.subtitle}>마트에서 하나씩 체크하며 담으세요</Text>
        </View>
        <HeaderActions showSearch={false} showBell={false} />
      </View>

      {/* 탭 — 식재료 / 생활용품 (냉장고 보기방식 탭과 동일한 밑줄 스타일) */}
      <View style={s.tabs}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Pressable key={t.key} style={s.tab} onPress={() => setTab(t.key)}>
              <Text style={[s.tabText, on && s.tabTextOn]}>{t.label}</Text>
              <View style={[s.tabUnderline, on && s.tabUnderlineOn]} />
            </Pressable>
          );
        })}
      </View>

      {/* 전체 합계 — 식재료+생활용품 합친 이번 장보기 총액 (항상 위에 고정) */}
      {grandTotal > 0 && (
        <View style={s.grandBar}>
          <Text style={s.grandLabel}>이번 장보기</Text>
          <Text style={s.grandValue}>{won(grandTotal)}원</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 22, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <SectionTitle title="구매목록" count={buyList.length} actionLabel="추가" onAction={openAdd} compact style={s.secTitle} />
        <View style={s.group}>
          {buyList.length ? buyList.map((it) => <Row key={it.id} item={it} checkSize={18} />) : <Text style={s.empty}>{emptyMsg}</Text>}
        </View>

        {done.length > 0 && (
          <>
            {/* 구매완료 헤더 — 곳간으로 이동 + 전체 삭제 두 액션 */}
            <View style={s.doneHead}>
              <View style={s.doneHeadLeft}>
                <Text style={s.doneHeadTitle}>구매 완료</Text>
                <Text style={s.doneHeadCount}>{done.length}</Text>
              </View>
              <View style={s.doneActions}>
                <Pressable style={[s.moveBtn, !movable.length && s.moveBtnOff]} onPress={() => movable.length && setMoveOpen(true)} disabled={!movable.length}>
                  <Icon name="package" size={14} color={movable.length ? colors.primary : colors.inkAsst} weight="bold" />
                  <Text style={[s.moveBtnText, !movable.length && { color: colors.inkAsst }]}>곳간으로</Text>
                </Pressable>
                <Pressable style={s.clearBtn} onPress={() => setClearOpen(true)} hitSlop={6}>
                  <Icon name="trash" size={16} color={colors.inkAsst} />
                </Pressable>
              </View>
            </View>
            {tabTotal > 0 && (
              <View style={s.tabTotalRow}>
                <Text style={s.tabTotalLabel}>{tab === 'food' ? '식재료' : '생활용품'} 합계</Text>
                <Text style={s.tabTotalValue}>{won(tabTotal)}원</Text>
              </View>
            )}
            <View style={s.group}>{done.map((it) => <Row key={it.id} item={it} />)}</View>
          </>
        )}
      </ScrollView>

      {/* 추가 모달 — 식재료는 카테고리+직접입력(긴 시트), 생활용품은 이름 입력만(짧은 시트) */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={closeAdd}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <Pressable style={s.backdrop} onPress={closeAdd}>
            <Pressable style={[s.addSheet, { paddingBottom: sheetPad }]}>
              <SheetHandle />
              <View style={s.addHead}>
                <Text style={s.sheetTitle}>{tab === 'food' ? '장보기 항목 추가' : '생활용품 추가'}</Text>
                <Pressable onPress={closeAdd} hitSlop={8}>
                  <Icon name="x" size={20} color={colors.inkAlt} weight="bold" />
                </Pressable>
              </View>

              {pickCat === null ? (
                <>
                  {/* 카테고리 고르기 전: 상단 직접 입력(+추가 버튼) */}
                  <View style={s.addInputRow}>
                    <Icon name="plus" size={18} color={colors.inkAsst} weight="bold" />
                    <TextInput
                      value={addName}
                      onChangeText={setAddName}
                      placeholder={tab === 'food' ? '식재료 이름 입력' : '생활용품 이름 입력'}
                      placeholderTextColor={colors.inkAsst}
                      style={s.addInput}
                      onSubmitEditing={submitText}
                      returnKeyType="done"
                    />
                    <Pressable onPress={submitText} disabled={!addName.trim()} style={[s.addBtn, !addName.trim() && s.addBtnOff]}>
                      <Text style={s.addBtnText}>추가</Text>
                    </Pressable>
                  </View>

                  <Text style={s.pickHint}>카테고리에서 고르기</Text>
                  <ScrollView style={s.pickScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={s.catGrid}>
                      {cats.map((c) => (
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
                    <Text style={s.catBadgeEmoji}>{cats.find((c) => c.code === pickCat)?.emoji}</Text>
                    <Text style={s.catBadgeLabel}>{cats.find((c) => c.code === pickCat)?.label}</Text>
                  </Pressable>
                  <ScrollView style={s.pickScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={s.chipWrap}>
                      {[...(catItems[pickCat] ?? [])].sort((a, b) => a.localeCompare(b, 'ko')).map((n) => {
                        const picked = selected.includes(n); // 이번에 선택(아직 담기 전)
                        return (
                          <Pressable key={n} style={[s.chip, picked && s.chipOn]} onPress={() => togglePick(n)}>
                            <Text style={[s.chipText, picked && s.chipTextOn]}>{n}</Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* 목록에 없으면 직접 입력 — 추가 버튼 없이 하단 배치 */}
                    <Text style={s.orLabel}>목록에 없으면 직접 입력</Text>
                    <View style={s.directRow}>
                      <TextInput
                        value={addName}
                        onChangeText={setAddName}
                        placeholder={tab === 'food' ? '식재료 이름' : '생활용품 이름'}
                        placeholderTextColor={colors.inkAsst}
                        style={s.directInput}
                        onSubmitEditing={submitText}
                        returnKeyType="done"
                      />
                    </View>
                  </ScrollView>
                  <AppButton label={addCount ? `${addCount}개 추가` : '추가'} onPress={commitAll} disabled={!addCount} style={{ marginTop: 12 }} />
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
              <AppButton label="전체 삭제" onPress={() => { clearCheckedShopping(tab); setClearOpen(false); }} style={{ flex: 1.4 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 곳간으로 이동 확인 */}
      <Modal visible={moveOpen} transparent animationType="fade" onRequestClose={() => setMoveOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setMoveOpen(false)}>
          <Pressable style={[s.sheet, { paddingBottom: sheetPad }]}>
            <SheetHandle />
            <Text style={s.sheetTitle}>구매 완료 {movable.length}개를 곳간으로 옮길까요?</Text>
            <Text style={s.confirmSub}>
              {tab === 'food'
                ? '식재료는 보관위치 미지정(미분류)으로 곳간에 담겨요. 곳간에서 냉장·냉동·실온을 정해주세요.'
                : '생활용품이 곳간에 담겨요.'}
            </Text>
            <View style={s.dialogBtns}>
              <AppButton label="취소" variant="ghost" onPress={() => setMoveOpen(false)} style={{ flex: 1 }} />
              <AppButton label="곳간으로 이동" onPress={() => { moveCheckedToFridge(tab); setMoveOpen(false); }} style={{ flex: 1.4 }} />
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
                  <Lead item={actionItem} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetName}>{actionItem.name}</Text>
                    <Text style={s.note}>{actionItem.note ?? (isAuto(actionItem) ? SOURCE_LABEL[actionItem.source] : actionItem.kind === 'household' ? '생활용품' : '직접 추가')}</Text>
                  </View>
                </View>
                {/* 냉장고에 추가 — 식재료만, 아직 입고 전인 경우 */}
                {actionItem.kind !== 'household' && !actionItem.addedToFridge && (
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
                  placeholder="이름"
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

      {/* 장보기 사용법 안내 */}
      <Modal visible={helpOpen} transparent animationType="fade" onRequestClose={() => setHelpOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setHelpOpen(false)}>
          <Pressable style={[s.sheet, { paddingBottom: sheetPad }]}>
            <SheetHandle />
            <Text style={s.sheetTitle}>장보기 이렇게 써요</Text>
            <View style={s.helpList}>
              <HelpStep icon="list-checks" title="식재료 · 생활용품 탭" desc="식재료와 함께 살 생활용품(휴지·세제 등)을 따로 적어두고 한 번에 장 볼 수 있어요." />
              <HelpStep icon="check-circle" title="담은 항목을 체크" desc="장 보면서 담은 항목을 체크하면 ‘구매 완료’로 내려가요." />
              <HelpStep icon="snowflake" title="구매 완료 → 냉장고에 추가" desc="식재료는 구매 완료 후 눌러서 바로 냉장고에 넣을 수 있어요." />
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
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAlt, marginTop: 5 },

  // 탭 (식재료 / 생활용품) — 냉장고 viewTabs와 동일한 밑줄 스타일
  tabs: { flexDirection: 'row', marginHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { flex: 1, alignItems: 'center' },
  tabText: { fontFamily: font.bold, fontSize: 15, color: colors.inkAsst, paddingVertical: 9 },
  tabTextOn: { color: colors.ink },
  tabUnderline: { height: 2.5, width: '100%', backgroundColor: 'transparent', marginBottom: -1 },
  tabUnderlineOn: { backgroundColor: colors.ink },

  secTitle: { marginBottom: 8 },
  secTitleGap: { marginTop: 14, marginBottom: 8 },

  group: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  ring: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.lineStrong },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: font.bold, fontSize: 15, color: colors.ink, flexShrink: 1 },
  nameDone: { color: colors.inkAsst, textDecorationLine: 'line-through' },
  note: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkAlt, marginTop: 2 },
  autoBadge: { backgroundColor: colors.primaryBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
  autoBadgeText: { fontFamily: font.bold, fontSize: 10, color: colors.primary },
  inTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primaryBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill },
  inTagText: { fontFamily: font.bold, fontSize: 10, color: colors.primary },

  // 금액 인라인 입력/표시 (구매완료 행 우측)
  priceText: { fontFamily: font.extrabold, fontSize: 14, color: colors.ink },
  priceEmpty: { fontFamily: font.semibold, fontSize: 12.5, color: colors.inkAsst },
  priceInput: { fontFamily: font.extrabold, fontSize: 14, color: colors.primary, minWidth: 70, textAlign: 'right', paddingVertical: 2, borderBottomWidth: 1.5, borderBottomColor: colors.primary },

  // 전체 합계 바 (탭 아래 고정)
  grandBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: colors.primaryBg },
  grandLabel: { fontFamily: font.bold, fontSize: 14, color: colors.primaryDark },
  grandValue: { fontFamily: font.extrabold, fontSize: 20, color: colors.primaryDark, letterSpacing: -0.5 },

  // 구매완료 헤더 (곳간으로 이동 + 전체 삭제)
  doneHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  doneHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  doneHeadTitle: { fontFamily: font.extrabold, fontSize: 16, color: colors.ink },
  doneHeadCount: { fontFamily: font.bold, fontSize: 13, color: colors.inkAsst },
  doneActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 11, borderRadius: radius.pill, backgroundColor: colors.primaryBg },
  moveBtnOff: { backgroundColor: colors.fill },
  moveBtnText: { fontFamily: font.bold, fontSize: 12.5, color: colors.primary },
  clearBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill },

  // 탭별 합계 줄
  tabTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
  tabTotalLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.inkAlt },
  tabTotalValue: { fontFamily: font.extrabold, fontSize: 15, color: colors.ink },
  empty: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAsst, paddingVertical: 16, textAlign: 'center' },

  kav: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,24,18,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  // 식재료 추가 시트 — 길게(상단 입력 + 하단 카테고리)
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
  dialogBtns: { flexDirection: 'row', gap: 10, marginTop: 24 },

  addHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickScroll: { flex: 1, marginTop: 6 },
  pickHint: { fontFamily: font.bold, fontSize: 12.5, color: colors.inkAlt, marginTop: 16, marginBottom: 8 },
  // 카테고리 선택 후 하단 직접 입력 (식재료 추가 화면과 동일)
  orLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.inkAsst, marginTop: 20, marginBottom: 10 },
  directRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 14, marginBottom: 4 },
  directInput: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink, paddingVertical: 12 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  catTile: { width: '31.5%', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: 5 },
  catEmoji: { fontSize: 24 },
  catLabel: { fontFamily: font.bold, fontSize: 12, color: colors.ink },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: colors.primaryBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, marginTop: 12 },
  catBadgeEmoji: { fontSize: 16 },
  catBadgeLabel: { fontFamily: font.bold, fontSize: 13.5, color: colors.ink },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.fill, borderWidth: 1.5, borderColor: colors.line },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: font.bold, fontSize: 13.5, color: colors.ink },
  chipTextOn: { color: colors.white },

  // 사용법 안내
  helpList: { gap: 14, marginTop: 8 },
  helpStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  helpIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  helpStepTitle: { fontFamily: font.bold, fontSize: 14.5, color: colors.ink },
  helpStepDesc: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkAlt, marginTop: 3, lineHeight: 18 },
});
