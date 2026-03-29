import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSignInWithOAuth, mockIsElectron } = vi.hoisted(() => ({
  mockSignInWithOAuth: vi.fn(),
  mockIsElectron: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOAuth: mockSignInWithOAuth,
      exchangeCodeForSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/is-electron', () => ({
  isElectron: () => mockIsElectron(),
}));

import { useAuthStore } from '../use-auth-store';

describe('signInWithGoogle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/o/oauth2/v2/auth?...' },
      error: null,
    });
  });

  describe('Electron 환경', () => {
    beforeEach(() => {
      mockIsElectron.mockReturnValue(true);
      window.electronAPI = {
        isElectron: true,
        platform: 'darwin',
        openExternal: vi.fn().mockResolvedValue(undefined),
        onAuthCallback: vi.fn().mockReturnValue(() => {}),
        startAuthServer: vi.fn().mockResolvedValue(54321),
        scanner: {
          checkAvailability: vi.fn(),
          listDevices: vi.fn(),
          scan: vi.fn(),
          readScanFile: vi.fn(),
          cleanupScanFile: vi.fn(),
        },
      } as any;
    });

    it('startAuthServer 호출하여 포트 획득', async () => {
      await useAuthStore.getState().signInWithGoogle();

      expect(window.electronAPI!.startAuthServer).toHaveBeenCalledOnce();
    });

    it('redirectTo가 http://localhost:{port}/auth/callback 형태', async () => {
      await useAuthStore.getState().signInWithGoogle();

      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            redirectTo: 'http://localhost:54321/auth/callback',
          }),
        })
      );
    });

    it('supabase.auth.signInWithOAuth 호출 시 skipBrowserRedirect: true', async () => {
      await useAuthStore.getState().signInWithGoogle();

      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
          options: expect.objectContaining({
            skipBrowserRedirect: true,
          }),
        })
      );
    });

    it('반환된 URL을 openExternal로 열기', async () => {
      await useAuthStore.getState().signInWithGoogle();

      expect(window.electronAPI!.openExternal).toHaveBeenCalledWith(
        'https://accounts.google.com/o/oauth2/v2/auth?...'
      );
    });

    it('startAuthServer 실패 시 에러 throw', async () => {
      (window.electronAPI!.startAuthServer as any).mockRejectedValue(
        new Error('Server start failed')
      );

      await expect(useAuthStore.getState().signInWithGoogle()).rejects.toThrow(
        'Server start failed'
      );
    });
  });

  describe('웹 환경', () => {
    beforeEach(() => {
      mockIsElectron.mockReturnValue(false);
    });

    it('redirectTo가 window.location.origin/auth/callback', async () => {
      await useAuthStore.getState().signInWithGoogle();

      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            redirectTo: `${window.location.origin}/auth/callback`,
          }),
        })
      );
    });

    it('팝업으로 OAuth URL 열기', async () => {
      const mockOpen = vi.spyOn(window, 'open').mockReturnValue({
        closed: false,
      } as Window);

      await useAuthStore.getState().signInWithGoogle();

      expect(mockOpen).toHaveBeenCalledWith(
        'https://accounts.google.com/o/oauth2/v2/auth?...',
        'google-login',
        expect.any(String)
      );

      mockOpen.mockRestore();
    });
  });
});
