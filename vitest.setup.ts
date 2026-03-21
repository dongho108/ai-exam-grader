import '@testing-library/jest-dom'

// Mock window.electronAPI for tests
Object.defineProperty(window, 'electronAPI', {
  value: {
    isElectron: false,
    platform: 'darwin',
    openExternal: async () => {},
    onAuthCallback: () => () => {},
    scanner: {
      checkAvailability: async () => ({ available: false, reason: 'windows-only' as const }),
      listDevices: async () => [],
      scan: async () => ({ filePath: '', mimeType: '' }),
      readScanFile: async () => '',
      cleanupScanFile: async () => {},
    },
  },
  writable: true,
  configurable: true,
})
