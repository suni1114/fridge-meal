// 온보딩 (spec §9.1) — 3 slides, 앱 가치 전달.
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform, PanResponder, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  // 실기기 하단 제스처 바(홈 인디케이터)에 버튼이 가리지 않도록 안전영역만큼 띄운다.
  const bottomPad = Platform.OS === 'web' ? 24 : Math.max(insets.bottom, 24);
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  // 전환 애니메이션: 슬라이드가 바뀔 때 방향에 맞춰 옆에서 미끄러지며 나타난다.
  const dirRef = useRef(1); // 1 = 다음(오른쪽→), -1 = 이전(←왼쪽)
  const prog = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    prog.setValue(0);
    Animated.timing(prog, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE_DRIVER }).start();
  }, [i]);

  // 하드웨어 백: 이전 슬라이드로. 첫 슬라이드면 기본 동작(앱 종료) 허용.
  useEffect(() => {
    const onBack = () => {
      if (i > 0) { dirRef.current = -1; setI((p) => Math.max(p - 1, 0)); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [i]);

  // 좌우 스와이프로 슬라이드 이동. 40px 이상 끌면 다음/이전으로.
  const goByDx = (dx: number) => {
    if (dx <= -40) { dirRef.current = 1; setI((p) => Math.min(p + 1, SLIDES.length - 1)); } // 왼쪽으로 → 다음
    else if (dx >= 40) { dirRef.current = -1; setI((p) => Math.max(p - 1, 0)); } // 오른쪽으로 → 이전
  };

  // 네이티브(실기기): 터치 제스처용 PanResponder.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => goByDx(g.dx),
    })
  ).current;

  // 웹(브라우저): 마우스 드래그용 — PanResponder가 마우스를 못 잡으므로 마우스 이벤트로 직접 처리.
  const dragStartX = useRef<number | null>(null);
  const handlers: any =
    Platform.OS === 'web'
      ? {
          onMouseDown: (e: any) => {
            dragStartX.current = e?.nativeEvent?.clientX ?? e?.clientX ?? null;
          },
          onMouseUp: (e: any) => {
            const start = dragStartX.current;
            dragStartX.current = null;
            if (start == null) return;
            const endX = e?.nativeEvent?.clientX ?? e?.clientX ?? start;
            goByDx(endX - start);
          },
        }
      : pan.panHandlers;

  return (
    <View style={[s.root, { paddingBottom: bottomPad }]} {...handlers}>
      <Animated.View
        style={[
          s.hero,
          {
            opacity: prog,
            transform: [{ translateX: prog.interpolate({ inputRange: [0, 1], outputRange: [dirRef.current * 56, 0] }) }],
          },
        ]}
      >
        <View style={s.iconWrap}>
          {slide.icon === 'cooking-pot' ? (
            <SimmeringPot />
          ) : slide.icon === 'snowflake' ? (
            <SpinningSnowflake />
          ) : slide.icon === 'basket' ? (
            <BouncingBasket />
          ) : (
            <Icon name={slide.icon} size={72} color={colors.primary} weight="fill" />
          )}
        </View>
        <Text style={s.title}>{slide.title}</Text>
        <Text style={s.body}>{slide.body}</Text>
      </Animated.View>

      <View style={s.dots}>
        {SLIDES.map((_, idx) => (
          <View key={idx} style={[s.dot, idx === i && s.dotOn]} />
        ))}
      </View>

      <AppButton
        label={last ? '냉장고 시작하기' : '다음'}
        icon={last ? 'arrow-right' : undefined}
        onPress={() => {
          if (last) onDone();
          else { dirRef.current = 1; setI(i + 1); }
        }}
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

// 웹에서는 native driver가 없으므로 JS 드라이버로 폴백한다.
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// 냄비 입구에서 피어오르는 수증기 한 줄기 — 위로 올라가며 흐려진다.
function SteamWisp({ delay, height }: { delay: number; height: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View
      style={[
        s.wisp,
        {
          height,
          opacity: v.interpolate({ inputRange: [0, 0.2, 0.75, 1], outputRange: [0, 0.5, 0.22, 0] }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [4, -22] }) },
            { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) },
          ],
        },
      ]}
    />
  );
}

// 잔잔히 끓는 냄비 — 냄비는 위아래로 살짝 들썩이고, 위로 수증기가 피어오른다.
function SimmeringPot() {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(bob, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <View style={s.potBox}>
      <View style={s.steamRow} pointerEvents="none">
        <SteamWisp delay={0} height={12} />
        <SteamWisp delay={530} height={16} />
        <SteamWisp delay={1060} height={12} />
      </View>
      <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }}>
        <Icon name="cooking-pot" size={72} color={colors.primary} weight="fill" />
      </Animated.View>
    </View>
  );
}

// 천천히 도는 눈송이 — 회전 + 잔잔한 맥동으로 차가운 느낌을 준다.
function SpinningSnowflake() {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: USE_NATIVE_DRIVER })
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    a.start();
    b.start();
    return () => { a.stop(); b.stop(); };
  }, []);
  return (
    <Animated.View
      style={{
        transform: [
          { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
          { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
        ],
      }}
    >
      <Icon name="snowflake" size={72} color={colors.primary} weight="fill" />
    </Animated.View>
  );
}

// 통통 튀는 장바구니 — 살짝 떠올랐다 바운스하며 내려오고, 기우뚱한다.
function BouncingBasket() {
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(bounce, { toValue: 0, duration: 700, easing: Easing.bounce, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.delay(500),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View
      style={{
        transform: [
          { translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
          { rotate: bounce.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-5deg'] }) },
        ],
      }}
    >
      <Icon name="basket" size={72} color={colors.primary} weight="fill" />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream, paddingBottom: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  iconWrap: { width: 132, height: 132, borderRadius: 66, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  potBox: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  steamRow: { position: 'absolute', top: 0, flexDirection: 'row', gap: 5, alignItems: 'flex-end', zIndex: 2 },
  wisp: { width: 4, borderRadius: 2, backgroundColor: colors.primary },
  title: { fontFamily: font.extrabold, fontSize: 28, color: colors.ink, textAlign: 'center', lineHeight: 38, letterSpacing: -0.5 },
  body: { fontFamily: font.medium, fontSize: 16, color: colors.inkAlt, textAlign: 'center', lineHeight: 25, marginTop: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lineStrong },
  dotOn: { width: 22, backgroundColor: colors.primary },
  skip: { fontFamily: font.semibold, fontSize: 14, color: colors.inkAsst, textAlign: 'center', paddingVertical: 6 },
});
