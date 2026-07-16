// 냉장고 (spec §9.7) — 보관위치 스와이프 탭(냉장·냉동·실온) · 임박순 정렬 · 수량변경/수정/삭제/장보기
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon, IconName } from '../components/Icon';
import { FoodTile, HouseholdTile, DdayBadge, StockTag, HeaderActions, AppButton, SheetHandle } from '../components/ui';
import { STORAGE_LABEL, CATEGORY, STOCK, STOCK_ORDER, FINE_CATEGORIES, fineCategoryOf, baseName } from '../data/constants';
import { useApp, FridgeItem } from '../data/store';
import { daysUntil } from '../data/date';
import { useNav } from '../navigation/nav';

// 보관 위치 탭 — 냉장·냉동·실온. 실온에는 양념/소스·기타 보관 재료도 함께 묶어 보여준다.
// 곳간 최상위는 식재료 / 생필품. 식재료 안에서만 보관위치(냉장·냉동·실온)로 나눈다.
const TABS: { label: string; icon: IconName; match: (storage: string) => boolean }[] = [
  { label: '냉장', icon: 'thermometer-cold', match: (st) => st === 'refrigerated' },
  { label: '냉동', icon: 'snowflake', match: (st) => st === 'frozen' },
  { label: '실온', icon: 'sun-horizon', match: (st) => st === 'room_temp' || st === 'sauce' || st === 'etc' },
];
// 정렬 옵션 — 라벨은 간결하게.
const SORTS: { key: string; label: string }[] = [
  { key: 'expiry', label: '임박순' },
  { key: 'recent', label: '등록순' }, // 곳간에 넣은 순서(최신이 위)
  { key: 'name', label: '이름순' },
  { key: 'stock', label: '잔량순' },
];

