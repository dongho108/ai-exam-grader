"use client";

import { useState } from "react";
import { Grid3x3, FileText } from "lucide-react";
import { useTabStore } from "@/store/use-tab-store";
import { useUserPreferencesStore } from "@/store/use-user-preferences-store";
import type { GradingStrictness } from "@/types/grading";

interface AnswerKeyPanelV2Props {
  tabId: string;
  pdfFiles?: File[];
  renderPdfViewer?: (files: File[]) => React.ReactNode;
}

const STRICTNESS_OPTIONS: ReadonlyArray<{
  id: GradingStrictness;
  label: string;
  desc: string;
  dot: string;
}> = [
  { id: "strict", label: "엄격", desc: "정확히 일치하는 답안만 정답 처리", dot: "var(--g-wrong)" },
  { id: "standard", label: "보통", desc: "오타 1글자까지 정답 인정", dot: "var(--wds-primary)" },
  { id: "lenient", label: "관대", desc: "유사 표현·동의어까지 정답 인정", dot: "var(--g-correct)" },
];

export function AnswerKeyPanelV2({ tabId, pdfFiles, renderPdfViewer }: AnswerKeyPanelV2Props) {
  const tabs = useTabStore((s) => s.tabs);
  const setStrictness = useTabStore((s) => s.setGradingStrictness);
  const userDefault = useUserPreferencesStore((s) => s.defaultGradingStrictness);
  const tab = tabs.find((t) => t.id === tabId);
  const structure = tab?.answerKeyStructure;

  const tabStrictness = tab?.gradingStrictness;
  const usingDefault = tabStrictness === undefined;
  const effective: GradingStrictness = tabStrictness ?? userDefault ?? "standard";
  const currentMode =
    STRICTNESS_OPTIONS.find((m) => m.id === effective) ?? STRICTNESS_OPTIONS[1];

  const [view, setView] = useState<"structure" | "pdf">("structure");

  const items = structure
    ? Object.entries(structure.answers)
        .map(([n, a]) => ({ n: Number(n), q: a.question || "", correct: a.text }))
        .sort((a, b) => a.n - b.n)
    : [];

  return (
    <section className="g-result">
      <div className="g-result-head">
        <div className="g-result-student">
          <div className="g-result-info">
            <div className="name">{structure?.title || tab?.title || "정답지"} · 정답지</div>
            <div className="sub">
              {tab?.answerKeyFile?.name || "파일 미등록"}
              {structure ? ` · ${structure.totalQuestions}문항` : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="g-seg">
            <button
              type="button"
              className={`g-seg-btn ${view === "structure" ? "is-active" : ""}`}
              onClick={() => setView("structure")}
            >
              <Grid3x3 size={13} />
              구조 추출
            </button>
            <button
              type="button"
              className={`g-seg-btn ${view === "pdf" ? "is-active" : ""}`}
              onClick={() => setView("pdf")}
            >
              <FileText size={13} />
              원본
            </button>
          </div>
        </div>
      </div>

      <div className="g-key-settings">
        <div className="g-key-settings-label">
          <div className="wds-label1 wds-bold" style={{ color: "var(--wds-label-strong)" }}>
            채점 모드
          </div>
          <div
            className="wds-caption1"
            style={{
              color: "var(--wds-label-alternative)",
              marginTop: "var(--wds-sp-2)",
            }}
          >
            {currentMode.desc}
            {usingDefault && " · 개인 기본값 사용 중"}
          </div>
        </div>
        <div className="g-seg">
          <button
            type="button"
            className={`g-seg-btn ${usingDefault ? "is-active" : ""}`}
            onClick={() => setStrictness(tabId, undefined)}
            title="개인 설정의 기본 채점 모드 사용"
          >
            기본값
          </button>
          {STRICTNESS_OPTIONS.map((m) => (
            <button
              type="button"
              key={m.id}
              className={`g-seg-btn ${!usingDefault && tabStrictness === m.id ? "is-active" : ""}`}
              onClick={() => setStrictness(tabId, m.id)}
              title={m.desc}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "var(--wds-radius-pill)",
                  background: m.dot,
                  display: "inline-block",
                }}
              />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {view === "structure" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <div
            className="wds-caption1"
            style={{
              padding: "var(--wds-sp-12) var(--wds-sp-24)",
              display: "flex",
              gap: "var(--wds-sp-16)",
              color: "var(--wds-label-alternative)",
              borderBottom: "1px solid var(--wds-line-alternative)",
              background: "var(--wds-cool-99)",
            }}
          >
            <span>
              총{" "}
              <b
                style={{
                  color: "var(--wds-label-normal)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {structure?.totalQuestions ?? 0}
              </b>
              문항
            </span>
            {structure && (
              <>
                <span>·</span>
                <span>AI 자동 추출</span>
              </>
            )}
          </div>
          {items.length === 0 ? (
            <div
              style={{
                padding: "var(--wds-sp-40)",
                textAlign: "center",
                color: "var(--wds-label-assistive)",
              }}
              className="wds-caption1"
            >
              정답지 구조가 아직 추출되지 않았어요
            </div>
          ) : (
            <table className="g-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>문제 (원문)</th>
                  <th>정답</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.n}>
                    <td className="g-q-num">{r.n}</td>
                    <td className="g-q-text">{r.q}</td>
                    <td style={{ fontWeight: 600 }}>{r.correct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto", background: "var(--wds-cool-99)" }}>
          {pdfFiles && pdfFiles.length > 0 && renderPdfViewer ? (
            renderPdfViewer(pdfFiles)
          ) : (
            <div
              style={{
                padding: "var(--wds-sp-40)",
                textAlign: "center",
                color: "var(--wds-label-assistive)",
              }}
              className="wds-caption1"
            >
              정답지 원본 파일이 없어요
            </div>
          )}
        </div>
      )}
    </section>
  );
}
