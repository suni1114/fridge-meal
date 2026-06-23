// 냉장고 (spec §9.7) — 보관위치 스와이프 탭(냉장·냉동·실온) · 임박순 정렬 · 수량변경/수정/삭제/장보기
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon, IconName } from '../components/Icon';
import { FoodTile, DdayBadge, StockTag, HeaderActions, AppButton, SheetHandle } from '../components/ui';
import { STORAGE_LABEL, CATEGORY, STOCK, STOCK_ORDER, StockLevel, FINE_CATEGORIES, fineCategoryOf, unitOf, UNIT_SUFFIX, stockFromQty, QtyUnit } from '../data/constants';
import { useApp, FridgeItem } from '../data/store';
import { daysUntil } from '../data/date';
import { useNav } from '../navigation/nav';

// 보관 위치 탭 — 냉장·냉동·실온. 실온에는 양념/소스·기타 보관 재료도 함께 묶어 보여준다.
const TABS: { label: string; icon: IconName; match: (storage: string) => boolean }[] = [
  { label: '냉장', icon: 'thermometer-cold', match: (st) => st === 'refrigerated' },
  { label: '냉동', icon: 'snowflake', match: (st) => st === 'frozen' },
  { label: '실온', icon: 'sun-horizon', match: (st) => st === 'room_temp' || st === 'sauce' || st === 'etc' },
];

// 정렬 옵션 — 라벨은 간결하게.
const SORTS: { key: string; label: string }[] = [
  { key: 'expiry', label: '임박순' },
  { key: 'recent', label: '최신순' },
  { key: 'name', label: '이름순' },
  { key: 'stock', label: '잔량순' },
];

