/**
 * Represents a single tab (exam session) in the application.
 */
export interface ExamSession {
  id: string;
  title: string;
  createdAt: number;
  status: 'idle' | 'uploading' | 'ready' | 'grading';
  
  // Metadata for the Answer Key PDF
  answerKeyFile?: {
    name: string;
    size: number;
    // We don't store the full file content in Zustand to avoid bloat,
    // but in Stage 1 we might keep a reference or URL.
    fileRef?: File; 
  };
}

export type TabId = string;
