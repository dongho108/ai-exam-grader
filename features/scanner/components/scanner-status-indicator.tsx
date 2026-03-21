"use client"

import { useScannerAvailability } from '../hooks/use-scanner-availability'

export function ScannerStatusIndicator() {
  const { available, isElectron } = useScannerAvailability()

  if (!isElectron) return null

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium">
      <span
        className={`h-2 w-2 rounded-full ${
          available ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className={available ? 'text-green-700' : 'text-red-600'}>
        {available ? '스캐너 연결됨' : '스캐너 미연결'}
      </span>
    </div>
  )
}
