// 하단 탭: 홈 · 냉장고 · [추가] · 요리추천 · 장보기 (설정은 홈 상단 톱니에서 접근)
import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon, IconName } from './Icon';
import { TabKey, useNav } from '../navigation/nav';

// 탭 아이콘 — 선택 시 채움(fill) 아이콘이 아래에서 위로 차오른다.
// phosphor fill 아이콘은 글리프 모양 그대로의 투명 실루엣이라, 하단부터 잘라 보여주면
// 마스크 없이도 글리프 모양대로 액체처럼 채워지는 효과가 난다(채움 표면은 수평).
function TabIcon({ name, size, active, fillWeight = 'fill' }: { name: IconName; size: number; active: boolean; fillWeight?: 'fill' | 'bold' }) {
  const p = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(p, {
      toValue: active ? 1 : 0,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // height(레이아웃) 애니메이션이라 네이티브 드라이버 불가
    }).start();
  }, [active, p]);
  const fillHeight = p.interpolate({ inputRange: [0, 1], outputRange: [0, size] });
  return (
    <View style={{ width: size, height: size }}>
      {/* 바닥: 빈 윤곽선 아이콘 */}
      <View style={StyleSheet.absoluteFill}>
        <Icon name={name} size={size} color={colors.inkAsst} weight="regular" />
      </View>
      {/* 위: 아래에서 위로 차오르는 채움 아이콘(하단 클립) */}
      <Animated.View style={[s.fillClip, { height: fillHeight }]}>
        <View style={{ position: 'absolute', bottom: 0, width: size, height: size }}>
          <Icon name={name} size={size} color={colors.primary} weight={fillWeight} />
        </View>
      </Animated.View>
    </View>
  );
}

type TabDef = { key: TabKey; label: string; icon: IconName };
const LEFT: TabDef[] = [
  { key: 'home', label: '홈', icon: 'house' },
  { key: 'fridge', label: '냉장고', icon: 'snowflake' },
];
const RIGHT: TabDef[] = [
  { key: 'shopping', label: '장보기', icon: 'shopping-cart-simple' },
  { key: 'recipe', label: '요리추천', icon: 'fork-knife' },
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
        {/* 냉장고(눈결정체)는 fill이 솔리드 덩어리로 보여 모양이 뭉개지므로 bold로 모양 유지 + 색 채움 */}
        <TabIcon name={t.icon} size={23} active={on} fillWeight={t.icon === 'snowflake' ? 'bold' : 'fill'} />
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
  // 채움 클립 — 하단에 고정하고 height를 0→size로 키워 아래에서 위로 드러낸다.
  fillClip: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
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
