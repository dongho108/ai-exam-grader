import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  onAuthCallback: (callback: (code: string) => void) => {
    const handler = (_: unknown, code: string) => callback(code);
    ipcRenderer.on('auth-callback', handler);
    return () => {
      ipcRenderer.removeListener('auth-callback', handler);
    };
  },
  scanner: {
    checkAvailability: () => ipcRenderer.invoke('scanner:check-availability'),
    listDevices: () => ipcRenderer.invoke('scanner:list-devices'),
    scan: (options?: Record<string, unknown>) => ipcRenderer.invoke('scanner:scan', options),
    readScanFile: (filePath: string) => ipcRenderer.invoke('scanner:read-scan-file', filePath),
    cleanupScanFile: (filePath: string) => ipcRenderer.invoke('scanner:cleanup-scan-file', filePath),
  },
});
