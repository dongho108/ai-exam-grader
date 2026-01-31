import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ExamSession } from '@/types';
import { StudentSubmission, GradingResult } from '@/types/grading';

interface TabState {
  tabs: ExamSession[];
  activeTabId: string | null;
  submissions: Record<string, StudentSubmission[]>; // tabId -> submissions

  // Tab Actions
  addTab: () => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabTitle: (id: string, title: string) => void;
  setAnswerKeyFile: (id: string, file: File) => void;
  
  // Submission Actions
  addSubmission: (tabId: string, file: File, id?: string) => void;
  updateSubmissionGrade: (tabId: string, submissionId: string, result: GradingResult) => void;
  setSubmissionStatus: (tabId: string, submissionId: string, status: StudentSubmission['status']) => void;
  removeSubmission: (tabId: string, submissionId: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  submissions: {},

  addTab: () => {
    const newTab: ExamSession = {
      id: generateId(),
      title: 'New Exam',
      createdAt: Date.now(),
      status: 'idle',
    };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
  },

  removeTab: (id) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== id);
      
      // If we removed the active tab, switch to the last one or null
      let newActiveId = state.activeTabId;
      if (id === state.activeTabId) {
        newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveId,
      };
    });
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  updateTabTitle: (id, title) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
    })),

  setAnswerKeyFile: (id, file) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'ready',
              title: file.name.replace('.pdf', ''), // Auto-set title from filename
              answerKeyFile: {
                name: file.name,
                size: file.size,
                fileRef: file,
              },
            }
          : t
      ),
    })),

  addSubmission: (tabId, file, id) => {
    const newSubmission: StudentSubmission = {
      id: id || generateId(),
      studentName: file.name.replace('.pdf', '').replace(/_/g, ' '),
      fileName: file.name,
      fileRef: file,
      status: 'pending',
      uploadedAt: Date.now(),
    };

    set((state) => ({
      submissions: {
        ...state.submissions,
        [tabId]: [...(state.submissions[tabId] || []), newSubmission],
      },
    }));
  },

  updateSubmissionGrade: (tabId, submissionId, result) => {
    set((state) => ({
      submissions: {
        ...state.submissions,
        [tabId]: (state.submissions[tabId] || []).map((sub) =>
          sub.id === submissionId
            ? {
                ...sub,
                status: 'graded',
                studentName: result.studentName || sub.studentName,
                score: result.score,
                results: result.results,
              }
            : sub
        ),
      },
    }));
  },

  setSubmissionStatus: (tabId, submissionId, status) => {
    set((state) => ({
      submissions: {
        ...state.submissions,
        [tabId]: (state.submissions[tabId] || []).map((sub) =>
          sub.id === submissionId ? { ...sub, status } : sub
        ),
      },
    }));
  },

  removeSubmission: (tabId, submissionId) => {
    set((state) => ({
      submissions: {
        ...state.submissions,
        [tabId]: (state.submissions[tabId] || []).filter((sub) => sub.id !== submissionId),
      },
    }));
  },
}));
