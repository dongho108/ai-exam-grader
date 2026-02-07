"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useTabStore } from "@/store/use-tab-store";
// import { PDFViewer } from "./pdf-viewer"; // Can't import directly due to DOMMatrix error
import { SubmissionList } from "./submission-list";
import { GradingResultPanel } from "./grading-result-panel";
import { StudentSubmission } from "@/types/grading";
import { Upload, Sparkles, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractExamStructure, calculateGradingResult, recalculateAfterEdit, toggleCorrectStatus } from "@/lib/grading-service";
import { cn } from "@/lib/utils";

const PDFViewer = dynamic(() => import("./pdf-viewer").then(mod => mod.PDFViewer), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-100/50 rounded-xl border border-gray-200">
       <span className="text-gray-400">PDF 엔진 로딩 중...</span>
    </div>
  )
});

interface GradingWorkspaceProps {
  tabId: string;
  answerKeyFile: File;
}

export function GradingWorkspace({ tabId, answerKeyFile }: GradingWorkspaceProps) {
  const { addSubmission, updateSubmissionGrade, submissions, setSubmissionStatus } = useTabStore();
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [viewMode, setViewMode] = useState<'pdf' | 'result'>('result');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queue system for sequential processing
  const processingRef = useRef<{
    queue: string[];
    isProcessing: boolean;
  }>({ queue: [], isProcessing: false });

  const tabSubmissions = submissions[tabId] || [];
  const [isDragActive, setIsDragActive] = useState(false);

  // Process next item in the queue
  const processNext = async () => {
    if (processingRef.current.isProcessing) return;
    if (processingRef.current.queue.length === 0) {
      setIsGrading(false);
      return;
    }

    // Get the pre-extracted answer key structure for this tab
    const currentTab = useTabStore.getState().tabs.find(t => t.id === tabId);
    const answerKeyStructure = currentTab?.answerKeyStructure;

    if (!answerKeyStructure) {
      console.error("Answer Key structure not found for this tab");
      return;
    }

    processingRef.current.isProcessing = true;
    setIsGrading(true);

    const submissionId = processingRef.current.queue.shift()!;
    setSubmissionStatus(tabId, submissionId, 'grading');

    try {
      // Get file reference from store
      const submission = useTabStore.getState().submissions[tabId]?.find(s => s.id === submissionId);
      if (!submission) throw new Error('Submission not found');

      // 1. AI Extraction of student answers/name
      const examStructure = await extractExamStructure(submission.fileRef);

      // 2. Local Grading Result calculation
      const result = await calculateGradingResult(submissionId, answerKeyStructure, examStructure);

      // 3. Update store
      updateSubmissionGrade(tabId, submissionId, result);
    } catch (error) {
      console.error('Grading failed:', error);
      setSubmissionStatus(tabId, submissionId, 'pending');
    } finally {
      processingRef.current.isProcessing = false;
      // Process next in queue
      processNext();
    }
  };

  const handleAnswerEdit = (questionNumber: number, newAnswer: string) => {
    if (!currentSubmission?.results) return;
    const updatedResult = recalculateAfterEdit(
      currentSubmission.id,
      currentSubmission.results,
      questionNumber,
      newAnswer,
      currentSubmission.studentName
    );
    updateSubmissionGrade(tabId, currentSubmission.id, updatedResult);
  };

  const handleCorrectToggle = (questionNumber: number, newIsCorrect: boolean) => {
    if (!currentSubmission?.results) return;
    const updatedResult = toggleCorrectStatus(
      currentSubmission.id,
      currentSubmission.results,
      questionNumber,
      newIsCorrect,
      currentSubmission.studentName
    );
    updateSubmissionGrade(tabId, currentSubmission.id, updatedResult);
  };


  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const submissionIds: string[] = [];

    // 1. Add all files to store immediately with 'queued' status
    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) continue;

      const submissionId = Math.random().toString(36).substring(2, 9);
      addSubmission(tabId, file, submissionId);
      setSubmissionStatus(tabId, submissionId, 'queued');
      submissionIds.push(submissionId);
    }

    // 2. Add to processing queue
    processingRef.current.queue.push(...submissionIds);

    // 3. Start processing (if not already processing)
    processNext();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Always get the fresh submission data from the store to avoid stale state in the viewer
  const currentSubmission = selectedSubmission 
    ? tabSubmissions.find(s => s.id === selectedSubmission.id) || selectedSubmission
    : null;

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* Left Sidebar: Submission List */}
      <div 
        className={cn(
          "relative w-80 bg-white rounded-xl shadow-sm border-2 transition-all duration-300 overflow-hidden shrink-0 flex flex-col h-full",
          isDragActive ? "border-primary bg-primary/5 scale-[1.01] shadow-xl" : "border-gray-200"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex-1 overflow-hidden relative">
          <SubmissionList
            tabId={tabId}
            onSelectSubmission={setSelectedSubmission}
            selectedSubmissionId={currentSubmission?.id}
          />
          
          {/* Drag Overlay */}
          {isDragActive && (
            <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center text-primary animate-in fade-in duration-200">
               <Upload className="w-12 h-12 mb-2 animate-bounce" />
               <p className="font-bold text-lg">여기에 파일을 놓으세요</p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf, image/jpeg, image/png"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="cta"
            className="w-full gap-2 py-6 text-base font-bold shadow-lg shadow-primary/20"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGrading}
          >
            {isGrading ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                채점 중...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                학생 답안 업로드
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Area: PDF Viewer or Grading Results */}
      <div className="flex-1 min-w-0">
        <div className="h-full flex flex-col gap-2">
            {/* Header with Tab Buttons */}
            <div className="flex items-center justify-between px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-700">
                    {currentSubmission ? currentSubmission.studentName : "정답지 (참조)"}
                </h3>
                {currentSubmission ? (
                  <p className="text-sm text-gray-500">
                    점수: {currentSubmission.score?.correct}/{currentSubmission.score?.total} ({Math.round(currentSubmission.score?.percentage || 0)}%)
                  </p>
                ) : (
                    <p className="text-sm text-gray-500">
                        채점에 사용되는 정답지입니다.
                    </p>
                )}
              </div>

              {/* Tab Buttons - 학생 선택 시에만 표시 */}
              {currentSubmission && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('pdf')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      viewMode === 'pdf'
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    PDF 보기
                  </button>
                  <button
                    onClick={() => setViewMode('result')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      viewMode === 'result'
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    <ClipboardList className="w-4 h-4" />
                    채점 결과
                  </button>
                </div>
              )}
            </div>

            {/* Content Area - 탭에 따라 전환 */}
            {currentSubmission && viewMode === 'result' ? (
              <div className="flex-1 rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white">
                <GradingResultPanel 
                  submission={currentSubmission} 
                  onAnswerEdit={handleAnswerEdit}
                  onCorrectToggle={handleCorrectToggle}
                />
              </div>
            ) : (
              <PDFViewer
                  file={currentSubmission ? currentSubmission.fileRef : answerKeyFile}
                  className="flex-1"
              />
            )}
        </div>
      </div>
    </div>
  );
}
