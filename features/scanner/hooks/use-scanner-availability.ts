import { useState, useEffect, useCallback } from 'react'
import type { ScannerAvailability, ScannerDevice } from '@/types'

interface UseScannerAvailabilityReturn {
  available: boolean
  reason?: ScannerAvailability['reason']
  isElectron: boolean
  devices: ScannerDevice[]
  isRefreshing: boolean
  refreshDevices: () => void
}

const isDev = process.env.NODE_ENV === 'development'

export function useScannerAvailability(): UseScannerAvailabilityReturn {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron
  const [available, setAvailable] = useState(isDev) // dev 모드에서는 기본 true
  const [reason, setReason] = useState<ScannerAvailability['reason']>()
  const [devices, setDevices] = useState<ScannerDevice[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchDevices = useCallback(async () => {
    if (isDev && !isElectron) {
      // Dev 모드: 가짜 디바이스
      setDevices([{ name: 'Dev Scanner', driver: 'twain' }])
      return
    }
    if (!isElectron) return

    setIsRefreshing(true)
    try {
      const list = await window.electronAPI!.scanner.listDevices()
      const mapped: ScannerDevice[] = list.map(d => ({
        name: d.name,
        driver: d.driver as ScannerDevice['driver'],
      }))
      setDevices(mapped)
      if (mapped.length === 0) {
        setAvailable(false)
        setReason('no-device-found')
      } else {
        setAvailable(true)
        setReason(undefined)
      }
    } catch {
      setDevices([])
    } finally {
      setIsRefreshing(false)
    }
  }, [isElectron])

  const checkAvailability = useCallback(async () => {
    if (isDev && !isElectron) {
      // Dev 모드 + 비-Electron: 항상 available
      setAvailable(true)
      fetchDevices()
      return
    }
    if (!isElectron) return
    try {
      const result = await window.electronAPI!.scanner.checkAvailability()
      if (result.available) {
        // NAPS2 존재 → 실제 디바이스 확인
        await fetchDevices()
      } else {
        setAvailable(false)
        setReason(result.reason as ScannerAvailability['reason'])
        setDevices([])
      }
    } catch {
      setAvailable(false)
      setDevices([])
    }
  }, [isElectron, fetchDevices])

  const refreshDevices = useCallback(() => {
    checkAvailability()
  }, [checkAvailability])

  useEffect(() => {
    checkAvailability()

    if (!isElectron && !isDev) return

    const interval = setInterval(checkAvailability, 30_000)
    return () => clearInterval(interval)
  }, [checkAvailability, isElectron])

  return { available, reason, isElectron: isElectron || isDev, devices, isRefreshing, refreshDevices }
}
