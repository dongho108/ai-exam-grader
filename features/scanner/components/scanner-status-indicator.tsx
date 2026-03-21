"use client"

import { useScannerAvailability } from '../hooks/use-scanner-availability'
import { useScanStore } from '@/store/use-scan-store'

export function ScannerStatusIndicator() {
  const { available, isElectron } = useScannerAvailability()

  const isDev = process.env.NODE_ENV === 'development'
  if (!isElectron && !isDev) return null

  const handleClick = () => {
    if (available) {
      useScanStore.getState().openWorkflow()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={!available}
      className={`flex items-center gap-1.5 text-xs font-medium rounded-md px-2.5 py-1.5 transition-colors ${
        available
          ? 'hover:bg-green-50 cursor-pointer'
          : 'cursor-default'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          available ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className={available ? 'text-green-700' : 'text-red-600'}>
        {available ? '스캐너 연결됨' : '스캐너 미연결'}
      </span>
    </button>
  )
}
