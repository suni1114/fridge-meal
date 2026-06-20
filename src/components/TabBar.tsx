// 하단 탭: 홈 · 냉장고 · [추가] · 요리추천 · 장보기 (설정은 홈 상단 톱니에서 접근)
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
      {/* 가운데 강조된 식재료 추가 버튼 */}
      <Pressable style={s.item} onPress={() => nav.openIngredientForm()}>
        <View style={s.addFab}>
          <Icon name="plus" size={26} color={colors.white} weight="bold" />
        </View>
        <Text style={[s.label, s.addLabel]}>추가</Text>
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
  // 가운데 추가 버튼 — 둥근 사각(스퀘어클) + 부드러운 그림자로 세련되게.
  addFab: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    ...Platform.select({
      web: { boxShadow: '0 8px 18px rgba(46,90,46,0.28)' } as any,
      default: { elevation: 6, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 9, shadowOffset: { width: 0, height: 6 } },
    }),
  },
  addLabel: { color: colors.primary, fontFamily: font.bold, marginTop: 6 },
});
