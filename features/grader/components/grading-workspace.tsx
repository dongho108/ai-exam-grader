"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useTabStore } from "@/store/use-tab-store";
// import { PDFViewer } from "./pdf-viewer"; // Can't import directly due to DOMMatrix error
import { SubmissionList } from "./submission-list";
import { StudentSubmission } from "@/types/grading";
import { Upload, Sparkles, FileText } from "lucide-react"; // FileText moved to import
import { Button } from "@/components/ui/button";
import { extractExamStructure, calculateGradingResult } from "@/lib/grading-service";
import { cn } from "@/lib/utils";

const PDFViewer = dynamic(() => import("./pdf-viewer").then(mod => mod.PDFViewer), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-gray-100/50 rounded-xl border border-gray-200">
       <span className="text-gray-400">Loading PDF Engine...</span>
    </div>
  )
});

interface GradingWorkspaceProps {
  tabId: string;
  answerKeyFile: File;
}

export function GradingWorkspace({ tabId, answerKeyFile }: GradingWorkspaceProps) {
  const { addSubmission, updateSubmissionGrade, submissions } = useTabStore();
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabSubmissions = submissions[tabId] || [];
  const [isDragActive, setIsDragActive] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    // Get the pre-extracted answer key structure for this tab
    const currentTab = useTabStore.getState().tabs.find(t => t.id === tabId);
    const answerKeyStructure = currentTab?.answerKeyStructure;

    if (!answerKeyStructure) {
        console.error("Answer Key structure not found for this tab");
        return;
    }

    for (const file of Array.from(files)) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) continue;
      
      const submissionId = Math.random().toString(36).substring(2, 9);
      addSubmission(tabId, file, submissionId);
      useTabStore.getState().setSubmissionStatus(tabId, submissionId, 'grading');
      
      setIsGrading(true);
      try {
        // 1. AI Extraction of student answers/name
        const examStructure = await extractExamStructure(file);
        
        // 2. Local Grading Result calculation
        const result = calculateGradingResult(submissionId, answerKeyStructure, examStructure);
        
        // 3. Update store
        updateSubmissionGrade(tabId, submissionId, result);
      } catch (error) {
        console.error('Grading failed:', error);
        useTabStore.getState().setSubmissionStatus(tabId, submissionId, 'pending');
      } finally {
        setIsGrading(false);
      }
    }
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
               <p className="font-bold text-lg">Drop files here</p>
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
                Grading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload Student Papers
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Area: PDF Viewer */}
      <div className="flex-1 min-w-0">
        <div className="h-full flex flex-col gap-2">
            <div className="flex items-center justify-between px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-700">
                    {currentSubmission ? currentSubmission.studentName : "Answer Key (Reference)"}
                </h3>
                {currentSubmission ? (
                  <p className="text-sm text-gray-500">
                    Score: {currentSubmission.score?.correct}/{currentSubmission.score?.total} ({Math.round(currentSubmission.score?.percentage || 0)}%)
                  </p>
                ) : (
                    <p className="text-sm text-gray-500">
                        This is the correct answer sheet used for grading.
                    </p>
                )}
              </div>
            </div>
            
            <PDFViewer 
                file={currentSubmission ? currentSubmission.fileRef : answerKeyFile} 
                results={currentSubmission?.results}
                className="flex-1" 
            />
        </div>
      </div>
    </div>
  );
}
