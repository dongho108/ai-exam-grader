"use client";

import { useState, useRef } from "react";
import { useTabStore } from "@/store/use-tab-store";
import { PDFViewer } from "./pdf-viewer";
import { SubmissionList } from "./submission-list";
import { StudentSubmission } from "@/types/grading";
import { Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gradeSubmission } from "@/lib/grading-service";

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
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
        const newSubmissions = submissions[tabId] || [];
        const latestSubmission = newSubmissions[newSubmissions.length - 1];
        
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

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* Left Sidebar: Submission List */}
      <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden shrink-0">
        <SubmissionList
          tabId={tabId}
          onSelectSubmission={setSelectedSubmission}
          selectedSubmissionId={selectedSubmission?.id}
        />
        
        <div className="p-4 border-t border-gray-200 bg-gray-50">
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
            className="w-full gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGrading}
          >
            {isGrading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                Grading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Student Papers
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Area: PDF Viewer */}
      <div className="flex-1 min-w-0">
        {selectedSubmission ? (
          <div className="h-full flex flex-col gap-2">
            <div className="flex items-center justify-between px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-700">{selectedSubmission.studentName}</h3>
                {selectedSubmission.score && (
                  <p className="text-sm text-gray-500">
                    Score: {selectedSubmission.score.correct}/{selectedSubmission.score.total} ({Math.round(selectedSubmission.score.percentage)}%)
                  </p>
                )}
              </div>
            </div>
            <PDFViewer file={selectedSubmission.fileRef} className="flex-1" />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-white rounded-xl border-2 border-dashed border-gray-200">
            <div className="text-center text-gray-400">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a submission to view</p>
              <p className="text-sm mt-1">or upload student papers to begin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Placeholder icon
function FileText({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
