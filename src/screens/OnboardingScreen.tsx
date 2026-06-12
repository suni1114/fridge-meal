// 온보딩 (spec §9.1) — 3 slides, 앱 가치 전달.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';
import { font } from '../theme/fonts';
import { Icon, IconName } from '../components/Icon';
import { AppButton } from '../components/ui';

const SLIDES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'snowflake',
    title: '냉장고 속 재료,\n이제 잊지 마세요.',
    body: '식재료를 등록하면 유통기한과\n남은 재료를 쉽게 확인할 수 있어요.',
  },
  {
    icon: 'cooking-pot',
    title: '있는 재료로\n오늘의 한 끼를 추천해요.',
    body: '지금 만들 수 있는 요리와\n조금만 사면 가능한 요리를 알려드려요.',
  },
  {
    icon: 'basket',
    title: '장보기 목록까지\n자동으로 정리해요.',
    body: '떨어진 재료와 부족한 재료를\n한 번에 장보기 목록으로 모아보세요.',
  },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  return (
    <View style={s.root}>
      <View style={s.hero}>
        <View style={s.iconWrap}>
          <Icon name={slide.icon} size={72} color={colors.primary} weight="fill" />
        </View>
        <Text style={s.title}>{slide.title}</Text>
        <Text style={s.body}>{slide.body}</Text>
      </View>

      <View style={s.dots}>
        {SLIDES.map((_, idx) => (
          <View key={idx} style={[s.dot, idx === i && s.dotOn]} />
        ))}
      </View>

      <AppButton
        label={last ? '냉장고 시작하기' : '다음'}
        icon={last ? 'arrow-right' : undefined}
        onPress={() => (last ? onDone() : setI(i + 1))}
        style={{ marginHorizontal: 24, marginBottom: 14 }}
      />
      {!last && (
        <Text style={s.skip} onPress={onDone}>
          건너뛰기
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream, paddingBottom: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  iconWrap: { width: 132, height: 132, borderRadius: 66, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontFamily: font.extrabold, fontSize: 28, color: colors.ink, textAlign: 'center', lineHeight: 38, letterSpacing: -0.5 },
  body: { fontFamily: font.medium, fontSize: 16, color: colors.inkAlt, textAlign: 'center', lineHeight: 25, marginTop: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lineStrong },
  dotOn: { width: 22, backgroundColor: colors.primary },
  skip: { fontFamily: font.semibold, fontSize: 14, color: colors.inkAsst, textAlign: 'center', paddingVertical: 6 },
});
