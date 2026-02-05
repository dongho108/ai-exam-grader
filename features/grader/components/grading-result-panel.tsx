"use client";

import { StudentSubmission, QuestionResult } from "@/types/grading";
import { Check, X, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiffHighlight } from "./diff-highlight";

interface GradingResultPanelProps {
  submission: StudentSubmission | null;
  className?: string;
}

export function GradingResultPanel({ submission, className }: GradingResultPanelProps) {
  // 빈 상태: submission이 null
  if (!submission) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full bg-white p-8", className)}>
        <ClipboardList className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-400 mb-2">채점 결과 없음</h3>
        <p className="text-sm text-gray-400 text-center">
          학생 답안을 선택하고 채점을 완료하면<br />결과가 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  // submission이 있지만 채점이 완료되지 않은 상태
  if (!submission.score || !submission.results || submission.results.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full bg-white p-8", className)}>
        <ClipboardList className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-400 mb-2">채점 대기 중</h3>
        <p className="text-sm text-gray-400 text-center">
          {submission.studentName}의 답안이<br />아직 채점되지 않았습니다.
        </p>
      </div>
    );
  }

  const { score, results, studentName } = submission;

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* 헤더: 채점 결과 요약 */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">채점 결과</h2>

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-500 mb-1">학생</p>
            <p className="text-lg font-semibold text-gray-800">{studentName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">점수</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">
                {score.correct}
              </span>
              <span className="text-lg text-gray-400">/ {score.total}</span>
              <span className={cn(
                "ml-2 px-2 py-1 rounded text-sm font-bold",
                score.percentage >= 70 ? "bg-green-100 text-green-700" :
                score.percentage >= 50 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              )}>
                {Math.round(score.percentage)}%
              </span>
            </div>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${score.percentage}%` }}
          />
        </div>
      </div>

      {/* 문제별 결과 테이블 */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-20">
                번호
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                학생 답안
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                정답
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">
                결과
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.map((result: QuestionResult) => (
              <tr
                key={result.questionNumber}
                className={cn(
                  "transition-colors",
                  result.isCorrect
                    ? "bg-green-50 hover:bg-green-100"
                    : "bg-red-50 hover:bg-red-100"
                )}
              >
                <td className={cn(
                  "px-4 py-3 text-sm font-semibold",
                  result.isCorrect ? "text-green-700" : "text-red-700"
                )}>
                  {result.questionNumber}
                </td>
                <td className={cn(
                  "px-4 py-3 text-sm",
                  result.isCorrect
                    ? "text-green-700"
                    : "text-red-400 line-through"
                )}>
                  {result.studentAnswer || "-"}
                </td>
                <td className="px-4 py-3 text-sm">
                  {result.isCorrect ? (
                    <span className="text-green-700">{result.correctAnswer || "-"}</span>
                  ) : (
                    <DiffHighlight
                      studentAnswer={result.studentAnswer || ""}
                      correctAnswer={result.correctAnswer || "-"}
                    />
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    {result.isCorrect ? (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500">
                        <Check className="w-5 h-5 text-white stroke-[3]" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500">
                        <X className="w-5 h-5 text-white stroke-[3]" />
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
