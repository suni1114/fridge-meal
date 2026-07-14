// 홈 대시보드 — 오늘 행동 중심. 구성(시안 sample_home.png):
//   날짜 + 인사 → 유통기한 임박 → 소진 예측 알림 → 장보기 시작 / 영수증 스캔 → 지금 재료로 만들 수 있는
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Image } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon } from '../components/Icon';
import { SectionTitle, HeaderActions, FoodTile, emojiFont } from '../components/ui';
import { recipeImage } from '../data/recipeImages';
import { recipeCategoryEmoji, CATEGORY, STORAGE_LABEL } from '../data/constants';
import { useApp, matchAll, FridgeItem } from '../data/store';
import { isReady, RecipeCategory, RecipeMatch } from '../data/recommend';
import { daysUntil, todayISO } from '../data/date';
import { useNav } from '../navigation/nav';

// 카드 2.5개가 한 화면에 보이도록 — 남는 0.5개가 "옆으로 더 있다"는 신호가 된다.
const PER_SCREEN = 2.5;
const CARD_GAP = 10;
// '지금 재료로 만들 수 있는'에 뿌릴 순서 — 카테고리마다 2개씩.
const HOME_READY_CATS: RecipeCategory[] = ['메인', '간편', '국·찌개', '반찬'];
const PER_CAT = 2;
// 유통기한 임박 기준(일) — 이 안에 드는 재료만 홈 카드에 올린다.
const EXPIRY_SOON_DAYS = 5;
const EXPIRY_ROWS = 3; // 홈에는 급한 것 3개만. 나머지는 '전체보기'로.

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function todayLabel(): string {
  const [y, m, d] = todayISO().split('-').map(Number);
  const w = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 ${w}요일`;
}

// 웹: 가로 카드 줄을 마우스로 끌어서 넘길 수 있게 한다(스크롤바 없이).
function useDragScroll(ref: React.RefObject<ScrollView | null>, dep: unknown) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const node = (ref.current as any)?.getScrollableNode?.() as HTMLElement | undefined;
    if (!node) return;
    let down = false, startX = 0, startLeft = 0, moved = false;
    const onDown = (e: MouseEvent) => { down = true; moved = false; startX = e.pageX; startLeft = node.scrollLeft; node.style.cursor = 'grabbing'; };
    const onMove = (e: MouseEvent) => {
      if (!down) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 2) moved = true;
      if (moved) { e.preventDefault(); node.scrollLeft = startLeft - dx; }
    };
    const onUp = () => { down = false; node.style.cursor = 'grab'; };
    node.style.cursor = 'grab';
    node.style.userSelect = 'none';
    node.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      node.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [ref, dep]);
}

/**
 * 소진 예측 — 자주 쓰는 재료가 언제 떨어질지 사용 로그로 추정한다.
 * 같은 재료를 2번 이상 등록했다면 그 등록 간격의 평균을 사용 주기로 보고,
 * (마지막 등록 + 주기)가 며칠 뒤인지 계산한다. 로그가 없으면(데모 초기 상태)
 * 재고가 얼마 안 남은 재료를 대신 알린다.
 */
type Prediction = { name: string; days: number | null };
function predictRunOut(usageLog: { name: string; date: string }[], fridge: FridgeItem[]): Prediction | null {
  const byName = new Map<string, string[]>();
  for (const u of usageLog) {
    const arr = byName.get(u.name) ?? [];
    arr.push(u.date);
    byName.set(u.name, arr);
  }
  const dayOf = (iso: string) => Math.floor(new Date(iso).getTime() / 86400000);
  const today = dayOf(todayISO());

  let best: (Prediction & { count: number }) | null = null;
  for (const [name, dates] of byName) {
    if (dates.length < 2) continue;
    const ds = [...dates].sort().map(dayOf);
    const gaps = ds.slice(1).map((d, i) => d - ds[i]).filter((g) => g > 0);
    if (!gaps.length) continue;
    const cycle = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    const days = ds[ds.length - 1] + cycle - today;
    if (days < 0 || days > 7) continue; // 너무 지났거나 아직 먼 것은 알리지 않는다
    if (!best || dates.length > best.count) best = { name, days, count: dates.length };
  }
  if (best) return { name: best.name, days: best.days };

  // 로그가 부족할 때 — 재고가 바닥나가는 재료를 대신 알린다.
  const low = fridge.find((x) => x.stock === 'very_low') ?? fridge.find((x) => x.stock === 'low');
  return low ? { name: low.name, days: null } : null;
}

export function HomeScreen() {
  const { fridge, shopping, recipes, usageLog, addToShopping } = useApp();
  const nav = useNav();

  // 유통기한 임박 — 임박순. 홈에는 3개만 올리고 전체 개수는 뱃지로 알린다.
  const expiringAll = [...fridge]
    .map((x) => ({ item: x, d: daysUntil(x.expiry) }))
    .filter((e) => e.d != null && e.d <= EXPIRY_SOON_DAYS)
    .sort((a, b) => a.d! - b.d!)
    .map((e) => e.item);
  const expiring = expiringAll.slice(0, EXPIRY_ROWS);

  // 지금 만들 수 있는 요리 — 종류가 한쪽으로 쏠리지 않게 카테고리마다 2개씩.
  const readyAll = matchAll(recipes, fridge).filter(isReady);
  const ready = HOME_READY_CATS.flatMap((c) => readyAll.filter((m) => m.recipe.category === c).slice(0, PER_CAT));

  const toBuy = shopping.filter((x) => !x.checked && (x.kind ?? 'food') === 'food');
  const prediction = predictRunOut(usageLog, fridge);

  const readyRef = useRef<ScrollView>(null);
  const [rowW, setRowW] = useState(0);
  useDragScroll(readyRef, ready.length);
  const cardW = rowW > 0 ? (rowW - CARD_GAP * (PER_SCREEN - 0.5)) / PER_SCREEN : 0;

  const addPredictionToShopping = () => {
    if (!prediction) return;
    addToShopping(prediction.name, 'low_stock', '소진 예측');
    nav.setTab('shopping');
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {/* 상단 — 브랜드 로고 + 알림/설정 */}
        <View style={s.topbar}>
          <View style={s.brand}>
            <Image source={require('../../assets/logo-mark.png')} style={s.brandMark} />
            <Text style={s.brandText}>장봄</Text>
          </View>
          <HeaderActions showSearch={false} />
        </View>

        {/* 인사 — 날짜 + 오늘의 한마디. 오른쪽 '전체보기'는 아래 임박 목록으로 가는 길. */}
        <View style={s.greetRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.date}>{todayLabel()}</Text>
            <Text style={s.greet}>오늘도 알뜰하게 <Text style={emojiFont}>👋</Text></Text>
          </View>
          <Pressable style={s.cardMore} onPress={() => nav.setTab('fridge')} hitSlop={8}>
            <Text style={s.cardMoreText}>전체보기</Text>
            <Icon name="caret-right" size={14} color={colors.inkAlt} weight="bold" />
          </Pressable>
        </View>

        {/* 1. 유통기한 임박 */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <View style={s.cardHeadLeft}>
              <View style={s.dot} />
              <Text style={s.cardTitle}>유통기한 임박</Text>
              {expiringAll.length > 0 && (
                <View style={s.countBadge}><Text style={s.countBadgeText}>{expiringAll.length}건</Text></View>
              )}
            </View>
          </View>

          {expiring.length > 0 ? (
            <View>
              {expiring.map((it) => (
                <ExpiryRow key={it.id} item={it} onPress={() => nav.openIngredientForm({ itemId: it.id })} />
              ))}
            </View>
          ) : (
            <Text style={s.empty}>{EXPIRY_SOON_DAYS}일 안에 먹어야 할 재료가 없어요.</Text>
          )}
        </View>

        {/* 2. 소진 예측 알림 — 자주 쓰는 재료가 떨어질 때쯤 미리 담아두게 한다 */}
        {prediction && (
          <View style={s.predict}>
            <Text style={s.predictTitle}>소진 예측 알림</Text>
            <Text style={s.predictBody}>
              {prediction.days != null
                ? `즐겨찾기한 "${prediction.name}" 사용 주기상 ${prediction.days}일 뒤 떨어질 것 같아요. 미리 담아둘까요?`
                : `"${prediction.name}"이(가) 얼마 안 남았어요. 미리 담아둘까요?`}
            </Text>
            <Pressable style={s.predictBtn} onPress={addPredictionToShopping}>
              <Text style={s.predictBtnText}>장보기 목록에 담기 →</Text>
            </Pressable>
          </View>
        )}

        {/* 3. 바로 가는 두 갈래 — 장보기 / 영수증 스캔 */}
        <View style={s.tiles}>
          <Pressable style={s.tile} onPress={() => nav.setTab('shopping')}>
            <View style={s.tileIcon}>
              <Icon name="shopping-cart-simple" size={20} color={colors.primary} weight="bold" />
            </View>
            <Text style={s.tileTitle}>장보기 시작</Text>
            <Text style={s.tileSub}>담을 것 {toBuy.length}개</Text>
          </Pressable>

          <Pressable style={s.tile} onPress={() => nav.openIngredientForm({ scanReceipt: true })}>
            <View style={s.tileIcon}>
              <Icon name="receipt" size={20} color={colors.primary} weight="bold" />
            </View>
            <Text style={s.tileTitle}>영수증 스캔</Text>
            <Text style={s.tileSub}>사온 재료 바로 등록</Text>
          </Pressable>
        </View>

        {/* 4. 지금 재료로 만들 수 있는 — 사진 카드 가로 슬라이드(한 화면에 2.5개) */}
        <View style={s.readySection}>
          <SectionTitle title="지금 재료로 만들 수 있는" compact actionLabel="전체보기" onAction={() => nav.setTab('recipe')} />
          {ready.length > 0 ? (
            <View onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
              {cardW > 0 && (
                <ScrollView ref={readyRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.readyScroll}>
                  {ready.map((m) => (
                    <ReadyCard key={m.recipe.menuId} m={m} width={cardW} onPress={() => nav.openRecipe(m.recipe.menuId)} />
                  ))}
                </ScrollView>
              )}
            </View>
          ) : (
            <View style={s.card}>
              <Text style={s.empty}>식재료가 부족해서 만들 수 있는 요리가 없어요.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** 임박 재료 한 줄 — 보관위치 칩 · 이름/분류 · D-day */
function ExpiryRow({ item, onPress }: { item: FridgeItem; onPress: () => void }) {
  const d = daysUntil(item.expiry);
  const tone = d == null ? 'ok' : d <= 1 ? 'urgent' : d <= 3 ? 'warn' : 'ok';
  return (
    <Pressable style={s.row} onPress={onPress}>
      {/* 곳간과 같은 식재료 이모지 타일 — 보관위치는 이름 아래 분류와 함께 적는다. */}
      <FoodTile name={item.name} category={item.category} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
        <Text style={s.rowSub} numberOfLines={1}>
          {CATEGORY[item.category]?.label ?? '기타'} · {STORAGE_LABEL[item.storage] ?? '보관'}
        </Text>
      </View>
      <View style={[s.dday, tone === 'urgent' ? s.ddayUrgent : tone === 'warn' ? s.ddayWarn : s.ddayOk]}>
        <Text style={[s.ddayText, tone === 'urgent' ? s.ddayTextUrgent : tone === 'warn' ? s.ddayTextWarn : s.ddayTextOk]}>
          {d == null ? '기한 미정' : d < 0 ? `D+${-d}` : `D-${d}`}
        </Text>
      </View>
    </Pressable>
  );
}

/** 요리 사진 카드 — 사진 + 요리명 + 내 재료 n/m */
function ReadyCard({ m, width, onPress }: { m: RecipeMatch; width: number; onPress: () => void }) {
  const img = recipeImage(m.recipe.menuId);
  const have = m.matchedMain + m.matchedSub;
  const total = m.totalMain + m.totalSub;
  // 사진은 정사각 — 카드 안쪽 폭(테두리 1px 양쪽 제외)을 그대로 높이로 쓴다.
  // (aspectRatio는 웹에서 기대대로 먹지 않아 픽셀 높이를 직접 준다.)
  const thumb = { width: '100%' as const, height: width - 2 };
  return (
    <Pressable style={[s.readyCard, { width }]} onPress={onPress}>
      {img ? (
        <Image source={img} style={[s.readyThumb, thumb]} resizeMode="cover" />
      ) : (
        <View style={[s.readyThumb, thumb, s.readyThumbFallback]}>
          <Text style={[s.readyEmoji, emojiFont]}>{recipeCategoryEmoji(m.recipe.category)}</Text>
        </View>
      )}
      <View style={s.readyBody}>
        <Text style={s.readyName} numberOfLines={1}>{m.recipe.name}</Text>
        <Text style={s.readyMeta}>내 재료 {have}/{total}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  page: { padding: 16, paddingTop: 14, paddingBottom: 28, gap: 14 },

  // 상단 브랜드
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 28, height: 28, borderRadius: 9 },
  brandText: { fontFamily: font.extrabold, fontSize: 20, color: colors.ink, letterSpacing: -0.5 },

  // 인사
  // 인사와 아래 카드 사이는 페이지 기본 간격(14)의 절반 정도로 붙인다.
  greetRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 4, marginBottom: -6 },
  date: { fontFamily: font.semibold, fontSize: 12.5, color: colors.inkAsst },
  greet: { fontFamily: font.extrabold, fontSize: 20, color: colors.ink, letterSpacing: -0.6, marginTop: 4 },

  // 카드 공통
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.coral },
  cardTitle: { fontFamily: font.extrabold, fontSize: 15.5, color: colors.ink, letterSpacing: -0.3 },
  // 건수 뱃지 — 제목 바로 옆, 베이지 톤(경고색인 코랄과 구분해 카드 제목의 빨간 점만 긴급함을 알린다)
  countBadge: { backgroundColor: '#EFE7D6', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, marginLeft: 2 },
  countBadgeText: { fontFamily: font.extrabold, fontSize: 11.5, color: '#8C7A55' },
  empty: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAsst, textAlign: 'center', paddingVertical: 12 },

  // 임박 재료 행
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  rowName: { fontFamily: font.bold, fontSize: 15, color: colors.ink, letterSpacing: -0.3 },
  rowSub: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkAsst, marginTop: 2 },
  dday: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  ddayUrgent: { backgroundColor: colors.coralBg },
  ddayWarn: { backgroundColor: colors.accentBg },
  ddayOk: { backgroundColor: colors.fill },
  ddayText: { fontFamily: font.extrabold, fontSize: 11.5 },
  ddayTextUrgent: { color: colors.coral },
  ddayTextWarn: { color: colors.accentDark },
  ddayTextOk: { color: colors.inkAlt },
  // '전체보기' — SectionTitle의 action(더보기/전체보기)과 같은 톤으로 맞춘다.
  cardMore: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 4 },
  cardMoreText: { fontFamily: font.semibold, fontSize: 13, color: colors.inkAlt },

  // 소진 예측 알림 (짙은 그린 카드)
  predict: { backgroundColor: colors.darkGreen, borderRadius: radius.xl, padding: 18, gap: 8 },
  predictTitle: { fontFamily: font.extrabold, fontSize: 15, color: colors.white, letterSpacing: -0.3 },
  predictBody: { fontFamily: font.medium, fontSize: 13.5, color: 'rgba(255,255,255,0.86)', lineHeight: 21 },
  predictBtn: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 11, marginTop: 4 },
  predictBtnText: { fontFamily: font.extrabold, fontSize: 13.5, color: colors.white },

  // 두 갈래 타일
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 4 },
  tileIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileTitle: { fontFamily: font.extrabold, fontSize: 14.5, color: colors.ink, letterSpacing: -0.3 },
  tileSub: { fontFamily: font.medium, fontSize: 12, color: colors.inkAsst },

  // 지금 재료로 만들 수 있는
  readySection: { marginTop: 6 },
  readyScroll: { gap: CARD_GAP, paddingVertical: 2, paddingRight: 4 },
  readyCard: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  readyThumb: { backgroundColor: colors.fill }, // 크기는 ReadyCard에서 카드 폭 기준 정사각으로 준다
  readyThumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryBg },
  readyEmoji: { fontSize: 40, lineHeight: 50, textAlign: 'center' },
  readyBody: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 3 },
  readyName: { fontFamily: font.extrabold, fontSize: 13.5, color: colors.ink, letterSpacing: -0.3 },
  readyMeta: { fontFamily: font.bold, fontSize: 11.5, color: colors.primary },
});
