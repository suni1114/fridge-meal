// Bottom tab navigation: 홈 · 냉장고 · 요리추천 · 장보기 · 설정
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon, IconName } from './Icon';
import { TabKey } from '../navigation/nav';

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'home', label: '홈', icon: 'house' },
  { key: 'fridge', label: '냉장고', icon: 'snowflake' },
  { key: 'recipe', label: '요리추천', icon: 'fork-knife' },
  { key: 'shopping', label: '장보기', icon: 'shopping-cart-simple' },
  { key: 'settings', label: '설정', icon: 'gear' },
];

export function TabBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  const insets = useSafeAreaInsets();
  // 웹은 기존 데모 값(20)을 유지하고, 실기기는 홈 인디케이터만큼 띄운다.
  const paddingBottom = Platform.OS === 'web' ? 20 : Math.max(insets.bottom, 12);
  return (
    <View style={[s.nav, { paddingBottom }]}>
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} style={s.item} onPress={() => onChange(t.key)}>
            <Icon name={t.icon} size={23} color={on ? colors.primary : colors.inkAsst} weight={on ? 'fill' : 'regular'} />
            <Text style={[s.label, { color: on ? colors.primary : colors.inkAsst, fontFamily: on ? font.bold : font.semibold }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 11,
    paddingBottom: 20,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  item: { alignItems: 'center', gap: 4, flex: 1 },
  label: { fontSize: 11 },
});
