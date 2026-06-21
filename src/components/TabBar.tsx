// 하단 탭: 홈 · 냉장고 · [추가] · 요리추천 · 장보기 (설정은 홈 상단 톱니에서 접근)
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon, IconName } from './Icon';
import { TabKey, useNav } from '../navigation/nav';

type TabDef = { key: TabKey; label: string; icon: IconName };
const LEFT: TabDef[] = [
  { key: 'home', label: '홈', icon: 'house' },
  { key: 'fridge', label: '냉장고', icon: 'snowflake' },
];
const RIGHT: TabDef[] = [
  { key: 'recipe', label: '요리추천', icon: 'fork-knife' },
  { key: 'shopping', label: '장보기', icon: 'shopping-cart-simple' },
];

export function TabBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  const insets = useSafeAreaInsets();
  const nav = useNav();
  // 웹은 기존 데모 값(20)을 유지하고, 실기기는 홈 인디케이터만큼 띄운다.
  const paddingBottom = Platform.OS === 'web' ? 20 : Math.max(insets.bottom, 12);

  const renderTab = (t: TabDef) => {
    const on = t.key === active;
    return (
      <Pressable key={t.key} style={s.item} onPress={() => onChange(t.key)}>
        <Icon
          name={t.icon}
          size={23}
          color={on ? colors.primary : colors.inkAsst}
          weight={on ? (t.icon === 'snowflake' ? 'bold' : 'fill') : 'regular'}
        />
        <Text style={[s.label, { color: on ? colors.primary : colors.inkAsst, fontFamily: on ? font.bold : font.semibold }]}>{t.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[s.nav, { paddingBottom }]}>
      {LEFT.map(renderTab)}
      {/* 가운데 식재료 추가 버튼 — 원형 + 11시 방향 그라데이션, 원 전체 균일 글로우 */}
      <Pressable style={s.item} onPress={() => nav.openIngredientForm()}>
        <View style={s.addFabGlow}>
          <LinearGradient
            colors={[colors.primaryDark, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.addFab}
          >
            <Icon name="plus" size={19} color={colors.white} weight="bold" />
          </LinearGradient>
        </View>
      </Pressable>
      {RIGHT.map(renderTab)}
    </View>
  );
}

const s = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 11,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  item: { alignItems: 'center', gap: 4, flex: 1 },
  label: { fontSize: 11 },
  // 글로우(드롭쉐도우) — 방향 없이 원 전체에 균일, 연두에 초록끼를 살짝.
  addFabGlow: {
    borderRadius: 22,
    ...Platform.select({
      web: { boxShadow: '0 0 20px rgba(124,205,84,0.65)' } as any,
      default: { elevation: 8, shadowColor: '#7CCD54', shadowOpacity: 0.65, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
    }),
  },
  // 추가 버튼 본체 — 원형, 다른 탭 아이콘과 같은 줄에 맞춤, 11시 방향 그라데이션.
  addFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
