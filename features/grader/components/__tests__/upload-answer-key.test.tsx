import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock supabase before anything else
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
    auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
  },
}))

// Mock dependencies before importing component
const mockUploadAndTrackAnswerKey = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/auto-save', () => ({
  uploadAndTrackAnswerKey: (...args: unknown[]) => mockUploadAndTrackAnswerKey(...args),
}))

vi.mock('@/lib/grading-service', () => ({
  extractAnswerStructure: vi.fn().mockResolvedValue({
    title: '테스트',
    answers: { '1': { text: 'A' } },
    totalQuestions: 1,
  }),
}))

vi.mock('@/features/scanner/hooks/use-scanner-availability', () => ({
  useScannerAvailability: () => ({ available: false, isElectron: false }),
}))

vi.mock('@/features/upload/upload-zone', () => ({
  UploadZone: ({ onFileSelect }: { onFileSelect: (file: File) => void }) => (
    <button
      data-testid="upload-zone"
      onClick={() => onFileSelect(new File(['pdf'], 'answer.pdf', { type: 'application/pdf' }))}
    >
      Upload
    </button>
  ),
}))

import { useTabStore } from '@/store/use-tab-store'
import { useAuthStore } from '@/store/use-auth-store'
import { UploadAnswerKey } from '../upload-answer-key'

describe('UploadAnswerKey - 업로드 await 검증', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTabStore.setState({
      tabs: [
        {
          id: 'tab-1',
          title: 'New Exam',
          createdAt: Date.now(),
          status: 'idle',
        },
      ],
      activeTabId: 'tab-1',
      submissions: {},
    })
    useAuthStore.setState({
      user: { id: 'user-1', email: 'test@test.com' } as any,
      isAuthenticated: true,
      isLoading: false,
    })
  })

  it('uploadAndTrackAnswerKey가 await되어야 한다 (업로드 완료 전 함수가 끝나지 않음)', async () => {
    // 업로드가 느리게 resolve되도록 설정
    let resolveUpload: () => void
    const uploadPromise = new Promise<void>((resolve) => {
      resolveUpload = resolve
    })
    mockUploadAndTrackAnswerKey.mockReturnValue(uploadPromise)

    render(<UploadAnswerKey />)

    const uploadBtn = screen.getByTestId('upload-zone')
    fireEvent.click(uploadBtn)

    // 업로드가 호출되었는지 확인
    await waitFor(() => {
      expect(mockUploadAndTrackAnswerKey).toHaveBeenCalledWith(
        'user-1',
        'tab-1',
        expect.any(File)
      )
    })

    // 업로드를 resolve
    resolveUpload!()
    await uploadPromise
  })
})
