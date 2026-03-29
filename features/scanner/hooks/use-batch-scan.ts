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

    console.log('[Scanner UI] startScan: 시작, 옵션:', JSON.stringify(mergedScanOptions))

    shouldStopRef.current = false
    setIsScanning(true)
    setLastError(null)
    setPageCount(0)

    let currentPageCount = 0

    while (!shouldStopRef.current) {
      try {
        console.log('[Scanner UI] startScan: 페이지', currentPageCount + 1, '스캔 시작')
        const { filePath, mimeType } = await window.electronAPI!.scanner.scan(mergedScanOptions)
        console.log('[Scanner UI] startScan: 스캔 완료, filePath:', filePath, ', mimeType:', mimeType)

        console.log('[Scanner UI] startScan: readScanFile 호출')
        const base64 = await window.electronAPI!.scanner.readScanFile(filePath)
        console.log('[Scanner UI] startScan: readScanFile 성공, base64 길이:', base64.length)

        const ext = mimeType.split('/')[1] ?? 'jpeg'
        const file = base64ToFile(base64, `scan-${currentPageCount}.${ext}`, mimeType)

        addScannedPage({ id: uuidv4(), file })

        console.log('[Scanner UI] startScan: cleanupScanFile 호출')
        await window.electronAPI!.scanner.cleanupScanFile(filePath)

        currentPageCount += 1
        setPageCount(currentPageCount)
        console.log('[Scanner UI] startScan: 페이지', currentPageCount, '완료')
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const lowerMessage = message.toLowerCase()
        console.error('[Scanner UI] startScan: 에러 발생:', message)

        if (lowerMessage.includes('no-more-pages') || lowerMessage.includes('no more pages')) {
          console.log('[Scanner UI] startScan: ADF 종료 (no-more-pages)')
          break
        } else if (lowerMessage.includes('jam') || lowerMessage.includes('paper jam')) {
          console.warn('[Scanner UI] startScan: 용지 걸림')
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
          const occupiedKeywords = ['in use', 'busy', 'locked', 'exclusive', 'denied']
          if (occupiedKeywords.some(kw => lowerMessage.includes(kw))) {
            console.warn('[Scanner UI] startScan: 스캐너 점유 중')
            setLastError('다른 프로그램이 스캐너를 사용 중입니다. 해당 프로그램을 종료한 후 다시 시도해 주세요.')
          } else {
            console.error('[Scanner UI] startScan: 알 수 없는 에러:', message)
            setLastError(message)
          }
          break
        }
      }
    }

    console.log('[Scanner UI] startScan: 종료, 총 페이지:', currentPageCount)
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
