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
  /** USB 스캐너: IPC로 가져온 파일을 스캔 결과로 추가 */
  importFromFolder: () => Promise<number>
  importFromDrive: (driveLetter: string) => Promise<number>
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

        const noMorePagesPatterns = [
          'no-more-pages', 'no more pages', 'no documents', 'feeder empty',
          'out of paper', 'feeder is empty', 'no paper', 'adf empty',
        ]
        const isNoMorePages = noMorePagesPatterns.some(p => lowerMessage.includes(p))
        // ADF 피더에서 1장 이상 스캔 후 일반 실패 → 용지 소진으로 간주
        const isFeederExhausted = mergedScanOptions.source === 'feeder'
          && currentPageCount > 0
          && lowerMessage.includes('command failed')

        if (isNoMorePages || isFeederExhausted) {
          console.log('[Scanner UI] startScan: ADF 종료', isFeederExhausted ? '(용지 소진 추정)' : '(no-more-pages)')
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

  /** USB 스캐너: IPC 결과를 스캔 페이지로 변환하는 공통 헬퍼 */
  const processImportResult = useCallback(async (
    importFn: () => Promise<{ files: Array<{ filePath: string; mimeType: string }> }>
  ): Promise<number> => {
    setLastError(null)
    try {
      const result = await importFn()
      const files = result.files ?? []
      let count = pageCount
      for (const { filePath, mimeType } of files) {
        const base64 = await window.electronAPI!.scanner.readScanFile(filePath)
        const ext = mimeType.split('/')[1] ?? 'jpeg'
        const file = base64ToFile(base64, `import-${count}.${ext}`, mimeType)
        addScannedPage({ id: uuidv4(), file })
        await window.electronAPI!.scanner.cleanupScanFile(filePath)
        count += 1
      }
      setPageCount(count)
      return files.length
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setLastError(message)
      return 0
    }
  }, [addScannedPage, pageCount])

  const importFromFolder = useCallback(async (): Promise<number> => {
    return processImportResult(() => window.electronAPI!.scanner.importFromFolder())
  }, [processImportResult])

  const importFromDrive = useCallback(async (driveLetter: string): Promise<number> => {
    return processImportResult(() => window.electronAPI!.scanner.importFromDrive(driveLetter))
  }, [processImportResult])

  return {
    isScanning,
    pageCount,
    lastError,
    startScan,
    stopScan,
    addFiles,
    importFromFolder,
    importFromDrive,
    isDevMode,
  }
}
