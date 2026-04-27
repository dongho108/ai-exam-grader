"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import type { StudentSubmission, AnswerKeyStructure } from "@/types/grading";
import { submitGradingReport } from "@/lib/report-service";
import {
  getSessionStoragePath,
  getSubmissionStoragePath,
} from "@/lib/persistence-service";

interface ReportIssueModalV2Props {
  submission: StudentSubmission;
  sessionId: string;
  userId: string;
  answerKeyStructure: AnswerKeyStructure;
  onClose: () => void;
}

export function ReportIssueModalV2({
  submission,
  sessionId,
  userId,
  answerKeyStructure,
  onClose,
}: ReportIssueModalV2Props) {
  const [comment, setComment] = useState("");
  const [stage, setStage] = useState<"form" | "submitting" | "done">("form");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (stage !== "submitting") onClose();
  };

  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) close();
  };

  const handleSubmit = async () => {
    if (!submission.score || !submission.results) return;
    setStage("submitting");
    setError(null);

    try {
      const [answerKeyPath, submissionPath] = await Promise.all([
        getSessionStoragePath(userId, sessionId),
        getSubmissionStoragePath(userId, sessionId, submission.id),
      ]);

      await submitGradingReport({
        userId,
        sessionId,
        submissionId: submission.id,
        studentName: submission.studentName,
        score: submission.score,
        resultsSnapshot: submission.results,
        answerKeyStructure,
        answerKeyStoragePath: answerKeyPath || "",
        submissionStoragePath: submissionPath || "",
        comment: comment.trim() || undefined,
      });
      setStage("done");
    } catch (err) {
      console.error("[ReportIssueModalV2] submit failed:", err);
      setError("제보 제출에 실패했습니다. 다시 시도해주세요.");
      setStage("form");
    }
  };

  return (
    <div className="wds-theme g-modal-backdrop" onClick={onBackdrop}>
      <div className="g-modal">
        {stage === "done" ? (
          <div className="g-modal-body g-modal-center">
            <div className="g-modal-ring g-modal-ring-green">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2>제보가 접수되었습니다</h2>
              <p>확인 후 개선하겠습니다. 감사합니다!</p>
            </div>
            <button
              type="button"
              className="g-btn g-btn-md g-btn-ghost"
              onClick={onClose}
              style={{ marginTop: 4 }}
            >
              닫기
            </button>
          </div>
        ) : (
          <div className="g-modal-body g-modal-center">
            <div className="g-modal-ring g-modal-ring-amber">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h2>채점 오류 제보</h2>
              <p>채점 결과에 문제가 있나요? 아래 정보와 함께 제보됩니다.</p>
            </div>
            <div className="g-modal-summary">
              <div className="row">
                <span className="k">학생</span>
                <span className="v">{submission.studentName}</span>
              </div>
              <div className="row">
                <span className="k">점수</span>
                <span className="v">
                  {submission.score?.correct} / {submission.score?.total} (
                  {Math.round(submission.score?.percentage ?? 0)}%)
                </span>
              </div>
              <div className="row">
                <span className="k">문항 수</span>
                <span className="v">{submission.results?.length ?? 0}문항</span>
              </div>
              <div className="row">
                <span className="k">첨부</span>
                <span className="v">정답지 PDF, 시험지 PDF</span>
              </div>
            </div>
            <div style={{ width: "100%", textAlign: "left" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--wds-label-strong)",
                  marginBottom: 6,
                }}
              >
                어떤 부분이 이상한가요?{" "}
                <span style={{ fontWeight: 500, color: "var(--wds-label-alternative)" }}>
                  (선택)
                </span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="예: 3번 문제의 정답이 잘못 인식된 것 같아요"
                rows={3}
                className="g-textarea"
              />
            </div>
            {error && (
              <p style={{ color: "var(--g-wrong)", fontSize: 13 }}>{error}</p>
            )}
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              <button
                type="button"
                className="g-btn g-btn-md g-btn-outline"
                onClick={onClose}
                disabled={stage === "submitting"}
                style={{ flex: 1 }}
              >
                취소
              </button>
              <button
                type="button"
                className="g-btn g-btn-md g-btn-primary"
                onClick={handleSubmit}
                disabled={stage === "submitting"}
                style={{ flex: 1 }}
              >
                {stage === "submitting" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    제출 중…
                  </>
                ) : (
                  "제보하기"
                )}
              </button>
            </div>
          </div>
        )}

        {stage !== "submitting" && (
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 28,
              height: 28,
              borderRadius: "var(--wds-radius-pill)",
              background: "transparent",
              border: 0,
              color: "var(--wds-label-alternative)",
              cursor: "pointer",
              display: "none",
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
