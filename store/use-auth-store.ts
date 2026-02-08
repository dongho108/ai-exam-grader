import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  initialize: () => () => void; // Returns unsubscribe function
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: () => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        user: session?.user ?? null,
        isAuthenticated: !!session?.user,
        isLoading: false,
      });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        set({
          user: session?.user ?? null,
          isAuthenticated: !!session?.user,
          isLoading: false,
        });
      }
    );

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
    };
  },

  signInWithGoogle: async () => {
    try {
      const redirectTo = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      console.log('[Auth] Google Sign-In initiated');
      console.log('[Auth] Using redirect URL:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true, // We'll handle popup manually
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Try popup first
        const popup = window.open(
          data.url,
          'google-login',
          'width=500,height=600,left=200,top=100'
        );

        // Fallback to redirect if popup blocked
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          console.warn('Popup blocked, falling back to redirect (state may be lost)');
          window.location.href = data.url;
        }
        // Supabase SDK will handle session propagation via BroadcastChannel/localStorage
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({
        user: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },
}));
