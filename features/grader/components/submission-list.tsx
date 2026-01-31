"use client";

import { useTabStore } from "@/store/use-tab-store";
import { StudentSubmission } from "@/types/grading";
import { FileText, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SubmissionListProps {
  tabId: string;
  onSelectSubmission?: (submission: StudentSubmission) => void;
  selectedSubmissionId?: string;
}

export function SubmissionList({ tabId, onSelectSubmission, selectedSubmissionId }: SubmissionListProps) {
  const { submissions, removeSubmission } = useTabStore();
  const tabSubmissions = submissions[tabId] || [];

  const getStatusIcon = (status: StudentSubmission['status']) => {
    switch (status) {
      case 'graded':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'grading':
        return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (tabSubmissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-400">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No student submissions yet</p>
        <p className="text-xs mt-1">Upload student test papers to begin grading</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-gray-700">Student Submissions</h3>
        <p className="text-xs text-gray-400 mt-1">{tabSubmissions.length} paper(s)</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tabSubmissions.map((submission) => (
          <div
            key={submission.id}
            onClick={() => onSelectSubmission?.(submission)}
            className={cn(
              "group relative p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50",
              selectedSubmissionId === submission.id && "bg-primary/5 border-l-4 border-l-primary"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(submission.status)}
                  <h4 className="font-medium text-sm text-gray-700 truncate">
                    {submission.studentName}
                  </h4>
                </div>
                
                <p className="text-xs text-gray-400 truncate mb-2">{submission.fileName}</p>
                
                {submission.score && (
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "px-2 py-0.5 rounded text-xs font-bold",
                      submission.score.percentage >= 70 ? "bg-green-100 text-green-700" :
                      submission.score.percentage >= 50 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {submission.score.correct}/{submission.score.total}
                    </div>
                    <span className="text-xs text-gray-500">
                      {Math.round(submission.score.percentage)}%
                    </span>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  removeSubmission(tabId, submission.id);
                }}
              >
                <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
