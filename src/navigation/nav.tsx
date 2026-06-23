// Lightweight navigation for the demo: app phase + active tab + an overlay
// (full-screen sub-pages like recipe detail / ingredient form). Dialogs that
// belong to a single screen stay local to that screen.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadJSON, saveJSON, STORAGE_KEYS } from '../data/persist';

export type Phase = 'onboarding' | 'setup' | 'main';
export type TabKey = 'home' | 'fridge' | 'recipe' | 'shopping' | 'settings';
// 빠른 세팅 진입 방식: fresh(최초 실행) / append(기존 냉장고에 추가) / replace(초기화 후 새로)
export type SetupMode = 'fresh' | 'append' | 'replace';

export type Overlay =
  | { name: 'recipeDetail'; recipeId: string }
  | { name: 'ingredientForm'; itemId?: string; prefillName?: string; shoppingId?: string }
  | null;

interface Nav {
  phase: Phase;
  tab: TabKey;
  overlay: Overlay;
  fridgeFocus: string | null; // 냉장고 탭 진입 시 포커스할 보관 위치(저장 직후 1회성 신호)
  setupMode: SetupMode; // 빠른 세팅 진입 방식
  setPhase: (p: Phase) => void;
  setTab: (t: TabKey) => void;
  startSetup: (mode: 'append' | 'replace') => void; // 설정에서 '빠른 세팅 다시 하기' — 추가/초기화 선택
  goToFridge: (storage?: string) => void; // 냉장고 탭으로 이동 + (선택) 보관 위치 하위 탭 포커스
  clearFridgeFocus: () => void;
  openRecipe: (recipeId: string) => void;
  openIngredientForm: (opts?: { itemId?: string; prefillName?: string; shoppingId?: string }) => void;
  closeOverlay: () => void;
}

const Ctx = createContext<Nav | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('onboarding');
  const [tab, setTab] = useState<TabKey>('home');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [fridgeFocus, setFridgeFocus] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState<SetupMode>('fresh');
  const [hydrated, setHydrated] = useState(false);

  // 저장된 진행 단계를 복원한다 — 온보딩을 마친 사용자는 바로 메인으로 들어온다.
  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await loadJSON<Phase>(STORAGE_KEYS.phase);
      if (!alive) return;
      if (saved) setPhase(saved);
      setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (hydrated) saveJSON(STORAGE_KEYS.phase, phase);
  }, [phase, hydrated]);

  const value = useMemo<Nav>(
    () => ({
      phase,
      tab,
      overlay,
      fridgeFocus,
      setupMode,
      // 온보딩으로 돌아가면(최초 실행/데이터 초기화) 다음 세팅은 항상 fresh로 시작한다.
      setPhase: (p) => { if (p === 'onboarding') setSetupMode('fresh'); setPhase(p); },
      setTab,
      startSetup: (mode) => { setSetupMode(mode); setPhase('setup'); },
      goToFridge: (storage) => { setTab('fridge'); setFridgeFocus(storage ?? null); },
      clearFridgeFocus: () => setFridgeFocus(null),
      openRecipe: (recipeId) => setOverlay({ name: 'recipeDetail', recipeId }),
      openIngredientForm: (opts) => setOverlay({ name: 'ingredientForm', itemId: opts?.itemId, prefillName: opts?.prefillName, shoppingId: opts?.shoppingId }),
      closeOverlay: () => setOverlay(null),
    }),
    [phase, tab, overlay, fridgeFocus, setupMode]
  );

  // 복원 전에는 렌더하지 않아 온보딩 화면이 잠깐 깜빡이는 것을 막는다.
  if (!hydrated) return null;

  return React.createElement(Ctx.Provider, { value }, children);
}

export function useNav(): Nav {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNav must be used within NavProvider');
  return v;
}
