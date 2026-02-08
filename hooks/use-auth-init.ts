import { useEffect } from 'react';
import { useAuthStore } from '@/store/use-auth-store';
import { supabase } from '@/lib/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

/**
 * Hook to initialize authentication state.
 * Should be called once at the app root level.
 */
export function useAuthInit() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    const unsubscribe = initialize();

    // 팝업 창 자동 닫기 로직: 'google-login' 이름의 팝업이고 부모 창이 있으면 닫음
    if (window.name === 'google-login' && window.opener) {
      // 세션이 확보되면 팝업을 닫음 (PKCE 교환 완료 대기)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          // 다른 탭에 세션이 동기화될 시간을 주기 위해 아주 잠깐 대기 후 닫음
          setTimeout(() => {
            window.close();
          }, 200);
        }
      });

      return () => {
        subscription.unsubscribe();
        unsubscribe();
      };
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [initialize]);
}
