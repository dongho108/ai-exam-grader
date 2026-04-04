"use client"

import { Loader2, Square } from 'lucide-react'

interface ScanProgressBarProps {
  pageCount: number
  isScanning: boolean
  onStop: () => void
  lastError?: string | null
}

export function ScanProgressBar({ pageCount, isScanning, onStop, lastError }: ScanProgressBarProps) {
  if (!isScanning && pageCount === 0 && !lastError) return null

  return (
    <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
      {isScanning ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
          <span className="text-sm text-gray-700 flex-1">
            스캔 중: {pageCount}장 완료
          </span>
          <button
            onClick={onStop}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            <Square className="h-3 w-3" />
            중단
          </button>
        </div>
      ) : lastError ? (
        <p className="text-xs text-red-600 truncate">{lastError}</p>
      ) : pageCount > 0 ? (
        <p className="text-xs text-green-600">{pageCount}장 스캔 완료</p>
      ) : null}
    </div>
  )
}
