import { useState, useEffect, useCallback } from 'react'
import type { ScannerAvailability } from '@/types'

interface UseScannerAvailabilityReturn {
  available: boolean
  reason?: ScannerAvailability['reason']
  isElectron: boolean
}

export function useScannerAvailability(): UseScannerAvailabilityReturn {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron
  const [available, setAvailable] = useState(false)
  const [reason, setReason] = useState<ScannerAvailability['reason']>()

  const checkAvailability = useCallback(async () => {
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

    if (!isElectron) return

    const interval = setInterval(checkAvailability, 30_000)
    return () => clearInterval(interval)
  }, [checkAvailability, isElectron])

  return { available, reason, isElectron }
}
