"use client"

import { useState, useCallback } from 'react'
import { X, ChevronLeft } from 'lucide-react'
import { useScanStore } from '@/store/use-scan-store'
import { BatchScanModal } from './batch-scan-modal'
import { ClassificationProgress } from './classification-progress'
import { ClassificationReview } from './classification-review'
import type { ClassifiedStudent } from '@/types'

type WorkflowStep = 'scan-config' | 'classifying' | 'reviewing'

const STEPS: WorkflowStep[] = ['scan-config', 'classifying', 'reviewing']

const STEP_LABELS: Record<WorkflowStep, string> = {
  'scan-config': '스캔 채점',
  'classifying': '답안지 분류',
  'reviewing': '분류 결과 확인',
}

interface ScanWorkflowShellProps {
  onGradeStart?: (students: ClassifiedStudent[]) => number | void
}

export function ScanWorkflowShell({ onGradeStart }: ScanWorkflowShellProps) {
  const { closeWorkflow, resetSession } = useScanStore()
  const [step, setStep] = useState<WorkflowStep>('scan-config')

  const canClose = step === 'scan-config' || step === 'reviewing'
  const canGoBack = step !== 'scan-config' && canClose

  const handleClose = useCallback(() => {
    if (!canClose) return
    setStep('scan-config')
    closeWorkflow()
  }, [canClose, closeWorkflow])

  const handleScanComplete = useCallback(() => {
    setStep('classifying')
  }, [])

  const handleClassificationComplete = useCallback(() => {
    setStep('reviewing')
  }, [])

  const handleRescan = useCallback(() => {
    resetSession()
    // resetSession sets isScanWorkflowOpen=false, so re-open it
    useScanStore.getState().openWorkflow()
    setStep('scan-config')
  }, [resetSession])

  const handleCommit = useCallback(
    (students: ClassifiedStudent[]) => {
      const tabCount = onGradeStart?.(students) ?? 0
      if (tabCount > 0) {
        handleClose()
      } else {
        window.alert('탭을 생성할 수 없습니다. 학생 데이터(시험명, 정답지 매칭 등)를 확인해 주세요.')
      }
    },
    [onGradeStart, handleClose],
  )

  const currentStepIndex = STEPS.indexOf(step)

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top bar — only shown for classifying/reviewing steps */}
      {step !== 'scan-config' && (
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            {canGoBack && (
              <button
                onClick={() => setStep('scan-config')}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="이전으로"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-lg font-bold text-gray-900">{STEP_LABELS[step]}</h1>

            {/* Step indicator dots */}
            <div className="ml-3 flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`rounded-full transition-all duration-200 ${
                    i === currentStepIndex
                      ? 'h-2.5 w-2.5 bg-blue-500'
                      : i < currentStepIndex
                        ? 'h-2 w-2 bg-blue-300'
                        : 'h-2 w-2 bg-gray-300'
                  }`}
                  title={STEP_LABELS[s]}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={!canClose}
            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step === 'scan-config' && (
          <div className="flex items-center justify-center h-full p-6">
            <BatchScanModal
              open={true}
              onClose={handleClose}
              onScanComplete={handleScanComplete}
            />
          </div>
        )}

        {step === 'classifying' && (
          <div className="mx-auto max-w-2xl">
            <ClassificationProgress mode="auto" onComplete={handleClassificationComplete} />
          </div>
        )}

        {step === 'reviewing' && (
          <div className="mx-auto h-full max-w-4xl p-6">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <ClassificationReview
                onCommit={handleCommit}
                onBack={() => setStep('classifying')}
                onRescan={handleRescan}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
