// 설정 (spec §9.13)
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon, IconName } from '../components/Icon';
import { useApp } from '../data/store';
import { useNav } from '../navigation/nav';

export function SettingsScreen() {
  const { fridge } = useApp();
  const nav = useNav();

  const groups: { title?: string; items: { icon: IconName; label: string; danger?: boolean; onPress?: () => void }[] }[] = [
    {
      items: [
        { icon: 'bell-ringing', label: '알림 설정' },
        { icon: 'magic-wand', label: '냉장고 빠른 세팅 다시 하기', onPress: () => nav.setPhase('setup') },
        { icon: 'list-checks', label: '기본 식재료 관리' },
      ],
    },
    {
      items: [
        { icon: 'fork-knife', label: '레시피 데이터 정보' },
        { icon: 'info', label: '앱 정보' },
        { icon: 'heart', label: '문의하기' },
      ],
    },
    {
      items: [{ icon: 'trash', label: '데이터 초기화', danger: true }],
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
            <Text style={s.profileMeta}>등록된 식재료 {fridge.length}개 · 집밥 기본형</Text>
          </View>
        </View>

        {groups.map((g, gi) => (
          <View key={gi} style={s.group}>
            {g.items.map((it, i) => (
              <Pressable key={it.label} style={[s.row, i > 0 && s.rowDivider]} onPress={it.onPress}>
                <Icon name={it.icon} size={21} color={it.danger ? colors.coral : colors.ink} />
                <Text style={[s.rowLabel, it.danger && { color: colors.coral }]}>{it.label}</Text>
                {!it.danger && <Icon name="caret-right" size={16} color={colors.inkAsst} weight="bold" />}
              </Pressable>
            ))}
          </View>
        ))}

        <Text style={s.version}>냉장고비서 V1.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  title: { fontFamily: font.extrabold, fontSize: 24, color: colors.ink, letterSpacing: -0.5 },

  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: 18, marginBottom: 18 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontFamily: font.bold, fontSize: 18, color: colors.ink },
  profileMeta: { fontFamily: font.medium, fontSize: 13, color: colors.inkAlt, marginTop: 3 },

  group: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  rowLabel: { flex: 1, fontFamily: font.semibold, fontSize: 16, color: colors.ink },

  version: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkAsst, textAlign: 'center', marginTop: 10 },
});
