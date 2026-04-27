import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { GradingStrictness } from '@/types/grading';

export type UiVariant = 'classic' | 'wds';

const UI_VARIANT_KEY = 'gradely.uiVariant';

function readPersistedVariant(): UiVariant {
  if (typeof window === 'undefined') return 'classic';
  try {
    const value = window.localStorage.getItem(UI_VARIANT_KEY);
    return value === 'wds' ? 'wds' : 'classic';
  } catch {
    return 'classic';
  }
}

function persistVariant(variant: UiVariant) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(UI_VARIANT_KEY, variant);
  } catch {
    // ignore quota / privacy errors
  }
}

interface UserPreferencesState {
  defaultGradingStrictness: GradingStrictness;
  isLoaded: boolean;
  uiVariant: UiVariant;

  setDefaultGradingStrictness: (strictness: GradingStrictness) => void;
  setUiVariant: (variant: UiVariant) => void;
  loadPreferences: (userId: string) => Promise<void>;
  savePreferences: (userId: string) => Promise<void>;
}

export const useUserPreferencesStore = create<UserPreferencesState>((set, get) => ({
  defaultGradingStrictness: 'standard',
  isLoaded: false,
  uiVariant: readPersistedVariant(),

  setDefaultGradingStrictness: (strictness) => set({ defaultGradingStrictness: strictness }),

  setUiVariant: (variant) => {
    persistVariant(variant);
    set({ uiVariant: variant });
  },

  loadPreferences: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('default_grading_strictness')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        set({
          defaultGradingStrictness: data.default_grading_strictness as GradingStrictness,
          isLoaded: true,
        });
      } else {
        // 레코드 없음 — 기본값 사용
        set({ isLoaded: true });
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
      set({ isLoaded: true });
    }
  },

  savePreferences: async (userId) => {
    const { defaultGradingStrictness } = get();
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          default_grading_strictness: defaultGradingStrictness,
        });
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  },
}));
