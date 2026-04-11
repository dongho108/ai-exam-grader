import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOAuth: vi.fn(),
      exchangeCodeForSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/is-electron', () => ({
  isElectron: () => false,
}));

import { useAuthStore } from '../use-auth-store';

describe('useAuthStore.initialize — 세션 검증', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: true });
  });

  it('유효한 세션이면 isAuthenticated: true로 설정한다', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    useAuthStore.getState().initialize();

    // Wait for async getUser to resolve
    await vi.waitFor(() => {
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
  });

  it('만료된 세션이면 isAuthenticated: false로 설정한다', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'JWT expired', status: 401 },
    });

    useAuthStore.getState().initialize();

    await vi.waitFor(() => {
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('getUser() 에러가 반환되면 isAuthenticated: false로 설정한다', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    useAuthStore.getState().initialize();

    await vi.waitFor(() => {
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('네트워크 에러(reject)시에도 isAuthenticated: false로 설정한다', async () => {
    mockGetUser.mockRejectedValue(new Error('Network error'));

    useAuthStore.getState().initialize();

    await vi.waitFor(() => {
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});
