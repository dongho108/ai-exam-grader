/**
 * Student submission data structure
 */
export interface StudentSubmission {
  id: string;
  studentName: string;
  fileName: string;
  fileRef: File;
  status: 'pending' | 'grading' | 'graded';
  score?: {
    correct: number;
    total: number;
    percentage: number;
  };
  results?: QuestionResult[];
  uploadedAt: number;
}

export interface QuestionResult {
  questionNumber: number;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  position?: { x: number; y: number }; // Position on PDF for overlay
}

export interface GradingResult {
  submissionId: string;
  studentName?: string;
  score: {
    correct: number;
    total: number;
    percentage: number;
  };
  results: QuestionResult[];
}
