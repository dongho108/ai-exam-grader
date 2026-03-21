"use client"

import { useRef } from 'react'
import { Trash2, Upload, ScanLine, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScanStore } from '@/store/use-scan-store'
import { useScannerAvailability } from '../hooks/use-scanner-availability'
import { extractAnswerStructure } from '@/lib/grading-service'
import { v4 as uuidv4 } from 'uuid'

export function AnswerKeyManagement() {
  const { answerKeys, addAnswerKey, removeAnswerKey } = useScanStore()
  const { available, isElectron } = useScannerAvailability()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const structure = await extractAnswerStructure(file)

      addAnswerKey({
        id: uuidv4(),
        title: structure.title || file.name,
        file,
        structure,
        createdAt: Date.now(),
      })
    } catch (err) {
      console.error('[AnswerKeyManagement] Failed to process answer key:', err)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">정답지 관리</h3>
        <div className="flex gap-2">
          {isElectron && available && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Scanner scan will be implemented in Part 2
                console.log('[AnswerKeyManagement] Scanner scan requested')
              }}
            >
              <ScanLine className="mr-1.5 h-4 w-4" />
              스캐너로 스캔
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            파일 업로드
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {answerKeys.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          등록된 정답지가 없습니다. 파일을 업로드하여 정답지를 등록하세요.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {answerKeys.map((key) => (
            <li key={key.id} className="flex items-center justify-between py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {key.title}
                </p>
                <p className="text-xs text-gray-500">
                  {key.structure.totalQuestions}문항 &middot;{' '}
                  {new Date(key.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button
                  onClick={() => {
                    // Preview will be implemented later
                    console.log('[AnswerKeyManagement] Preview:', key.id)
                  }}
                  className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="미리보기"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeAnswerKey(key.id)}
                  className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
