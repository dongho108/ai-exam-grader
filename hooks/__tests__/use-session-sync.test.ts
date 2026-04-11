import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// --- Hoisted mocks ---
const { mockLoadUserSessions, mockLoadSessionSubmissions, mockStartAutoSave, mockStopAutoSave } = vi.hoisted(() => ({
  mockLoadUserSessions: vi.fn(),
  mockLoadSessionSubmissions: vi.fn(),
  mockStartAutoSave: vi.fn(),
  mockStopAutoSave: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

vi.mock('@/lib/persistence-service', () => ({
  loadUserSessions: mockLoadUserSessions,
  loadSessionSubmissions: mockLoadSessionSubmissions,
}));

vi.mock('@/lib/auto-save', () => ({
  startAutoSave: mockStartAutoSave,
  stopAutoSave: mockStopAutoSave,
}));

import { useAuthStore } from '@/store/use-auth-store';
import { useTabStore } from '@/store/use-tab-store';
import { useSessionSync } from '../use-session-sync';

// --- Helpers ---
function setAuthState(overrides: Partial<{ user: any; isAuthenticated: boolean; isLoading: boolean }>) {
  useAuthStore.setState({
    user: overrides.user ?? null,
    isAuthenticated: overrides.isAuthenticated ?? false,
    isLoading: overrides.isLoading ?? false,
  });
}

function resetStores() {
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: true });
  useTabStore.setState({ tabs: [], activeTabId: null, submissions: {}, isHydrating: false, hydrationError: null });
}

// --- Tests ---
describe('useSessionSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStores();
  });

  it('auth 로딩 중에는 hydration을 시작하지 않는다', () => {
    setAuthState({ isLoading: true });

    renderHook(() => useSessionSync());

    expect(useTabStore.getState().isHydrating).toBe(false);
    expect(mockLoadUserSessions).not.toHaveBeenCalled();
  });

  it('미인증 상태에서는 hydration을 시작하지 않는다', () => {
    setAuthState({ isLoading: false, isAuthenticated: false });

    renderHook(() => useSessionSync());

    expect(useTabStore.getState().isHydrating).toBe(false);
    expect(mockLoadUserSessions).not.toHaveBeenCalled();
  });

  it('인증 완료 시 isHydrating을 true로 설정하고 서버 로딩을 시작한다', async () => {
    mockLoadUserSessions.mockResolvedValue([]);
    setAuthState({ isLoading: false, isAuthenticated: true, user: { id: 'user-1' } });

    renderHook(() => useSessionSync());

    // isHydrating should be set to true immediately
    expect(useTabStore.getState().isHydrating).toBe(true);

    await waitFor(() => {
      expect(useTabStore.getState().isHydrating).toBe(false);
    });
  });

  it('서버에서 세션을 정상적으로 불러오면 탭이 hydrate된다', async () => {
    mockLoadUserSessions.mockResolvedValue([
      {
        id: 'session-1',
        user_id: 'user-1',
        title: '수학 시험',
        status: 'ready',
        created_at: 1000,
        answer_key_file_name: 'math.pdf',
        answer_key_file_size: 1234,
        answer_key_storage_path: 'user-1/session-1/answer-key.pdf',
        answer_key_structure: { title: '수학 시험', answers: {}, totalQuestions: 5 },
        updated_at: '2024-01-01',
      },
    ]);
    mockLoadSessionSubmissions.mockResolvedValue([]);
    setAuthState({ isLoading: false, isAuthenticated: true, user: { id: 'user-1' } });

    renderHook(() => useSessionSync());

    await waitFor(() => {
      expect(useTabStore.getState().isHydrating).toBe(false);
    });

    const state = useTabStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].title).toBe('수학 시험');
    expect(state.hydrationError).toBeNull();
    expect(mockStartAutoSave).toHaveBeenCalledWith('user-1');
  });

  it('인증 에러(401) 발생 시 hydrationError를 "auth"로 설정한다', async () => {
    const authError = Object.assign(new Error('JWT expired'), { status: 401 });
    mockLoadUserSessions.mockRejectedValue(authError);
    setAuthState({ isLoading: false, isAuthenticated: true, user: { id: 'user-1' } });

    renderHook(() => useSessionSync());

    await waitFor(() => {
      expect(useTabStore.getState().isHydrating).toBe(false);
    });

    expect(useTabStore.getState().hydrationError).toBe('auth');
    expect(mockStartAutoSave).not.toHaveBeenCalled();
  });

  it('인증 에러(PGRST301) 발생 시 hydrationError를 "auth"로 설정한다', async () => {
    const authError = Object.assign(new Error('JWT claim check failed'), { code: 'PGRST301' });
    mockLoadUserSessions.mockRejectedValue(authError);
    setAuthState({ isLoading: false, isAuthenticated: true, user: { id: 'user-1' } });

    renderHook(() => useSessionSync());

    await waitFor(() => {
      expect(useTabStore.getState().hydrationError).toBe('auth');
    });
  });

  it('네트워크 에러 발생 시 hydrationError를 "network"로 설정한다', async () => {
    mockLoadUserSessions.mockRejectedValue(new Error('Failed to fetch'));
    setAuthState({ isLoading: false, isAuthenticated: true, user: { id: 'user-1' } });

    renderHook(() => useSessionSync());

    await waitFor(() => {
      expect(useTabStore.getState().isHydrating).toBe(false);
    });

    expect(useTabStore.getState().hydrationError).toBe('network');
    // Network error still starts auto-save
    expect(mockStartAutoSave).toHaveBeenCalledWith('user-1');
  });

  it('에러 후 재인증하면 hydration을 재시도한다', async () => {
    // First attempt: auth error
    const authError = Object.assign(new Error('expired'), { status: 401 });
    mockLoadUserSessions.mockRejectedValueOnce(authError);
    setAuthState({ isLoading: false, isAuthenticated: true, user: { id: 'user-1' } });

    const { rerender } = renderHook(() => useSessionSync());

    await waitFor(() => {
      expect(useTabStore.getState().hydrationError).toBe('auth');
    });

    // Simulate re-authentication: user logs out then back in
    mockLoadUserSessions.mockResolvedValue([]);
    setAuthState({ isLoading: false, isAuthenticated: false, user: null });
    rerender();

    setAuthState({ isLoading: false, isAuthenticated: true, user: { id: 'user-1' } });
    rerender();

    await waitFor(() => {
      expect(useTabStore.getState().isHydrating).toBe(false);
      expect(useTabStore.getState().hydrationError).toBeNull();
    });
  });
});
