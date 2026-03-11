interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  openExternal: (url: string) => Promise<void>;
  onAuthCallback: (callback: (code: string) => void) => () => void;
  scanner: {
    checkAvailability: () => Promise<{ available: boolean; reason?: string; path?: string }>;
    listDevices: () => Promise<{ name: string; driver: string }[]>;
    scan: (options?: {
      device?: string;
      dpi?: number;
      colorMode?: 'color' | 'gray' | 'bw';
      format?: 'pdf' | 'jpeg' | 'png';
      source?: 'glass' | 'feeder' | 'duplex';
    }) => Promise<{ filePath: string; mimeType: string }>;
    readScanFile: (filePath: string) => Promise<string>;
    cleanupScanFile: (filePath: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/**
 * Electron 환경인지 감지
 */
export function isElectron(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.electronAPI;
}
