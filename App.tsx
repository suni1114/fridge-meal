// 냉장고비서 (fridge-meal) — V1.0 데모
// 온보딩 → 빠른 세팅 → 메인(홈·냉장고·요리추천·장보기·설정) + 오버레이(레시피 상세·식재료 폼)
import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, BackHandler } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { fontAssets } from './src/theme/fonts';
import { colors } from './src/theme/tokens';
import { PhoneStatusBar } from './src/components/ui';
import { TabBar } from './src/components/TabBar';
import { AppProvider } from './src/data/store';
import { NavProvider, useNav } from './src/navigation/nav';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { QuickSetupScreen } from './src/screens/QuickSetupScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { FridgeScreen } from './src/screens/FridgeScreen';
import { RecipeListScreen } from './src/screens/RecipeListScreen';
import { RecipeDetailScreen } from './src/screens/RecipeDetailScreen';
import { ShoppingScreen } from './src/screens/ShoppingScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { IngredientFormScreen } from './src/screens/IngredientFormScreen';

function Root() {
  const nav = useNav();

  // 안드로이드 하드웨어 백 버튼: 앱을 바로 닫지 않고 이전 화면으로 보낸다.
  // 내부 모달은 RN Modal의 onRequestClose가, 다단계 화면(온보딩/세팅/식재료 폼)은
  // 각 화면이 자체 등록한 핸들러가 먼저 처리한다(LIFO). 여기서는 그 외 최상위 단계만 처리.
  useEffect(() => {
    const onBack = () => {
      if (nav.overlay) { nav.closeOverlay(); return true; } // 오버레이(레시피 상세 등) 닫기
      if (nav.phase === 'main' && nav.tab !== 'home') { nav.setTab('home'); return true; } // 다른 탭 → 홈
      return false; // 홈에서 더 뒤로 → 기본 동작(앱 종료)
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [nav.overlay, nav.phase, nav.tab]);

  const renderTab = () => {
    switch (nav.tab) {
      case 'home': return <HomeScreen />;
      case 'fridge': return <FridgeScreen />;
      case 'recipe': return <RecipeListScreen />;
      case 'shopping': return <ShoppingScreen />;
      case 'settings': return <SettingsScreen />;
    }
  };

  return (
    <View style={s.body}>
      {nav.phase === 'onboarding' && <OnboardingScreen onDone={() => nav.setPhase('setup')} />}
      {nav.phase === 'setup' && <QuickSetupScreen onDone={() => { nav.setTab('home'); nav.setPhase('main'); }} />}
      {nav.phase === 'main' && (
        <>
          <View style={{ flex: 1 }}>{renderTab()}</View>
          <TabBar active={nav.tab} onChange={nav.setTab} />
        </>
      )}

      {/* full-screen overlays */}
      {nav.overlay && (
        <View style={s.overlay}>
          {nav.overlay.name === 'recipeDetail' && <RecipeDetailScreen recipeId={nav.overlay.recipeId} />}
          {nav.overlay.name === 'ingredientForm' && (
            <IngredientFormScreen itemId={nav.overlay.itemId} prefillName={nav.overlay.prefillName} shoppingId={nav.overlay.shoppingId} />
          )}
        </View>
      )}
    </View>
  );
}

// 폰 셸: 웹은 데모용 폰 프레임(가짜 상태바 포함), 네이티브는 실기기 세이프에어리어를 반영한다.
function PhoneShell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'web') {
    return (
      <View style={s.phone}>
        <PhoneStatusBar />
        {children}
      </View>
    );
  }

  // 실기기: 상단 인셋(노치/다이나믹 아일랜드)만큼만 패딩 — 가짜 상태바는 쓰지 않는다.
  return <View style={[s.phoneNative, { paddingTop: insets.top }]}>{children}</View>;
}

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);

  // 웹에서 Windows 기본 이모지(Segoe, 두꺼운 검정 외곽선) 대신 외곽선이 얇은 Noto Color Emoji를 사용.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const id = 'noto-color-emoji';
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap';
        document.head.appendChild(link);
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <View style={s.backdrop}>
        <StatusBar style="dark" />
        <PhoneShell>
          {fontsLoaded ? (
            <AppProvider>
              <NavProvider>
                <Root />
              </NavProvider>
            </AppProvider>
          ) : (
            <View style={{ flex: 1, backgroundColor: colors.cream }} />
          )}
        </PhoneShell>
      </View>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#DDE3DC' : colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 웹: 데모용 고정 폰 프레임
  phone: {
    width: 390,
    height: 844,
    backgroundColor: colors.cream,
    borderRadius: 40,
    overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(20,30,20,0.22)',
  } as any,
  // 네이티브: 화면 전체를 채우고 상단 인셋은 PhoneShell에서 동적으로 적용
  phoneNative: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.cream,
  },
  body: { flex: 1, backgroundColor: colors.cream },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.cream },
});
