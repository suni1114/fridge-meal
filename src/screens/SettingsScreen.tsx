// 설정 — 사용자 화면 (관리자용 기본식재료/레시피 데이터 관리는 별도 관리자 화면으로 분리)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, Animated, Easing, Linking, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon, IconName } from '../components/Icon';
import { AppButton, FoodTile } from '../components/ui';
import { CategoryCode } from '../data/constants';
import { useApp } from '../data/store';
import { useNav } from '../navigation/nav';
import { daysUntil } from '../data/date';
import { loadJSON, saveJSON, STORAGE_KEYS } from '../data/persist';

const CONTACT_EMAIL = 'web@doweb.kr';

// '자주 쓰는 식재료' 집계 기간.
const PERIODS: { key: string; label: string; days: number | null }[] = [
  { key: 'm1', label: '1개월', days: 30 },
  { key: 'm6', label: '6개월', days: 180 },
  { key: 'y1', label: '1년', days: 365 },
  { key: 'all', label: '전체', days: null },
];

type SheetKey = 'topItems' | 'notif' | 'restart' | 'appInfo' | 'contact' | 'reset';
type NotifPrefs = { expiry: boolean; shopping: boolean };

export function SettingsScreen() {
  const { fridge, usageLog, resetAll } = useApp();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  // 바텀시트는 화면 하단에 붙으므로 실기기 제스처 바만큼 더 띄운다.
  const sheetPad = Platform.OS === 'web' ? 30 : insets.bottom + 30;

  const [sheet, setSheet] = useState<SheetKey | null>(null);
  const close = () => setSheet(null);

  // ── 자주 쓰는 식재료 (기간별 등록 빈도 Top 10) ──
  const [period, setPeriod] = useState('m1');
  const topItems = useMemo(() => {
    const p = PERIODS.find((x) => x.key === period)!;
    const within = p.days == null
      ? usageLog
      : usageLog.filter((e) => { const d = daysUntil(e.date); return d == null ? false : -d <= p.days!; });
    const counts = new Map<string, { name: string; category: CategoryCode; count: number }>();
    within.forEach((e) => {
      const c = counts.get(e.name);
      if (c) c.count += 1;
      else counts.set(e.name, { name: e.name, category: e.category, count: 1 });
    });
    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko')).slice(0, 10);
  }, [usageLog, period]);

  // ── 알림 설정 — 기기에 영속 저장(기본 모두 켜짐) ──
  const [notif, setNotif] = useState<NotifPrefs>({ expiry: true, shopping: true });
  useEffect(() => {
    (async () => {
      const saved = await loadJSON<NotifPrefs>(STORAGE_KEYS.notify);
      if (saved) setNotif(saved);
    })();
  }, []);
  const updateNotif = (k: keyof NotifPrefs, v: boolean) =>
    setNotif((p) => {
      const next = { ...p, [k]: v };
      saveJSON(STORAGE_KEYS.notify, next);
      return next;
    });

  type Item = { icon: IconName; label: string; danger?: boolean; disabled?: boolean; badge?: string; onPress?: () => void };
  const groups: { title: string; items: Item[] }[] = [
    {
      title: '냉장고',
      items: [
        { icon: 'flame', label: '자주 쓰는 식재료', onPress: () => setSheet('topItems') },
        { icon: 'magic-wand', label: '냉장고 빠른 세팅 다시 하기', onPress: () => setSheet('restart') },
        { icon: 'bell-ringing', label: '알림 설정', onPress: () => setSheet('notif') },
      ],
    },
    {
      title: '공유',
      items: [{ icon: 'users', label: '가족 공유', badge: '준비중', disabled: true }],
    },
    {
      title: '정보',
      items: [
        { icon: 'info', label: '앱 정보', onPress: () => setSheet('appInfo') },
        { icon: 'heart', label: '문의하기', onPress: () => setSheet('contact') },
        { icon: 'trash', label: '데이터 초기화', danger: true, onPress: () => setSheet('reset') },
      ],
    },
  ];

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>설정</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View style={s.profile}>
          <View style={s.avatar}>
            <Icon name="snowflake" size={28} color={colors.primary} weight="fill" />
          </View>
          <View>
            <Text style={s.profileName}>내 냉장고</Text>
            <Text style={s.profileMeta}>등록된 식재료 {fridge.length}개</Text>
          </View>
        </View>

        {groups.map((g) => (
          <View key={g.title}>
            <Text style={s.groupTitle}>{g.title}</Text>
            <View style={s.group}>
              {g.items.map((it, i) => (
                <Pressable
                  key={it.label}
                  style={[s.row, i > 0 && s.rowDivider, it.disabled && { opacity: 0.5 }]}
                  onPress={it.disabled ? undefined : it.onPress}
                >
                  <Icon name={it.icon} size={21} color={it.danger ? colors.coral : colors.ink} />
                  <Text style={[s.rowLabel, it.danger && { color: colors.coral }]}>{it.label}</Text>
                  {it.badge && (
                    <View style={s.soonBadge}>
                      <Text style={s.soonText}>{it.badge}</Text>
                    </View>
                  )}
                  {!it.danger && !it.disabled && <Icon name="caret-right" size={16} color={colors.inkAsst} weight="bold" />}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={s.version}>냉장고비서 V1.0</Text>
      </ScrollView>

      {/* ── 자주 쓰는 식재료 ──────────────────────────────── */}
      <Sheet visible={sheet === 'topItems'} onClose={close} pad={sheetPad}>
        <Text style={s.sheetTitle}>자주 쓰는 식재료</Text>
        <Text style={s.sheetSub}>기간별로 많이 등록한 식재료 순위예요.</Text>
        <View style={s.periodRow}>
          {PERIODS.map((p) => {
            const on = p.key === period;
            return (
              <Pressable key={p.key} onPress={() => setPeriod(p.key)} style={[s.periodChip, on && s.periodChipOn]}>
                <Text style={[s.periodText, on && s.periodTextOn]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {topItems.length ? (
          <ScrollView style={{ maxHeight: 360, marginTop: 4 }} showsVerticalScrollIndicator={false}>
            {topItems.map((it, idx) => (
              <View key={it.name} style={s.statRow}>
                <Text style={[s.rank, idx < 3 && s.rankTop]}>{idx + 1}</Text>
                <FoodTile name={it.name} category={it.category} size={36} />
                <Text style={s.statName}>{it.name}</Text>
                <View style={s.countBadge}>
                  <Text style={s.countText}>{it.count}회</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={s.emptyStat}>아직 기록이 없어요. 식재료를 등록하면 차곡차곡 쌓여요.</Text>
        )}
      </Sheet>

      {/* ── 알림 설정 ─────────────────────────────────────── */}
      <Sheet visible={sheet === 'notif'} onClose={close} pad={sheetPad}>
        <Text style={s.sheetTitle}>알림 설정</Text>
        <ToggleRow label="유통기한 임박 알림" desc="소비기한이 다가오는 재료를 알려드려요." value={notif.expiry} onChange={(v) => updateNotif('expiry', v)} />
        <ToggleRow label="장보기 리마인드" desc="장보기 목록에 살 것이 쌓이면 알려드려요." value={notif.shopping} onChange={(v) => updateNotif('shopping', v)} />
        <Text style={s.sheetNote}>알림은 기기의 알림 권한 설정에 따라 동작해요.</Text>
      </Sheet>

      {/* ── 빠른 세팅 다시 하기 (spec §9.13: 덮어쓰지 않고 선택지 제공) ── */}
      <Sheet visible={sheet === 'restart'} onClose={close} pad={sheetPad}>
        <Text style={s.sheetTitle}>빠른 세팅 다시 하기</Text>
        <Text style={s.sheetSub}>기존 냉장고를 어떻게 할까요? 추천 식재료를 지금 목록에 더하거나, 비우고 새로 시작할 수 있어요.</Text>
        <AppButton label="기존 냉장고에 추가" icon="plus" onPress={() => { close(); nav.startSetup('append'); }} style={{ marginTop: 18 }} />
        <AppButton label="초기화하고 새로 세팅" variant="ghost" onPress={() => { close(); nav.startSetup('replace'); }} style={{ marginTop: 10 }} />
      </Sheet>

      {/* ── 앱 정보 ──────────────────────────────────────── */}
      <Sheet visible={sheet === 'appInfo'} onClose={close} pad={sheetPad}>
        <View style={s.appHead}>
          <View style={s.appIcon}>
            <Icon name="snowflake" size={30} color={colors.primary} weight="fill" />
          </View>
          <View>
            <Text style={s.sheetTitle}>냉장고비서</Text>
            <Text style={s.appVersion}>버전 V1.0</Text>
          </View>
        </View>
        <Text style={s.sheetSub}>냉장고 속 재료를 관리하고, 있는 재료로 만들 수 있는 요리를 추천하고, 장보기 목록까지 정리해주는 앱이에요.</Text>
        <Text style={s.sheetNote}>모든 데이터는 이 기기에만 저장되며, 서버로 전송되지 않아요.</Text>
      </Sheet>

      {/* ── 문의하기 ─────────────────────────────────────── */}
      <Sheet visible={sheet === 'contact'} onClose={close} pad={sheetPad}>
        <Text style={s.sheetTitle}>문의하기</Text>
        <Text style={s.sheetSub}>이용 중 불편한 점이나 제안을 보내주세요.</Text>
        <Pressable style={s.contactRow} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
          <Icon name="info" size={18} color={colors.primary} />
          <Text style={s.contactEmail}>{CONTACT_EMAIL}</Text>
        </Pressable>
        <AppButton label="메일 보내기" onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} style={{ marginTop: 14 }} />
      </Sheet>

      {/* ── 데이터 초기화 ─────────────────────────────────── */}
      <Sheet visible={sheet === 'reset'} onClose={close} pad={sheetPad}>
        <Text style={s.sheetTitle}>모든 데이터를 초기화할까요?</Text>
        <Text style={s.sheetSub}>냉장고와 장보기 목록, 사용 기록이 모두 삭제되고 처음 화면부터 다시 시작해요. 되돌릴 수 없어요.</Text>
        <View style={s.dialogBtns}>
          <AppButton label="취소" variant="ghost" onPress={close} style={{ flex: 1 }} />
          <AppButton label="초기화" onPress={() => { close(); resetAll(); nav.setPhase('onboarding'); }} style={{ flex: 1.4 }} />
        </View>
      </Sheet>
    </View>
  );
}

/** 하단에서 올라오는 공통 바텀시트 셸. */
function Sheet({ visible, onClose, pad, children }: { visible: boolean; onClose: () => void; pad: number; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={[s.sheet, { paddingBottom: pad }]}>{children}</Pressable>
      </Pressable>
    </Modal>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.toggleRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={s.toggleLabel}>{label}</Text>
        <Text style={s.toggleDesc}>{desc}</Text>
      </View>
      <Toggle value={value} onChange={onChange} />
    </View>
  );
}

// 앱 디자인에 맞춘 커스텀 토글 — 트랙 색/썸 위치가 부드럽게 전환된다(웹·네이티브 동일).
const TOGGLE_W = 48;
const TOGGLE_THUMB = 22;
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value]);
  const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: [colors.lineStrong, colors.primary] });
  const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [3, TOGGLE_W - TOGGLE_THUMB - 3] });
  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={8}>
      <Animated.View style={[t.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[t.thumb, { transform: [{ translateX: tx }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const t = StyleSheet.create({
  track: { width: TOGGLE_W, height: 28, borderRadius: 14, justifyContent: 'center' },
  thumb: {
    width: TOGGLE_THUMB,
    height: TOGGLE_THUMB,
    borderRadius: TOGGLE_THUMB / 2,
    backgroundColor: colors.white,
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(20,30,20,0.28)' } as any,
      default: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
    }),
  },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },

  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: 18, marginBottom: 8 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontFamily: font.bold, fontSize: 18, color: colors.ink },
  profileMeta: { fontFamily: font.medium, fontSize: 13, color: colors.inkAlt, marginTop: 3 },

  groupTitle: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt, marginTop: 16, marginBottom: 8, marginLeft: 4 },
  group: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  rowLabel: { flex: 1, fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  soonBadge: { backgroundColor: colors.fill, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  soonText: { fontFamily: font.bold, fontSize: 11.5, color: colors.inkAsst },

  version: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkAsst, textAlign: 'center', marginTop: 18 },

  // ── 바텀시트 공통 ──
  backdrop: { flex: 1, backgroundColor: 'rgba(20,24,18,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  sheetTitle: { fontFamily: font.extrabold, fontSize: 18, color: colors.ink },
  sheetSub: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAlt, marginTop: 8, lineHeight: 20 },
  sheetNote: { fontFamily: font.medium, fontSize: 12, color: colors.inkAsst, marginTop: 14, lineHeight: 18 },
  dialogBtns: { flexDirection: 'row', gap: 10, marginTop: 24 },

  // 자주 쓰는 식재료
  periodRow: { flexDirection: 'row', gap: 7, marginTop: 14, marginBottom: 6 },
  periodChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.fill },
  periodChipOn: { backgroundColor: colors.primary },
  periodText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  periodTextOn: { color: colors.white },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  rank: { width: 20, textAlign: 'center', fontFamily: font.extrabold, fontSize: 15, color: colors.inkAsst },
  rankTop: { color: colors.primary },
  statName: { flex: 1, fontFamily: font.bold, fontSize: 15, color: colors.ink },
  countBadge: { backgroundColor: colors.primaryBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { fontFamily: font.bold, fontSize: 12.5, color: colors.primary },
  emptyStat: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkAsst, textAlign: 'center', paddingVertical: 28, lineHeight: 20 },

  // 알림 토글
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  toggleLabel: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  toggleDesc: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkAlt, marginTop: 3, lineHeight: 17 },

  // 앱 정보
  appHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  appIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  appVersion: { fontFamily: font.medium, fontSize: 13, color: colors.inkAlt, marginTop: 3 },

  // 문의
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.primaryBg, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, marginTop: 14 },
  contactEmail: { fontFamily: font.bold, fontSize: 15, color: colors.primary },
});
