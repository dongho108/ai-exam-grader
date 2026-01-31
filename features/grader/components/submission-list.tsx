"use client";

import { useTabStore } from "@/store/use-tab-store";
import { StudentSubmission } from "@/types/grading";
import { FileText, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SubmissionListProps {
  tabId: string;
  onSelectSubmission?: (submission: StudentSubmission | null) => void;
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

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-700">Exam Workspace</h3>
        <p className="text-xs text-gray-400 mt-1">{tabSubmissions.length} papers uploaded</p>
      </div>

      {/* Answer Key Selector - Fixed at the top */}
      <div 
        onClick={() => onSelectSubmission?.(null)}
        className={cn(
          "p-4 border-b border-gray-100 cursor-pointer transition-all hover:bg-gray-50 flex items-center gap-3",
          !selectedSubmissionId && "bg-primary/5 border-l-4 border-l-primary"
        )}
      >
        <div className={cn(
            "p-2 rounded-lg",
            !selectedSubmissionId ? "bg-primary text-white" : "bg-primary/10 text-primary"
        )}>
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-gray-700">Answer Key</h4>
          <p className="text-[10px] text-primary/70 font-medium uppercase tracking-wider">Reference Sheet</p>
        </div>
      </div>

      {/* Student List Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student Papers</span>
           <span className="text-[10px] font-medium text-gray-400">{tabSubmissions.length} Total</span>
        </div>
        
        {tabSubmissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center text-gray-400 opacity-60">
            <Clock className="w-10 h-10 mb-2 stroke-[1.5px]" />
            <p className="text-xs">No submissions yet</p>
            <p className="text-[10px] mt-1">Drag student PDFs here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tabSubmissions.map((submission) => (
              <div
                key={submission.id}
                onClick={() => onSelectSubmission?.(submission)}
                className={cn(
                  "group relative p-4 cursor-pointer transition-all hover:bg-gray-50",
                  selectedSubmissionId === submission.id ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(submission.status)}
                      <h4 className={cn(
                        "font-medium text-sm truncate",
                        selectedSubmissionId === submission.id ? "text-primary" : "text-gray-700"
                      )}>
                        {submission.status === 'grading' ? (
                          <span className="text-primary animate-pulse">Analyzing...</span>
                        ) : (
                          submission.studentName
                        )}
                      </h4>
                    </div>
                    
                    <p className="text-[10px] text-gray-400 truncate mb-2">{submission.fileName}</p>
                    
                    {submission.score && (
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold",
                          submission.score.percentage >= 70 ? "bg-green-100 text-green-700" :
                          submission.score.percentage >= 50 ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {submission.score.correct}/{submission.score.total}
                        </div>
                        <span className="text-[10px] font-medium text-gray-500">
                          {Math.round(submission.score.percentage)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSubmission(tabId, submission.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
