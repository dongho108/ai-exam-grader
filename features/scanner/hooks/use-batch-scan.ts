"use client"

import { useState, useCallback, useRef } from 'react'
import { useScanStore } from '@/store/use-scan-store'
import { base64ToFile } from '@/lib/scan-utils'
import { v4 as uuidv4 } from 'uuid'
import type { ScanOptions } from '@/types'

type JamAction = 'continue' | 'stop'
type JamCallback = () => Promise<JamAction>

interface UseBatchScanOptions {
  scanOptions?: ScanOptions
  onJam?: JamCallback
}

interface UseBatchScanReturn {
  isScanning: boolean
  pageCount: number
  lastError: string | null
  startScan: (options?: UseBatchScanOptions) => Promise<void>
  stopScan: () => void
  /** Dev 모드 전용: 파일을 직접 추가 (스캔 대체) */
  addFiles: (files: File[]) => void
  isDevMode: boolean
}

const isDevMode =
  process.env.NODE_ENV === 'development' &&
  (typeof window === 'undefined' || !window.electronAPI?.isElectron)

export function useBatchScan(): UseBatchScanReturn {
  const [isScanning, setIsScanning] = useState(false)
  const [pageCount, setPageCount] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const shouldStopRef = useRef(false)
  const { addScannedPage } = useScanStore()

  /** Dev 모드 전용: 파일 업로드로 스캔 대체 */
  const addFiles = useCallback(
    (files: File[]) => {
      setLastError(null)
      let count = pageCount
      for (const file of files) {
        addScannedPage({ id: uuidv4(), file })
        count += 1
      }
      setPageCount(count)
    },
    [addScannedPage, pageCount],
  )

  const startScan = useCallback(async (options?: UseBatchScanOptions) => {
    const { scanOptions, onJam } = options ?? {}

    const mergedScanOptions: ScanOptions = {
      format: 'jpeg',
      source: 'feeder',
      ...scanOptions,
    }

    shouldStopRef.current = false
    setIsScanning(true)
    setLastError(null)
    setPageCount(0)

    let currentPageCount = 0

    while (!shouldStopRef.current) {
      try {
        const { filePath, mimeType } = await window.electronAPI!.scanner.scan(mergedScanOptions)

        const base64 = await window.electronAPI!.scanner.readScanFile(filePath)

        const ext = mimeType.split('/')[1] ?? 'jpeg'
        const file = base64ToFile(base64, `scan-${currentPageCount}.${ext}`, mimeType)

        addScannedPage({ id: uuidv4(), file })

        await window.electronAPI!.scanner.cleanupScanFile(filePath)

        currentPageCount += 1
        setPageCount(currentPageCount)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const lowerMessage = message.toLowerCase()

        if (lowerMessage.includes('no-more-pages') || lowerMessage.includes('no more pages')) {
          // Normal ADF termination
          break
        } else if (lowerMessage.includes('jam') || lowerMessage.includes('paper jam')) {
          setLastError(message)
          if (onJam) {
            const action = await onJam()
            if (action === 'continue') {
              continue
            } else {
              break
            }
          } else {
            break
          }
        } else {
          setLastError(message)
          break
        }
      }
    }

    setIsScanning(false)
  }, [addScannedPage])

  const stopScan = useCallback(() => {
    shouldStopRef.current = true
  }, [])

  return {
    isScanning,
    pageCount,
    lastError,
    startScan,
    stopScan,
    addFiles,
    isDevMode,
  }
}
