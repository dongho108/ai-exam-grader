"use client"

import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, Users, FileText, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScanStore } from '@/store/use-scan-store'
import type { ClassifiedStudent } from '@/types'

interface ClassificationReviewProps {
  onCommit: (students: ClassifiedStudent[]) => void
  onBack: () => void
  onRescan: () => void
}

export function ClassificationReview({
  onCommit,
  onBack,
  onRescan,
}: ClassificationReviewProps) {
  const { classifiedStudents, answerKeys } = useScanStore()

  const [editedStudents, setEditedStudents] = useState<ClassifiedStudent[]>(
    () => classifiedStudents.map((s) => ({ ...s }))
  )

  // Build set of all section keys, expanded by default
  const buildDefaultExpanded = () => {
    const keys = new Set<string>()
    for (const student of classifiedStudents) {
      if (!student.name || !student.examTitle || !student.answerKeyId) continue
      keys.add(`exam:${student.examTitle}`)
    }
    if (classifiedStudents.some((s) => !s.name || !s.examTitle || !s.answerKeyId)) {
      keys.add('unclassified')
    }
    return keys
  }

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => buildDefaultExpanded()
  )

  // --- Grouping ---
  const classified: Map<string, ClassifiedStudent[]> = new Map()
  const unclassified: ClassifiedStudent[] = []

  for (const student of editedStudents) {
    if (!student.name || !student.examTitle || !student.answerKeyId) {
      unclassified.push(student)
      continue
    }
    const bucket = classified.get(student.examTitle) ?? []
    bucket.push(student)
    classified.set(student.examTitle, bucket)
  }

  const totalStudents = editedStudents.length
  const classifiedCount = totalStudents - unclassified.length

  // --- Accordion toggle ---
  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // --- Edit unclassified student ---
  function updateUnclassifiedStudent(
    originalIndex: number,
    patch: Partial<Pick<ClassifiedStudent, 'name' | 'answerKeyId'>>
  ) {
    setEditedStudents((prev) => {
      const next = [...prev]
      next[originalIndex] = { ...next[originalIndex], ...patch }
      return next
    })
  }

  // Find the index in editedStudents for an unclassified student
  function findEditIndex(student: ClassifiedStudent): number {
    return editedStudents.findIndex((s) => s === student)
  }

  // --- Commit guard ---
  const hasUnresolved = unclassified.some((s) => !s.answerKeyId)

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">분류 결과 확인</h2>
        <p className="mt-1 text-sm text-gray-500">
          총 <span className="font-medium text-gray-800">{totalStudents}명</span> 중{' '}
          <span className="font-medium text-green-700">{classifiedCount}명</span> 분류 완료
          {unclassified.length > 0 && (
            <>
              ,{' '}
              <span className="font-medium text-amber-600">{unclassified.length}명</span>{' '}
              미분류
            </>
          )}
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
        {/* Classified groups */}
        {Array.from(classified.entries()).map(([examTitle, students]) => {
          const examKey = `exam:${examTitle}`
          const examExpanded = expandedSections.has(examKey)

          return (
            <div key={examKey} className="rounded-lg border border-gray-200 overflow-hidden">
              {/* Exam title header */}
              <button
                onClick={() => toggleSection(examKey)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                {examExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
                )}
                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="flex-1 text-sm font-semibold text-gray-800 truncate">
                  {examTitle}
                </span>
                <span className="text-xs text-gray-500 shrink-0">{students.length}명</span>
              </button>

              {examExpanded && (
                <ul className="divide-y divide-gray-50">
                  {students.map((student, idx) => (
                    <li
                      key={`${student.name}-${idx}`}
                      className="flex items-center gap-3 px-6 py-2.5 bg-white"
                    >
                      <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-blue-700">
                          {student.name.charAt(0)}
                        </span>
                      </div>
                      <span className="flex-1 text-sm text-gray-800">
                        {student.name}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {student.pages.length}페이지
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}

        {/* Unclassified section */}
        {unclassified.length > 0 && (
          <div className="rounded-lg border border-amber-200 overflow-hidden">
            <button
              onClick={() => toggleSection('unclassified')}
              className="w-full flex items-center gap-2 px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
            >
              {expandedSections.has('unclassified') ? (
                <ChevronDown className="h-4 w-4 text-amber-600 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-amber-600 shrink-0" />
              )}
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="flex-1 text-sm font-semibold text-amber-800">
                미분류 답안지
              </span>
              <span className="text-xs text-amber-600 shrink-0">{unclassified.length}건</span>
            </button>

            {expandedSections.has('unclassified') && (
              <ul className="divide-y divide-amber-100">
                {unclassified.map((student) => {
                  const editIdx = findEditIndex(student)

                  return (
                    <li
                      key={editIdx}
                      className="px-4 py-3 bg-white space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-600">
                          {student.pages.length}페이지 &middot; 정보 입력 필요
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {/* 이름 */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-600">이름</label>
                          <input
                            type="text"
                            value={editedStudents[editIdx]?.name ?? ''}
                            onChange={(e) =>
                              updateUnclassifiedStudent(editIdx, { name: e.target.value })
                            }
                            placeholder="학생 이름"
                            className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {/* 정답지 */}
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-gray-600">
                            정답지 <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={editedStudents[editIdx]?.answerKeyId ?? ''}
                            onChange={(e) =>
                              updateUnclassifiedStudent(editIdx, { answerKeyId: e.target.value })
                            }
                            className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">정답지 선택...</option>
                            {answerKeys.map((key) => (
                              <option key={key.id} value={key.id}>
                                {key.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {/* Empty state */}
        {totalStudents === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
            <Users className="h-10 w-10" />
            <p className="text-sm">분류된 학생이 없습니다.</p>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack}>
            이전 단계로
          </Button>
          <Button variant="outline" onClick={onRescan}>
            다시 스캔
          </Button>
        </div>

        <Button
          onClick={() => onCommit(editedStudents)}
          disabled={hasUnresolved || totalStudents === 0}
        >
          <Play className="mr-1.5 h-4 w-4" />
          전체 채점 시작
        </Button>
      </div>
    </div>
  )
}
