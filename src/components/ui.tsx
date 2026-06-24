// Shared presentational building blocks (warm palette).
import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, Platform, Image } from 'react-native';
import { colors, cat, urgency, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon, IconName } from './Icon';
import { CATEGORY, CategoryCode, STOCK, StockLevel, emojiFor } from '../data/constants';
import { daysUntil } from '../data/date';
import { useNav } from '../navigation/nav';

// 웹에서 이모지가 흑백 외곽선(text-presentation)으로 폴백되지 않도록 컬러 이모지 폰트를 명시한다.
// (RNW 기본 폰트 스택에는 색상 이모지 폰트가 없어 환경에 따라 흑백 외곽선으로 떨어질 수 있음.)
const emojiFont = Platform.OS === 'web'
  ? ({ fontFamily: '"Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif' } as const)
  : null;

/** Fake phone status bar (9:41 · signal · wifi · battery). */
export function PhoneStatusBar({ dark = false }: { dark?: boolean }) {
  const c = dark ? colors.white : colors.ink;
  return (
    <View style={s.statBar}>
      <Text style={[s.statTime, { color: c }]}>9:41</Text>
      <View style={s.statRight}>
        <Icon name="cell-signal-full" size={16} color={c} weight="fill" />
        <Icon name="wifi-high" size={16} color={c} weight="fill" />
        <Icon name="battery-full" size={20} color={c} weight="fill" />
      </View>
    </View>
  );
}

/** 모든 페이지 공통 우측 상단 액션 — 검색·알림·설정 (동일 크기/색/스타일). */
export function HeaderActions({
  onSearch,
  searchActive,
  showSearch = true,
  showBell = true,
  showSettings = true,
}: {
  onSearch?: () => void;
  searchActive?: boolean;
  showSearch?: boolean;
  showBell?: boolean;
  showSettings?: boolean;
}) {
  const nav = useNav();
  return (
    <View style={ha.row}>
      {showSearch && (
        <Pressable hitSlop={6} onPress={onSearch}>
          <Icon name="search" size={20} color={searchActive ? colors.primary : colors.ink} weight={searchActive ? 'bold' : 'regular'} />
        </Pressable>
      )}
      {showBell && (
        <Pressable hitSlop={6}>
          <Icon name="bell" size={20} color={colors.ink} />
        </Pressable>
      )}
      {showSettings && (
        <Pressable hitSlop={6} onPress={() => nav.setTab('settings')}>
          <Icon name="gear" size={20} color={colors.ink} />
        </Pressable>
      )}
    </View>
  );
}
const ha = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});

/** Colored tile with a food emoji illustration for the ingredient. */
export function FoodTile({ name, category, size = 46 }: { name?: string; category: CategoryCode; size?: number }) {
  const meta = CATEGORY[category] ?? CATEGORY.etc;
  const c = cat[meta.color];
  const emoji = emojiFor(name ?? '', category);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[{ fontSize: size * 0.5, lineHeight: size * 0.62, textAlign: 'center' }, emojiFont]}>{emoji}</Text>
    </View>
  );
}


/** 레시피 타일 — 공공 레시피 완성 사진(URL). 없으면 색 배경 + 기본 이모지. */
export function RecipeTile({ image, size = 52, bg }: { image?: string; size?: number; bg: string }) {
  const r = size * 0.28;
  if (image) {
    return <Image source={{ uri: image }} style={{ width: size, height: size, borderRadius: r, backgroundColor: bg }} resizeMode="cover" />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[{ fontSize: size * 0.5, lineHeight: size * 0.62, textAlign: 'center' }, emojiFont]}>🍽️</Text>
    </View>
  );
}

function ddayTone(dday: number) {
  if (dday <= 2) return urgency.urgent;
  if (dday <= 5) return urgency.warn;
  return urgency.ok;
}

