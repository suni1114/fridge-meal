// Lightweight navigation for the demo: app phase + active tab + an overlay
// (full-screen sub-pages like recipe detail / ingredient form). Dialogs that
// belong to a single screen stay local to that screen.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadJSON, saveJSON, STORAGE_KEYS } from '../data/persist';

export type Phase = 'onboarding' | 'setup' | 'main';
export type TabKey = 'home' | 'fridge' | 'recipe' | 'shopping' | 'settings';

export type Overlay =
  | { name: 'recipeDetail'; recipeId: string }
  | { name: 'ingredientForm'; itemId?: string; prefillName?: string }
  | null;

interface Nav {
  phase: Phase;
  tab: TabKey;
  overlay: Overlay;
  setPhase: (p: Phase) => void;
  setTab: (t: TabKey) => void;
  openRecipe: (recipeId: string) => void;
  openIngredientForm: (opts?: { itemId?: string; prefillName?: string }) => void;
  closeOverlay: () => void;
}

const Ctx = createContext<Nav | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('onboarding');
  const [tab, setTab] = useState<TabKey>('home');
  const [overlay, setOverlay] = useState<Overlay>(null);
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
      setPhase,
      setTab,
      openRecipe: (recipeId) => setOverlay({ name: 'recipeDetail', recipeId }),
      openIngredientForm: (opts) => setOverlay({ name: 'ingredientForm', itemId: opts?.itemId, prefillName: opts?.prefillName }),
      closeOverlay: () => setOverlay(null),
    }),
    [phase, tab, overlay]
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
