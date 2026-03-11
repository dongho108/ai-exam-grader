/**
 * Represents a single tab (exam session) in the application.
 */
export interface ExamSession {
  id: string;
  title: string;
  createdAt: number;
  status: 'idle' | 'uploading' | 'extracting' | 'ready' | 'grading';
  
  // Metadata for the Answer Key PDF
  answerKeyFile?: {
    name: string;
    size: number;
    // Runtime file reference (not serializable - undefined for server-loaded sessions)
    fileRef?: File;
    // Supabase Storage path (used to lazy-download the file when needed)
    storagePath?: string;
  };
}

export type TabId = string;

// Scanner types
export interface ScanOptions {
  device?: string;
  dpi?: number;
  colorMode?: 'color' | 'gray' | 'bw';
  format?: 'pdf' | 'jpeg' | 'png';
  source?: 'glass' | 'feeder' | 'duplex';
}

export interface ScanResult {
  filePath: string;
  mimeType: string;
}

export interface ScannerDevice {
  name: string;
  driver: 'twain' | 'wia';
}

export interface ScannerAvailability {
  available: boolean;
  reason?: 'windows-only' | 'naps2-not-found';
  path?: string;
}