/** D-day badge. expiry(절대 날짜)로부터 오늘 기준 남은 일수를 계산해 표시. null → 미입력(옅게). */
export function DdayBadge({ expiry }: { expiry: string | null }) {
  const dday = daysUntil(expiry);
  if (dday == null) {
    return (
      <View style={[s.badge, { backgroundColor: colors.fill }]}>
        <Text style={[s.badgeText, { color: colors.inkAsst }]}>미입력</Text>
      </View>
    );
  }
  const tone = ddayTone(dday);
  // 소비기한이 지나면 마이너스(-N일)로, 남았으면 D-N, 당일은 D-day.
  const label = dday < 0 ? `-${-dday}일` : dday === 0 ? 'D-day' : `D-${dday}`;
  return (
    <View style={[s.badge, { backgroundColor: tone.bg }]}>
      <Text style={[s.badgeText, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

/** 남은 정도 태그. */
export function StockTag({ stock, qty }: { stock: StockLevel; qty?: string }) {
  const meta = STOCK[stock];
  const tone = meta.color === 'urgent' ? urgency.urgent : meta.color === 'warn' ? urgency.warn : urgency.ok;
  return (
    <View style={[s.stockTag, { backgroundColor: tone.bg }]}>
      <Text style={[s.stockText, { color: tone.fg }]}>{qty ?? meta.label}</Text>
    </View>
  );
}

/** Section title with optional right action. */
export function SectionTitle({ title, count, actionLabel, actionIcon, onAction, style, compact }: { title: string; count?: number; actionLabel?: string; actionIcon?: IconName; onAction?: () => void; style?: ViewStyle; compact?: boolean }) {
  return (
    <View style={[s.sectionTitle, style]}>
      <View style={s.sectionTitleLeft}>
        <Text style={[s.sectionTitleText, compact && s.sectionTitleCompact]}>{title}</Text>
        {count != null && (
          <View style={s.sectionCount}>
            <Text style={s.sectionCountText}>{count}</Text>
          </View>
        )}
      </View>
      {actionLabel && (
        <Pressable onPress={onAction} hitSlop={8} style={s.sectionAction}>
          <Text style={s.sectionActionText}>{actionLabel}</Text>
          <Icon name={actionIcon ?? 'caret-right'} size={14} color={colors.inkAlt} weight="bold" />
        </Pressable>
      )}
    </View>
  );
}

/** 바텀시트 상단 핸들(그랩 바). 모든 바텀시트 최상단에 둔다. */
export function SheetHandle() {
  return <View style={s.sheetHandle} />;
}

type PillTone = 'primary' | 'accent' | 'neutral';
export function Pill({ icon, label, tone = 'primary' }: { icon?: IconName; label: string; tone?: PillTone }) {
  const fg = tone === 'primary' ? colors.primary : tone === 'accent' ? colors.accentDark : colors.inkAlt;
  const bg = tone === 'primary' ? colors.primaryBg : tone === 'accent' ? colors.accentBg : colors.fill;
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      {icon && <Icon name={icon} size={13} color={fg} weight="bold" />}
      <Text style={[s.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipOn]}>
      <Text style={[s.chipText, active && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
  icon?: IconName;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const ghost = variant === 'ghost';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[
        s.btn,
        ghost ? s.btnGhost : s.btnPrimary,
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={18} color={ghost ? colors.primary : colors.white} weight="bold" />}
      <Text style={[s.btnText, { color: ghost ? colors.primary : colors.white }]}>{label}</Text>
    </Pressable>
  );
}

/** Screen header bar with optional back + right slot. */
export function ScreenHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View style={s.header}>
      <View style={s.headerLeft}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={8}>
            <Icon name="caret-left" size={26} color={colors.ink} weight="bold" />
          </Pressable>
        )}
        <Text style={s.headerTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, marginBottom: 14 },
  statBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 14, paddingBottom: 2 },
  statTime: { fontFamily: font.bold, fontSize: 14 },
  statRight: { flexDirection: 'row', gap: 7, alignItems: 'center' },

  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  badgeText: { fontFamily: font.extrabold, fontSize: 13 },

  stockTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  stockText: { fontFamily: font.bold, fontSize: 12 },

  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 12 },
  sectionTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitleText: { fontFamily: font.extrabold, fontSize: 18, color: colors.ink, letterSpacing: -0.3 },
  sectionTitleCompact: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  sectionCount: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7, backgroundColor: '#E2DFD3', alignItems: 'center', justifyContent: 'center' },
  sectionCountText: { fontFamily: font.bold, fontSize: 12.5, color: colors.inkAlt },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { fontFamily: font.semibold, fontSize: 13, color: colors.inkAlt },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill },
  pillText: { fontFamily: font.bold, fontSize: 12.5 },

  chip: { backgroundColor: colors.fill, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  chipOn: { backgroundColor: colors.primary },
  chipText: { fontFamily: font.bold, fontSize: 13, color: colors.inkAlt },
  chipTextOn: { color: colors.white },

  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 16 },
  btnPrimary: { backgroundColor: colors.primary },
  btnGhost: { backgroundColor: colors.primaryBg },
  btnText: { fontFamily: font.bold, fontSize: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontFamily: font.extrabold, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
});
