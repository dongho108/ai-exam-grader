import { create } from 'zustand'
import type { AnswerKeyEntry, ScanSession, ScannedPage, ClassifiedStudent, ScanSessionStatus } from '@/types'
import type { StudentExamStructure } from '@/types/grading'

interface ScanState {
  // Answer keys (persist across sessions)
  answerKeys: AnswerKeyEntry[]

  // Scan workflow
  isScanWorkflowOpen: boolean
  activeScanSession: ScanSession | null
  scannedPages: ScannedPage[]
  classifiedStudents: ClassifiedStudent[]
}

interface ScanActions {
  // Answer key management
  addAnswerKey: (entry: AnswerKeyEntry) => void
  removeAnswerKey: (id: string) => void

  // Workflow
  openWorkflow: () => void
  closeWorkflow: () => void

  // Scanning
  addScannedPage: (page: ScannedPage) => void
  updatePageOcrResult: (pageId: string, ocrResult: StudentExamStructure) => void
  setClassifiedStudents: (students: ClassifiedStudent[]) => void

  // Session
  resetSession: () => void
}

const initialSessionState: Pick<ScanState, 'isScanWorkflowOpen' | 'activeScanSession' | 'scannedPages' | 'classifiedStudents'> = {
  isScanWorkflowOpen: false,
  activeScanSession: null,
  scannedPages: [],
  classifiedStudents: [],
}

export const useScanStore = create<ScanState & ScanActions>()((set) => ({
  answerKeys: [],
  ...initialSessionState,

  addAnswerKey: (entry) =>
    set((state) => ({
      answerKeys: state.answerKeys.some((k) => k.id === entry.id)
        ? state.answerKeys.map((k) => (k.id === entry.id ? entry : k))
        : [...state.answerKeys, entry],
    })),

  removeAnswerKey: (id) =>
    set((state) => ({
      answerKeys: state.answerKeys.filter((k) => k.id !== id),
    })),

  openWorkflow: () => set({ isScanWorkflowOpen: true }),
  closeWorkflow: () => set({ isScanWorkflowOpen: false }),

  addScannedPage: (page) =>
    set((state) => ({
      scannedPages: [...state.scannedPages, page],
    })),

  updatePageOcrResult: (pageId, ocrResult) =>
    set((state) => ({
      scannedPages: state.scannedPages.map((p) =>
        p.id === pageId ? { ...p, ocrResult } : p,
      ),
    })),

  setClassifiedStudents: (students) =>
    set({ classifiedStudents: students }),

  resetSession: () => set(initialSessionState),
}))
