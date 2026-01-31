"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useTabStore } from "@/store/use-tab-store";
// import { PDFViewer } from "./pdf-viewer"; // Can't import directly due to DOMMatrix error
import { SubmissionList } from "./submission-list";
import { StudentSubmission } from "@/types/grading";
import { Upload, Sparkles, FileText } from "lucide-react"; // FileText moved to import
import { Button } from "@/components/ui/button";
import { gradeSubmission } from "@/lib/grading-service";

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

    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') continue;
      
      // Add to store
      addSubmission(tabId, file);
      
      // Auto-grade
      setIsGrading(true);
      try {
        const result = await gradeSubmission(answerKeyFile, file);
        
        // Find the submission we just added (last one)
        // Note: In a real app, we'd use the ID returned by addSubmission
        const currentSubmissions = useTabStore.getState().submissions[tabId] || [];
        const latestSubmission = currentSubmissions.find(s => s.fileName === file.name && s.status === 'pending');
        
        if (latestSubmission) {
          updateSubmissionGrade(tabId, latestSubmission.id, {
            ...result,
            submissionId: latestSubmission.id,
          });
        }
      } catch (error) {
        console.error('Grading failed:', error);
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
            selectedSubmissionId={selectedSubmission?.id}
          />
          
          {/* Drag Overlay */}
          {isDragActive && (
            <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center text-primary animate-in fade-in duration-200">
               <Upload className="w-12 h-12 mb-2 animate-bounce" />
               <p className="font-bold text-lg">Drop PDFs here</p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
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
                    {selectedSubmission ? selectedSubmission.studentName : "Answer Key (Reference)"}
                </h3>
                {selectedSubmission ? (
                  <p className="text-sm text-gray-500">
                    Score: {selectedSubmission.score?.correct}/{selectedSubmission.score?.total} ({Math.round(selectedSubmission.score?.percentage || 0)}%)
                  </p>
                ) : (
                    <p className="text-sm text-gray-500">
                        This is the correct answer sheet used for grading.
                    </p>
                )}
              </div>
            </div>
            
            <PDFViewer 
                file={selectedSubmission ? selectedSubmission.fileRef : answerKeyFile} 
                results={selectedSubmission?.results}
                className="flex-1" 
            />
        </div>
      </div>
    </div>
  );
}
