"use client"

import { useEffect } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useClassificationEngine } from '../hooks/use-classification-engine'

interface ClassificationProgressProps {
  mode: 'auto' | 'fixed'
  fixedPageCount?: number
  onComplete: () => void
}

export function ClassificationProgress({
  mode,
  fixedPageCount,
  onComplete,
}: ClassificationProgressProps) {
  const {
    isClassifying,
    progress,
    currentPage,
    totalPages,
    classificationSummary,
    startClassification,
  } = useClassificationEngine()

  useEffect(() => {
    startClassification({ mode, fixedPageCount })
  }, [])

  const isDone = !isClassifying && classificationSummary !== null

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        {isDone ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        )}
        <h2 className="text-lg font-semibold text-gray-900">
          {isDone ? '분류 완료' : '답안지 분류 중...'}
        </h2>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">
          {isDone
            ? `${totalPages}페이지 처리 완료`
            : `${currentPage} / ${totalPages} 페이지 처리 중`}
        </p>
      </div>

      {/* Current page indicator (only while classifying) */}
      {isClassifying && currentPage > 0 && (
        <div className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {currentPage}페이지 OCR 분석 중...
        </div>
      )}

      {/* Classification summary table */}
      {isDone && classificationSummary && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-gray-700">분류 요약</h3>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    시험 제목
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-gray-600">
                    학생 수
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(classificationSummary.byExamTitle).map(
                  ([title, count]) => (
                    <tr key={title} className="bg-white">
                      <td className="px-4 py-2 text-gray-900">{title}</td>
                      <td className="px-4 py-2 text-right text-gray-900">
                        {count}명
                      </td>
                    </tr>
                  )
                )}
                {classificationSummary.unclassifiedCount > 0 && (
                  <tr className="bg-white">
                    <td className="px-4 py-2 text-amber-600">미분류</td>
                    <td className="px-4 py-2 text-right text-amber-600">
                      {classificationSummary.unclassifiedCount}명
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-2 font-medium text-gray-700">합계</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-700">
                    {classificationSummary.totalStudents}명
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Complete button */}
      {isDone && (
        <div className="flex justify-end">
          <Button onClick={onComplete}>다음 단계로</Button>
        </div>
      )}
    </div>
  )
}
