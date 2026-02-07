import { useEffect } from 'react';
import { useAuthStore } from '@/store/use-auth-store';

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
      setTimeout(() => {
        window.close();
      }, 500);
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [initialize]);
}
