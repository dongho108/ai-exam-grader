"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, X, Upload, FileText, ScanLine, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useScanStore } from "@/store/use-scan-store"
import { useBatchScan } from "../hooks/use-batch-scan"
import { useScannerAvailability } from "../hooks/use-scanner-availability"
import { extractAnswerStructure } from "@/lib/grading-service"
import { base64ToFile } from "@/lib/scan-utils"
import { v4 as uuidv4 } from "uuid"

interface BatchScanModalProps {
  open: boolean
  onClose: () => void
  onScanComplete: () => void
}

type PageMode = "auto" | "fixed"
type ScanStatus = null | 'scanning' | 'reading' | 'analyzing' | 'uploading'

export function BatchScanModal({ open, onClose, onScanComplete }: BatchScanModalProps) {
  const { answerKeys, addAnswerKey, removeAnswerKey } = useScanStore()
  const { pageCount, addFiles, isDevMode } = useBatchScan()
  const { available } = useScannerAvailability()

  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null)
  const [pageMode, setPageMode] = useState<PageMode>("auto")
  const [fixedPageCount, setFixedPageCount] = useState(2)

  const [answerKeyStatus, setAnswerKeyStatus] = useState<ScanStatus>(null)
  const [examScanStatus, setExamScanStatus] = useState<ScanStatus>(null)

  const answerKeyInputRef = useRef<HTMLInputElement>(null)
  const examInputRef = useRef<HTMLInputElement>(null)

  // Auto-select when only one answer key exists
  useEffect(() => {
    if (answerKeys.length === 1 && !selectedKeyId) {
      setSelectedKeyId(answerKeys[0].id)
    }
  }, [answerKeys, selectedKeyId])

  if (!open) return null

  // ── 정답지 핸들러 ──

  async function handleAnswerKeyUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAnswerKeyStatus('uploading')
    try {
      setAnswerKeyStatus('analyzing')
      const structure = await extractAnswerStructure(file)
      const newKey = {
        id: uuidv4(),
        title: structure.title || file.name,
        file,
        structure,
        createdAt: Date.now(),
      }
      addAnswerKey(newKey)
      setSelectedKeyId(newKey.id)
    } catch (err) {
      console.error('[BatchScanModal] Failed to process answer key:', err)
    } finally {
      setAnswerKeyStatus(null)
    }
    if (answerKeyInputRef.current) answerKeyInputRef.current.value = ''
  }

  async function handleAnswerKeyScan() {
    setAnswerKeyStatus('scanning')
    try {
      const { filePath, mimeType } = await window.electronAPI!.scanner.scan()

      setAnswerKeyStatus('reading')
      const base64 = await window.electronAPI!.scanner.readScanFile(filePath)
      const file = base64ToFile(base64, `answer-key-${Date.now()}.${mimeType.split('/')[1] || 'pdf'}`, mimeType)

      setAnswerKeyStatus('analyzing')
      const structure = await extractAnswerStructure(file)
      const newKey = {
        id: uuidv4(),
        title: structure.title || '스캔된 정답지',
        file,
        structure,
        createdAt: Date.now(),
      }
      addAnswerKey(newKey)
      setSelectedKeyId(newKey.id)
      await window.electronAPI!.scanner.cleanupScanFile(filePath)
    } catch (err) {
      console.error('[BatchScanModal] Answer key scan failed:', err)
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('output file not found') || message.includes('No pages')) {
        window.alert('스캐너에 문서가 감지되지 않았습니다.')
      } else {
        window.alert('정답지 스캔에 실패했습니다.')
      }
    } finally {
      setAnswerKeyStatus(null)
    }
  }

  // ── 시험지(답안지) 핸들러 ──

  async function handleExamScan() {
    setExamScanStatus('scanning')
    try {
      const { filePath, mimeType } = await window.electronAPI!.scanner.scan()

      setExamScanStatus('reading')
      const base64 = await window.electronAPI!.scanner.readScanFile(filePath)
      const ext = mimeType.split('/')[1] ?? 'jpeg'
      const file = base64ToFile(base64, `scan-${pageCount}.${ext}`, mimeType)
      addFiles([file])
      await window.electronAPI!.scanner.cleanupScanFile(filePath)
    } catch (err) {
      console.error('[BatchScanModal] Exam scan failed:', err)
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('output file not found') || message.includes('No pages')) {
        window.alert('스캐너에 문서가 감지되지 않았습니다.')
      } else {
        window.alert('시험지 스캔에 실패했습니다.')
      }
    } finally {
      setExamScanStatus(null)
    }
  }

  function handleExamUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    addFiles(Array.from(files))
    if (examInputRef.current) examInputRef.current.value = ""
  }

  const isBusy = !!answerKeyStatus || !!examScanStatus
  const step1Done = answerKeys.length > 0 && !!selectedKeyId
  const step2Done = pageCount > 0
  const canStart = step1Done && step2Done

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">스캔 채점</h2>
            {isDevMode && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                DEV
              </span>
            )}
          </div>
          {!isBusy && (
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">

          {/* ❶ 정답지 섹션 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                {step1Done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">✓</span>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">1</span>
                )}
                정답지
              </h3>
              <div className="flex gap-1.5">
                {!isDevMode && available && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={handleAnswerKeyScan}
                    disabled={isBusy}
                  >
                    <ScanLine className="mr-1 h-3.5 w-3.5" />
                    스캔
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => answerKeyInputRef.current?.click()}
                  disabled={isBusy}
                >
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  업로드
                </Button>
                <input
                  ref={answerKeyInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleAnswerKeyUpload}
                  className="hidden"
                />
              </div>
            </div>
            {answerKeyStatus && (
              <div className="flex items-center gap-2 rounded-md bg-blue-50 px-4 py-2.5 text-sm text-blue-700 mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {answerKeyStatus === 'scanning' && '스캐너에서 스캔 중...'}
                  {answerKeyStatus === 'reading' && '스캔 파일 읽는 중...'}
                  {answerKeyStatus === 'uploading' && '파일 읽는 중...'}
                  {answerKeyStatus === 'analyzing' && '정답지 분석 중...'}
                </span>
              </div>
            )}
            {answerKeys.length === 0 && !answerKeyStatus ? (
              <p className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-500">
                스캐너에 정답지를 올려두고 스캔 버튼을 누르세요.
              </p>
            ) : (
              <div className="space-y-2">
                {answerKeys.map((key) => (
                  <label
                    key={key.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                      selectedKeyId === key.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="answerKey"
                      value={key.id}
                      checked={selectedKeyId === key.id}
                      onChange={() => setSelectedKeyId(key.id)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{key.title}</p>
                      <p className="text-xs text-gray-500">
                        {key.structure?.totalQuestions ?? 0}문항
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeAnswerKey(key.id)
                        if (selectedKeyId === key.id) setSelectedKeyId(null)
                      }}
                      className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* ❷ 학생 답안지 섹션 */}
          <section className={!step1Done ? "opacity-50 pointer-events-none" : ""}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                {step2Done ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">✓</span>
                ) : (
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${step1Done ? "bg-primary" : "bg-gray-300"}`}>2</span>
                )}
                학생 답안지
              </h3>
              <div className="flex gap-1.5">
                {!isDevMode && available && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={handleExamScan}
                    disabled={isBusy || !step1Done}
                  >
                    <ScanLine className="mr-1 h-3.5 w-3.5" />
                    스캔
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => examInputRef.current?.click()}
                  disabled={isBusy || !step1Done}
                >
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  업로드
                </Button>
                <input
                  ref={examInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  multiple
                  onChange={handleExamUpload}
                  className="hidden"
                />
              </div>
            </div>
            {examScanStatus && (
              <div className="flex items-center gap-2 rounded-md bg-blue-50 px-4 py-2.5 text-sm text-blue-700 mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {examScanStatus === 'scanning' && '스캐너에서 스캔 중...'}
                  {examScanStatus === 'reading' && '스캔 파일 읽는 중...'}
                </span>
              </div>
            )}
            {pageCount === 0 && !examScanStatus ? (
              <p className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-500">
                스캐너에 학생 답안지를 올려두고 스캔 버튼을 누르세요.
              </p>
            ) : pageCount > 0 ? (
              <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-2.5 text-sm text-green-700">
                <FileText className="h-4 w-4" />
                <span>{pageCount}장 스캔됨</span>
              </div>
            ) : null}
          </section>

          {/* 다페이지 설정 */}
          <section className={!step2Done ? "opacity-50 pointer-events-none" : ""}>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">다페이지 설정</h3>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50">
                <input
                  type="radio"
                  name="pageMode"
                  value="auto"
                  checked={pageMode === "auto"}
                  onChange={() => setPageMode("auto")}
                  className="mt-0.5 h-4 w-4 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">자동감지</p>
                  <p className="text-xs text-gray-500">
                    OCR이 학생/시험명을 자동으로 감지하여 그룹핑
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50">
                <input
                  type="radio"
                  name="pageMode"
                  value="fixed"
                  checked={pageMode === "fixed"}
                  onChange={() => setPageMode("fixed")}
                  className="mt-0.5 h-4 w-4 accent-blue-600"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">고정장수</p>
                  {pageMode === "fixed" && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-500">학생당</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={fixedPageCount}
                        onChange={(e) =>
                          setFixedPageCount(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-500">장</span>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </section>
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-4 rounded-b-xl">
          <Button variant="outline" onClick={onClose} disabled={isBusy}>
            취소
          </Button>
          <Button
            variant="cta"
            onClick={onScanComplete}
            disabled={!canStart}
          >
            채점 시작 ({pageCount}장)
          </Button>
        </div>
      </div>
    </div>
  )
}