export function FridgeScreen() {
  const insets = useSafeAreaInsets();
  // 바텀시트는 화면 하단에 붙으므로 실기기 제스처 바만큼 더 띄워 하단 버튼이 바닥에 붙지 않게 한다.
  const sheetPad = Platform.OS === 'web' ? 30 : insets.bottom + 30;
  const { fridge, removeFridge, addToShopping } = useApp();
  const nav = useNav();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [topTab, setTopTab] = useState<'food' | 'household'>('food'); // 최상위: 식재료 / 생필품
  const [foodGroup, setFoodGroup] = useState<'location' | 'category'>('location'); // 식재료 묶는 기준: 위치 / 종류
  const [tab, setTab] = useState(0); // 식재료 안 보관위치 하위 탭(냉장·냉동·실온)
  const [sortIdx, setSortIdx] = useState(0);
  const [sheet, setSheet] = useState<FridgeItem | null>(null);
  const [w, setW] = useState(0);
  const pagerRef = useRef<ScrollView>(null);

  const sortKey = (SORTS[sortIdx] ?? SORTS[0]).key; // 범위 이탈(과거 상태 잔존 등)에도 안전하게
  // 같은 재료를 또 산 경우(우유·우유2)는 정렬과 무관하게 위아래로 붙여 보여준다.
  // 정렬 결과에서 같은 이름(번호 뗀 기준)이 처음 나온 자리에 같은 묶음을 모은다.
  const groupSameName = (arr: FridgeItem[]) => {
    const groups = new Map<string, FridgeItem[]>();
    const order: string[] = [];
    for (const it of arr) {
      const key = baseName(it.name);
      if (!groups.has(key)) { groups.set(key, []); order.push(key); }
      groups.get(key)!.push(it);
    }
    return order.flatMap((k) => groups.get(k)!);
  };
  const sortList = (arr: FridgeItem[]) => {
    const sorted =
      sortKey === 'recent'
        ? [...arr].reverse() // 나중에 추가된 재료가 위로
        : [...arr].sort((a, b) => {
            if (sortKey === 'expiry') return (daysUntil(a.expiry) ?? 9999) - (daysUntil(b.expiry) ?? 9999);
            if (sortKey === 'name') return a.name.localeCompare(b.name, 'ko');
            if (sortKey === 'stock') return STOCK_ORDER.indexOf(b.stock) - STOCK_ORDER.indexOf(a.stock);
            return 0;
          });
    return groupSameName(sorted);
  };
  // 정렬 칩 노출 순서 — 식재료은 임박순 우선, 생필품은 유통기한이 없어 잔량순을 맨 앞으로.
  // (SORTS 인덱스: 0 임박·1 등록·2 이름·3 잔량)
  const sortOrder = topTab === 'food' ? [0, 1, 2, 3] : [3, 1, 2, 0];

  const q = query.trim();
  const locTabs = TABS; // 보관위치 탭 — 냉장·냉동·실온
  const tabClamped = Math.min(tab, locTabs.length - 1); // 인덱스 안전
  // 식재료 보관위치별 목록 (생필품 제외).
  const listFor = (i: number) => sortList(fridge.filter((x) => x.kind !== 'household' && locTabs[i].match(x.storage) && x.name.includes(q)));
  // 생필품 목록 (보관위치 구분 없이 한 목록).
  const householdList = sortList(fridge.filter((x) => x.kind === 'household' && x.name.includes(q)));
  // 카테고리별 보기용 — 보관위치 무시하고 식재료 전체.
  const foodAll = sortList(fridge.filter((x) => x.kind !== 'household' && x.name.includes(q)));

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
    // 생필품으로 등록한 경우 — 곳간의 생필품 탭으로 (보관위치 하위 탭은 없음).
    if (f === 'household') { setTopTab('household'); nav.clearFridgeFocus(); return; }
    const i = TABS.findIndex((t) => t.match(f));
    if (i < 0) { nav.clearFridgeFocus(); return; }
    setTopTab('food');
    setFoodGroup('location');
    setTab(i);
    if (w > 0) {
      pagerRef.current?.scrollTo({ x: i * w, animated: false });
      nav.clearFridgeFocus();
    }
  }, [nav.fridgeFocus, w]);

  // 식재료 소진 — 다 써서 없어졌으므로 냉장고에서 빼고 장보기 목록에 추가한다.
  const useUp = (it: FridgeItem) => {
    removeFridge(it.id);
    setSheet(null);
    setTimeout(() => addToShopping(it.name, 'low_stock', '다 소진했어요', it.kind), 0);
  };

  const renderRow = (it: FridgeItem, idx: number) => {
    const hh = it.kind === 'household';
    return (
      <Pressable key={it.id} style={[s.itemRow, idx > 0 && s.rowDivider]} onPress={() => setSheet(it)}>
        {hh ? <HouseholdTile name={it.name} size={40} /> : <FoodTile name={it.name} category={it.category} size={40} />}
        <View style={{ flex: 1 }}>
          <View style={s.itemTop}>
            <Text style={s.itemName}>{it.name}</Text>
            <StockTag stock={it.stock} qty={it.qty} />
          </View>
          <Text style={s.itemMeta}>
            {hh ? '생필품' : `${STORAGE_LABEL[it.storage] ?? '기타'} · ${FINE_CATEGORIES.find((c) => c.code === fineCategoryOf(it.name, it.category))?.label ?? CATEGORY[it.category]?.label}`}
          </Text>
        </View>
        {/* 생필품은 유통기한 개념이 없어 D-day 배지를 숨긴다 */}
        {!hh && <DdayBadge expiry={it.expiry} />}
      </Pressable>
    );
  };

  // 카테고리별 보기 — 식재료 전체를 종류(육류·채소 등)로 묶어 옅은 소제목과 함께 보여준다.
  const renderCategoryGroups = (list: FridgeItem[]) =>
    FINE_CATEGORIES
      .map((c) => ({ cat: c, items: list.filter((x) => fineCategoryOf(x.name, x.category) === c.code) }))
      .filter((g) => g.items.length > 0)
      .map(({ cat, items }) => (
        <View key={cat.code} style={{ marginBottom: 14 }}>
          <Text style={s.groupLabel}>{cat.label}</Text>
          <View style={s.listBox}>{items.map(renderRow)}</View>
        </View>
      ));

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>곳간</Text>
        <HeaderActions
          showBell={false}
          searchActive={searchOpen}
          onSearch={() => setSearchOpen((o) => { if (o) setQuery(''); return !o; })}
        />
      </View>

      {searchOpen && (
        <View style={s.searchRow}>
          <Icon name="search" size={18} color={colors.inkAsst} />
          <TextInput value={query} onChangeText={setQuery} placeholder="곳간에서 검색" placeholderTextColor={colors.inkAsst} style={s.search} autoFocus />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="x" size={16} color={colors.inkAsst} weight="bold" />
            </Pressable>
          )}
        </View>
      )}

      {/* 최상위 구분 — 식재료 / 생필품 밑줄 탭(각 50%). 식재료 탭 안, 글자 오른쪽에 위치/종류 세그먼트. */}
      <View style={s.tabBar}>
        <Pressable style={s.viewTab} onPress={() => setTopTab('food')}>
          <View style={s.viewTabRow}>
            <Text style={[s.viewTabText, topTab === 'food' && s.viewTabTextOn]}>식재료</Text>
            {topTab === 'food' && (
              <View style={s.segment}>
                {([['location', '위치'], ['category', '종류']] as const).map(([g, label]) => {
                  const on = foodGroup === g;
                  return (
                    <Pressable key={g} style={[s.segmentBtn, on && s.segmentBtnOn]} onPress={() => setFoodGroup(g)}>
                      <Text style={[s.segmentText, on && s.segmentTextOn]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
          <View style={[s.viewUnderline, topTab === 'food' && s.viewUnderlineOn]} />
        </Pressable>

        <Pressable style={s.viewTab} onPress={() => setTopTab('household')}>
          <View style={s.viewTabRow}>
            <Text style={[s.viewTabText, topTab === 'household' && s.viewTabTextOn]}>생필품</Text>
          </View>
          <View style={[s.viewUnderline, topTab === 'household' && s.viewUnderlineOn]} />
        </Pressable>
      </View>

      {/* 위치 모드일 때만 보관위치 하위 탭 — 냉장·냉동·실온 (아이콘 + 개수, 선택 시 채움) */}
      {topTab === 'food' && foodGroup === 'location' && (
        <View style={s.locTabs}>
          {locTabs.map((t, i) => {
            const on = i === tabClamped;
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
        {sortOrder.map((i) => {
          const srt = SORTS[i];
          const on = i === sortIdx;
          return (
            <Pressable key={srt.key} style={[s.sortChip, on && s.sortChipOn]} onPress={() => setSortIdx(i)}>
              <Text style={[s.sortChipText, on && s.sortChipTextOn]}>{srt.label}</Text>
            </Pressable>
          );
        })}
        <Text style={s.countText}>{topTab === 'food' ? (foodGroup === 'location' ? listFor(tabClamped).length : foodAll.length) : householdList.length}개</Text>
      </View>

      {topTab === 'food' && foodGroup === 'location' ? (
        /* 식재료 · 위치별 — 좌우 스와이프되는 보관위치 페이지 */
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
              {locTabs.map((t, i) => {
                const list = listFor(i);
                const emptyMsg = `${t.label} 보관 식재료이 없어요.`;
                return (
                  <ScrollView key={t.label} style={{ width: w }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                    {list.length > 0 && <View style={s.listBox}>{list.map(renderRow)}</View>}
                    {list.length === 0 && <Text style={s.empty}>{emptyMsg}</Text>}
                  </ScrollView>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : topTab === 'food' ? (
        /* 식재료 · 종류별 — 보관위치 무시하고 카테고리로 묶은 한 목록 */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {foodAll.length > 0 ? renderCategoryGroups(foodAll) : <Text style={s.empty}>등록된 식재료이 없어요.</Text>}
        </ScrollView>
      ) : (
        /* 생필품 — 보관위치 구분 없이 한 목록 */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          {householdList.length > 0 && <View style={s.listBox}>{householdList.map(renderRow)}</View>}
          {householdList.length === 0 && <Text style={s.empty}>등록된 생필품이 없어요.</Text>}
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
                  {sheet.kind === 'household' ? <HouseholdTile name={sheet.name} size={40} /> : <FoodTile name={sheet.name} category={sheet.category} size={40} />}
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetName}>{sheet.name}</Text>
                    <Text style={s.itemMeta}>{(sheet.kind === 'household' ? '생필품' : STORAGE_LABEL[sheet.storage] ?? '기타')} · {sheet.qty ?? STOCK[sheet.stock].label}</Text>
                  </View>
                  {sheet.kind !== 'household' && <DdayBadge expiry={sheet.expiry} />}
                </View>
                {/* 수정 — 식재료는 소비기한·보관위치까지, 생필품은 수량(개/L)·메모만 */}
                <SheetAction icon="pencil" label="수정" onPress={() => { const it = sheet; setSheet(null); nav.openIngredientForm({ itemId: it.id }); }} />
                <SheetAction icon="basket" label="장보기 목록에 추가" onPress={() => { addToShopping(sheet.name, 'low_stock', undefined, sheet.kind); setSheet(null); }} />
                {sheet.kind !== 'household' && (
                  <SheetAction icon="fork-knife" label="이 재료로 요리 보기" onPress={() => { const it = sheet; setSheet(null); nav.goToRecipe(it.name); }} />
                )}
                <SheetAction icon="trash" label="삭제" danger onPress={() => { removeFridge(sheet.id); setSheet(null); }} />
                {/* 소진 — 다 썼으면 곳간에서 빼고 장보기 목록으로 */}
                <View style={s.sheetFootDivider} />
                <AppButton icon="check-circle" label={sheet.kind === 'household' ? '다 썼어요' : '식재료 소진'} variant="ghost" onPress={() => sheet && useUp(sheet)} />
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
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, paddingHorizontal: 13, paddingVertical: 9, borderRadius: radius.pill },
  addBtnText: { fontFamily: font.bold, fontSize: 13, color: colors.white },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, paddingHorizontal: 14 },
  search: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink, paddingVertical: 11 },

  // 최상위 밑줄 탭(식재료/생필품) + 우측 세그먼트를 한 줄에. 밑줄은 줄 전체에 깔린다.
  tabBar: { flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: 20, marginTop: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  // 탭에 가로 여백을 넉넉히 줘 식재료/생필품 영역과 밑줄(선택바)을 넓게 잡는다.
  // 각 탭이 전체 폭의 50%. 식재료 탭 안에서 글자 + 위치/종류 세그먼트가 한 줄로.
  viewTab: { flex: 1, alignItems: 'center' },
  viewTabRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9 },
  viewTabText: { fontFamily: font.bold, fontSize: 16, color: colors.inkAsst },
  viewTabTextOn: { color: colors.ink },
  viewUnderline: { height: 3, width: '100%', backgroundColor: 'transparent', marginBottom: -1 },
  viewUnderlineOn: { backgroundColor: colors.ink },

  // 위치 / 종류 세그먼트 토글 — 회색 트랙 위 흰 알약(선택). 작고 차분하게.
  // 곳간 배경(cream)과 트랙(fill)이 거의 같은 회색이라 묻힌다 → 테두리로 토글임을 드러낸다.
  segment: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: radius.pill, padding: 2, borderWidth: 1, borderColor: colors.lineStrong },
  segmentBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  // 선택 알약 — 흰 배경 + 아래로 옅은 그림자를 줘 트랙 위에 떠 보이게(토글 느낌).
  segmentBtnOn: {
    backgroundColor: colors.surface,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(20,30,20,0.22)' } as any,
      default: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
    }),
  },
  segmentText: { fontFamily: font.bold, fontSize: 12, color: colors.inkAlt },
  segmentTextOn: { color: colors.ink },
  // 카테고리별 보기 — 종류 소제목(옅고 작게).
  groupLabel: { fontFamily: font.bold, fontSize: 12.5, color: colors.inkAlt, marginBottom: 7, marginLeft: 2 },

  // 카테고리 그룹 헤더
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 14, paddingBottom: 8 },
  catHeaderEmoji: { fontSize: 16, ...(Platform.OS === 'web' ? { fontFamily: '"Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif' } : null) },
  catHeaderLabel: { fontFamily: font.extrabold, fontSize: 14, color: colors.ink },
  catHeaderCount: { fontFamily: font.semibold, fontSize: 12, color: colors.inkAsst, marginLeft: 2 },

  // 보관 위치 탭 (냉장·냉동·실온) — 가장 중요한 메뉴라 크고 또렷하게(아이콘+개수, 선택 시 채움).
  locTabs: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 10 },
  locTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  // 선택 — 초록으로 꽉 채우고 글자·아이콘은 흰색.
  locTabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  locTabText: { fontFamily: font.bold, fontSize: 14, color: colors.inkAlt },
  locTabTextOn: { color: colors.white },
  // 개수 배지 — 선택 시 초록 배경 위에서 흰 배지 + 초록 글자로 뒤집는다.
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
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 6 },
  actionText: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  sheetFootDivider: { height: 1, backgroundColor: colors.line, marginTop: 6, marginBottom: 10 },
});
