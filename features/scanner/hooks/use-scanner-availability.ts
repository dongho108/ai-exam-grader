import { useState, useEffect, useCallback } from 'react'
import type { ScannerAvailability } from '@/types'

interface UseScannerAvailabilityReturn {
  available: boolean
  reason?: ScannerAvailability['reason']
  isElectron: boolean
}

const isDev = process.env.NODE_ENV === 'development'

export function useScannerAvailability(): UseScannerAvailabilityReturn {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron
  const [available, setAvailable] = useState(isDev) // dev 모드에서는 기본 true
  const [reason, setReason] = useState<ScannerAvailability['reason']>()

  const checkAvailability = useCallback(async () => {
    if (isDev && !isElectron) {
      // Dev 모드 + 비-Electron: 항상 available
      setAvailable(true)
      return
    }
    if (!isElectron) return
    try {
      const result = await window.electronAPI!.scanner.checkAvailability()
      setAvailable(result.available)
      setReason(result.reason as ScannerAvailability['reason'])
    } catch {
      setAvailable(false)
    }
  }, [isElectron])

  useEffect(() => {
    checkAvailability()

    if (!isElectron && !isDev) return

    const interval = setInterval(checkAvailability, 30_000)
    return () => clearInterval(interval)
  }, [checkAvailability, isElectron])

  return { available, reason, isElectron: isElectron || isDev }
}