export function FridgeScreen() {
  const insets = useSafeAreaInsets();
  // 바텀시트는 화면 하단에 붙으므로 실기기 제스처 바만큼 더 띄워 하단 버튼이 바닥에 붙지 않게 한다.
  const sheetPad = Platform.OS === 'web' ? 30 : insets.bottom + 30;
  const { fridge, upsertFridge, removeFridge, addToShopping } = useApp();
  const nav = useNav();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'storage' | 'category'>('storage');
  const [tab, setTab] = useState(0);
  const [sortIdx, setSortIdx] = useState(0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sheet, setSheet] = useState<FridgeItem | null>(null);
  const [stockSheet, setStockSheet] = useState<FridgeItem | null>(null);
  const [stockAmount, setStockAmount] = useState(''); // 수량 변경 시트에서 편집 중인 수량
  const [w, setW] = useState(0);
  const pagerRef = useRef<ScrollView>(null);

  const sortKey = SORTS[sortIdx].key;
  const sortList = (arr: FridgeItem[]) => {
    if (sortKey === 'recent') return [...arr].reverse(); // 나중에 추가된 재료가 위로
    return [...arr].sort((a, b) => {
      if (sortKey === 'expiry') return (daysUntil(a.expiry) ?? 9999) - (daysUntil(b.expiry) ?? 9999);
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ko');
      if (sortKey === 'stock') return STOCK_ORDER.indexOf(b.stock) - STOCK_ORDER.indexOf(a.stock);
      return 0;
    });
  };
  const q = query.trim();
  const listFor = (i: number) => sortList(fridge.filter((x) => TABS[i].match(x.storage) && x.name.includes(q)));
  // 카테고리별 그룹 (비어있는 카테고리는 제외)
  const categoryGroups = FINE_CATEGORIES.map((c) => ({
    cat: c,
    items: sortList(fridge.filter((x) => x.name.includes(q) && fineCategoryOf(x.name, x.category) === c.code)),
  })).filter((g) => g.items.length > 0);
  const categoryTotal = categoryGroups.reduce((n, g) => n + g.items.length, 0);

  const goTab = (i: number) => {
    setTab(i);
    pagerRef.current?.scrollTo({ x: i * w, animated: true });
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (w > 0) {
      const i = Math.round(e.nativeEvent.contentOffset.x / w);
      if (i !== tab) setTab(i);
    }
  };

  // 식재료 저장 직후 nav.fridgeFocus가 설정되면 그 보관 위치(냉장/냉동/실온) 하위 탭으로 이동한다.
  // 다른 탭에서 들어와 페이지 폭(w)이 아직 0이면, 폭이 정해진 뒤(아래 의존성 w)에 페이저까지 맞추고 신호를 소비한다.
  useEffect(() => {
    const f = nav.fridgeFocus;
    if (!f) return;
    const i = TABS.findIndex((t) => t.match(f));
    if (i < 0) { nav.clearFridgeFocus(); return; }
    setViewMode('storage');
    setTab(i);
    if (w > 0) {
      pagerRef.current?.scrollTo({ x: i * w, animated: false });
      nav.clearFridgeFocus();
    }
  }, [nav.fridgeFocus, w]);

  // 식재료의 단위 — 저장된 수량 표기(qty)의 접미사 우선, 없으면 이름/카테고리 기준.
  const unitForItem = (it: FridgeItem): QtyUnit =>
    it.qty?.includes('%') ? 'percent' : it.qty?.includes('g') ? 'gram' : it.qty?.includes('개') ? 'count' : unitOf(it.name, fineCategoryOf(it.name, it.category));

  const openStock = (it: FridgeItem) => {
    const u = unitForItem(it);
    const f = it.qty ? parseFloat(it.qty) : NaN;
    setStockAmount(!isNaN(f) ? String(f) : u === 'count' ? '1' : '100');
    setStockSheet(it);
  };

  const stockUnit = stockSheet ? unitForItem(stockSheet) : 'count';
  const stockStep = stockUnit === 'gram' ? 50 : 1;
  const adjustStock = (d: number) => {
    const v = parseFloat(stockAmount) || 0;
    setStockAmount(String(Math.max(0, Math.round((v + d) * 10) / 10)));
  };

  // 수량 저장 — 수정 페이지와 동일하게 단위/수량으로 잔량(stock)과 표기(qty)를 함께 갱신.
  const saveStock = () => {
    if (!stockSheet) return;
    const amt = parseFloat(stockAmount) || 0;
    const u = unitForItem(stockSheet);
    const stock = stockFromQty(u, amt);
    upsertFridge({ ...stockSheet, qty: `${amt}${UNIT_SUFFIX[u]}`, stock });
    setStockSheet(null);
    setSheet(null);
    if (stock === 'very_low' || stock === 'empty') {
      setTimeout(() => addToShopping(stockSheet.name, 'low_stock', '냉장고에서 ' + STOCK[stock].label), 0);
    }
  };

  // 식재료 소진 — 다 써서 없어졌으므로 냉장고에서 빼고 장보기 목록에 추가한다.
  const useUp = (it: FridgeItem) => {
    removeFridge(it.id);
    setSheet(null);
    setTimeout(() => addToShopping(it.name, 'low_stock', '다 소진했어요'), 0);
  };

  const renderRow = (it: FridgeItem, idx: number) => (
    <Pressable key={it.id} style={[s.itemRow, idx > 0 && s.rowDivider]} onPress={() => setSheet(it)}>
      <FoodTile name={it.name} category={it.category} size={40} />
      <View style={{ flex: 1 }}>
        <View style={s.itemTop}>
          <Text style={s.itemName}>{it.name}</Text>
          <StockTag stock={it.stock} qty={it.qty} />
        </View>
        <Text style={s.itemMeta}>
          {STORAGE_LABEL[it.storage] ?? '기타'} · {FINE_CATEGORIES.find((c) => c.code === fineCategoryOf(it.name, it.category))?.label ?? CATEGORY[it.category]?.label}
        </Text>
      </View>
      <DdayBadge expiry={it.expiry} />
    </Pressable>
  );

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>냉장고</Text>
        <HeaderActions
          showBell={false}
          searchActive={searchOpen}
          onSearch={() => setSearchOpen((o) => { if (o) setQuery(''); return !o; })}
        />
      </View>

      {searchOpen && (
        <View style={s.searchRow}>
          <Icon name="search" size={18} color={colors.inkAsst} />
          <TextInput value={query} onChangeText={setQuery} placeholder="식재료 검색" placeholderTextColor={colors.inkAsst} style={s.search} autoFocus />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="x" size={16} color={colors.inkAsst} weight="bold" />
            </Pressable>
          )}
        </View>
      )}

      {/* 보기 방식 — 보관위치 / 카테고리 (밑줄 탭) */}
      <View style={s.viewTabs}>
        {([['storage', '보관위치'], ['category', '카테고리']] as const).map(([m, label]) => {
          const on = viewMode === m;
          return (
            <Pressable key={m} style={s.viewTab} onPress={() => setViewMode(m)}>
              <Text style={[s.viewTabText, on && s.viewTabTextOn]}>{label}</Text>
              <View style={[s.viewUnderline, on && s.viewUnderlineOn]} />
            </Pressable>
          );
        })}
      </View>

      {/* 보관 위치 탭 — 냉장·냉동·실온 (가장 중요한 메뉴: 아이콘 + 개수, 선택 시 채움) */}
      {viewMode === 'storage' && (
        <View style={s.locTabs}>
          {TABS.map((t, i) => {
            const on = i === tab;
            return (
              <Pressable key={t.label} style={[s.locTab, on && s.locTabOn]} onPress={() => goTab(i)}>
                <Icon name={t.icon} size={18} color={on ? colors.white : colors.inkAlt} weight={on ? 'fill' : 'regular'} />
                <Text style={[s.locTabText, on && s.locTabTextOn]}>{t.label}</Text>
                <Text style={[s.locTabCount, on && s.locTabCountOn]}>{listFor(i).length}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* 정렬 — 칩 (임박순·최신순·이름순·잔량순) */}
      <View style={s.sortRow}>
        <Icon name="funnel" size={13} color={colors.inkAsst} weight="bold" />
        {SORTS.map((srt, i) => {
          const on = i === sortIdx;
          return (
            <Pressable key={srt.key} style={[s.sortChip, on && s.sortChipOn]} onPress={() => setSortIdx(i)}>
              <Text style={[s.sortChipText, on && s.sortChipTextOn]}>{srt.label}</Text>
            </Pressable>
          );
        })}
        <Text style={s.countText}>{viewMode === 'storage' ? listFor(tab).length : categoryTotal}개</Text>
      </View>

      {viewMode === 'storage' ? (
        /* 좌우 스와이프되는 보관위치 페이지 */
        <View style={{ flex: 1 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {w > 0 && (
            <ScrollView
              ref={pagerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
            >
              {TABS.map((t, i) => {
                const list = listFor(i);
                return (
                  <ScrollView key={t.label} style={{ width: w }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                    {list.length > 0 && <View style={s.listBox}>{list.map(renderRow)}</View>}
                    {list.length === 0 && <Text style={s.empty}>{t.label} 보관 재료가 없어요.</Text>}
                  </ScrollView>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : (
        /* 카테고리별 그룹 목록 */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {categoryGroups.map(({ cat, items }) => {
            const open = !collapsed[cat.code];
            return (
              <View key={cat.code} style={{ marginBottom: 4 }}>
                <Pressable style={s.catHeader} onPress={() => setCollapsed((c) => ({ ...c, [cat.code]: !c[cat.code] }))}>
                  <Text style={s.catHeaderLabel}>{cat.label}</Text>
                  <Text style={s.catHeaderCount}>{items.length}</Text>
                  <View style={{ marginLeft: 'auto' }}>
                    <Icon name={open ? 'caret-down' : 'caret-right'} size={15} color={colors.inkAsst} weight="bold" />
                  </View>
                </Pressable>
                {open && <View style={s.listBox}>{items.map(renderRow)}</View>}
              </View>
            );
          })}
          {categoryGroups.length === 0 && <Text style={s.empty}>등록된 재료가 없어요.</Text>}
        </ScrollView>
      )}

      {/* 액션 시트 */}
      <Modal visible={!!sheet} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <Pressable style={s.backdrop} onPress={() => setSheet(null)}>
          <Pressable style={[s.sheet, { paddingBottom: sheetPad }]}>
            <SheetHandle />
            {sheet && (
              <>
                <View style={s.sheetHead}>
                  <FoodTile name={sheet.name} category={sheet.category} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetName}>{sheet.name}</Text>
                    <Text style={s.itemMeta}>{STORAGE_LABEL[sheet.storage]} · {sheet.qty ?? STOCK[sheet.stock].label}</Text>
                  </View>
                  <DdayBadge expiry={sheet.expiry} />
                </View>
                <SheetAction icon="arrows-clockwise" label="수량 변경" onPress={() => sheet && openStock(sheet)} />
                <SheetAction icon="pencil" label="수정" onPress={() => { const it = sheet; setSheet(null); nav.openIngredientForm({ itemId: it.id }); }} />
                <SheetAction icon="basket" label="장보기 목록에 추가" onPress={() => { addToShopping(sheet.name, 'low_stock'); setSheet(null); }} />
                <SheetAction icon="fork-knife" label="이 재료로 요리 보기" onPress={() => { setSheet(null); nav.setTab('recipe'); }} />
                <SheetAction icon="trash" label="삭제" danger onPress={() => { removeFridge(sheet.id); setSheet(null); }} />
                {/* 식재료 소진 — 하단에 분리해서 배치 */}
                <View style={s.sheetFootDivider} />
                <AppButton icon="check-circle" label="식재료 소진" variant="ghost" onPress={() => sheet && useUp(sheet)} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* 수량 변경 시트 — 수정 페이지와 동일하게 단위별(개/그람/%)로 수량 편집 */}
      <Modal visible={!!stockSheet} transparent animationType="fade" onRequestClose={() => setStockSheet(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
          <Pressable style={s.backdrop} onPress={() => setStockSheet(null)}>
            <Pressable style={[s.sheet, { paddingBottom: sheetPad }]}>
              <SheetHandle />
              {stockSheet && (
                <>
                  <View style={s.sheetHead}>
                    <FoodTile name={stockSheet.name} category={stockSheet.category} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.sheetName}>{stockSheet.name}</Text>
                      <Text style={s.itemMeta}>
                        {stockUnit === 'count' ? '개수' : stockUnit === 'gram' ? '그람(g)' : '퍼센트(%)'}로 수량을 조절해요
                      </Text>
                    </View>
                  </View>

                  {stockUnit === 'percent' ? (
                    <View style={s.qtyWrap}>
                      {['100', '75', '50', '25'].map((p) => (
                        <Pressable key={p} onPress={() => setStockAmount(p)} style={[s.qtyChip, stockAmount === p && s.qtyChipOn]}>
                          <Text style={[s.qtyChipText, stockAmount === p && s.qtyChipTextOn]}>{p}%</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View style={s.stepper}>
                      <Pressable onPress={() => adjustStock(-stockStep)} hitSlop={8}>
                        <Icon name="minus-circle" size={30} color={colors.inkAlt} weight="fill" />
                      </Pressable>
                      <View style={s.stepValueWrap}>
                        <TextInput
                          value={stockAmount}
                          onChangeText={(t) => setStockAmount(t.replace(/[^0-9.]/g, ''))}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={colors.inkAsst}
                          style={s.stepInput}
                          textAlign="center"
                        />
                        <Text style={s.stepUnit}>{UNIT_SUFFIX[stockUnit]}</Text>
                      </View>
                      <Pressable onPress={() => adjustStock(stockStep)} hitSlop={8}>
                        <Icon name="plus-circle" size={30} color={colors.inkAlt} weight="fill" />
                      </Pressable>
                    </View>
                  )}

                  <AppButton label="저장" onPress={saveStock} style={{ marginTop: 18 }} />
                  <Text style={s.stockHint}>수량이 적으면 잔량이 자동으로 낮아지고 장보기 목록에 추가돼요.</Text>
                </>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
  title: { fontFamily: font.extrabold, fontSize: 22, color: colors.ink, letterSpacing: -0.5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.pill },
  addBtnText: { fontFamily: font.bold, fontSize: 13, color: colors.white },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 14 },
  search: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink, paddingVertical: 11 },

  // 보기 방식 (보관위치 / 카테고리) — 전체 라인 밑줄 탭. 선택 시 검정 글자 + 검정 밑줄.
  viewTabs: { flexDirection: 'row', marginHorizontal: 20, marginTop: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  viewTab: { flex: 1, alignItems: 'center' },
  viewTabText: { fontFamily: font.bold, fontSize: 15, color: colors.inkAsst, paddingVertical: 9 },
  viewTabTextOn: { color: colors.ink },
  viewUnderline: { height: 2.5, width: '100%', backgroundColor: 'transparent', marginBottom: -1 },
  viewUnderlineOn: { backgroundColor: colors.ink },

  // 카테고리 그룹 헤더
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 14, paddingBottom: 8 },
  catHeaderEmoji: { fontSize: 16, ...(Platform.OS === 'web' ? { fontFamily: '"Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif' } : null) },
  catHeaderLabel: { fontFamily: font.extrabold, fontSize: 14, color: colors.ink },
  catHeaderCount: { fontFamily: font.semibold, fontSize: 12, color: colors.inkAsst, marginLeft: 2 },

  // 보관 위치 탭 (냉장·냉동·실온) — 가장 중요한 메뉴라 크고 또렷하게(아이콘+개수, 선택 시 채움).
  locTabs: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 10 },
  locTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  locTabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  locTabText: { fontFamily: font.bold, fontSize: 14, color: colors.inkAlt },
  locTabTextOn: { color: colors.white },
  // 선택 시 초록 배경 위에서 개수가 묻히지 않도록 동그라미 배지 처리.
  locTabCount: { fontFamily: font.bold, fontSize: 11, color: colors.inkAlt, backgroundColor: colors.fill, minWidth: 18, height: 18, lineHeight: 18, borderRadius: 9, paddingHorizontal: 5, textAlign: 'center', overflow: 'hidden' },
  locTabCountOn: { color: colors.primary, backgroundColor: colors.white },

  // 정렬 칩 (임박순·최신순·이름순·잔량순) — 가벼운 텍스트 칩으로 위치 필터와 구분.
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 4 },
  sortChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill },
  sortChipOn: { backgroundColor: colors.primaryBg },
  sortChipText: { fontFamily: font.semibold, fontSize: 12.5, color: colors.inkAsst },
  sortChipTextOn: { fontFamily: font.bold, color: colors.primary },
  countText: { fontFamily: font.extrabold, fontSize: 15, color: colors.ink, marginLeft: 'auto' },

  // 홈 '오늘 먼저 써야 할 재료'처럼 — 박스 하나에 행을 라인으로 구분.
  listBox: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  itemName: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  itemMeta: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkAlt, marginTop: 2 },
  empty: { fontFamily: font.medium, fontSize: 14, color: colors.inkAsst, textAlign: 'center', marginTop: 40 },

  backdrop: { flex: 1, backgroundColor: 'rgba(20,24,18,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30, gap: 4 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  sheetName: { fontFamily: font.bold, fontSize: 18, color: colors.ink },
  sheetTitle: { fontFamily: font.extrabold, fontSize: 17, color: colors.ink, marginBottom: 10, paddingHorizontal: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 6 },
  actionText: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },

  stockOpt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14, borderRadius: radius.md },
  stockOptOn: { backgroundColor: colors.primaryBg },
  stockOptText: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  stockHint: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkAsst, marginTop: 8, paddingHorizontal: 6, lineHeight: 18 },
  sheetFootDivider: { height: 1, backgroundColor: colors.line, marginTop: 6, marginBottom: 10 },

  // 수량 변경 — 단위별 편집(스텝퍼/퍼센트 칩)
  kav: { flex: 1 },
  qtyWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 6 },
  qtyChip: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.fill, borderWidth: 1.5, borderColor: colors.line },
  qtyChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  qtyChipText: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  qtyChipTextOn: { color: colors.white },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, paddingVertical: 10 },
  stepValueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 3, minWidth: 96, justifyContent: 'center' },
  stepInput: { fontFamily: font.extrabold, fontSize: 30, color: colors.ink, minWidth: 56, padding: 0 },
  stepUnit: { fontFamily: font.bold, fontSize: 17, color: colors.inkAlt },
});
