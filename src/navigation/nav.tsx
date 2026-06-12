// Lightweight navigation for the demo: app phase + active tab + an overlay
// (full-screen sub-pages like recipe detail / ingredient form). Dialogs that
// belong to a single screen stay local to that screen.
import React, { createContext, useContext, useMemo, useState } from 'react';

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

  return React.createElement(Ctx.Provider, { value }, children);
}

export function useNav(): Nav {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNav must be used within NavProvider');
  return v;
}
