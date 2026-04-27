"use client";

import { useCallback, useRef, useState } from "react";
import { Check, Eye, Loader2, ScanLine, Scissors, Trash2, Upload, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useScanStore, type ScanSettings } from "@/store/use-scan-store";
import { useTabStore } from "@/store/use-tab-store";
import { useScannerAvailability } from "@/features/scanner/hooks/use-scanner-availability";
import { extractAnswerStructureFromImages } from "@/lib/grading-service";
import { filesToImages } from "@/lib/file-utils";
import { base64ToFile } from "@/lib/scan-utils";
import type { AnswerKeyStructure } from "@/types/grading";
import type { ScanOptions } from "@/types";
import { AnswerKeyImagePreview } from "@/features/scanner/components/answer-key-image-preview";

interface AnswerKeyGroup {
  id: string;
  pages: { id: string; file: File; label: string }[];
  status: "pending" | "analyzing" | "ready" | "error";
  title?: string;
  questionCount?: number;
  structure?: AnswerKeyStructure;
  error?: string;
}

export function AnswerKeyScanPanelV2() {
  const { scanSettings, updateScanSettings } = useScanStore();
  const { addTabFromAnswerKey } = useTabStore();
  const { devices } = useScannerAvailability();

  const [groups, setGroups] = useState<AnswerKeyGroup[]>([]);
  const [previewGroup, setPreviewGroup] = useState<AnswerKeyGroup | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPageCount, setScanPageCount] = useState(0);
  const shouldStopRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDevMode =
    process.env.NODE_ENV === "development" &&
    (typeof window === "undefined" || !window.electronAPI?.isElectron);

  const createGroups = useCallback(
    (files: File[], source: ScanSettings["source"]): AnswerKeyGroup[] => {
      const newGroups: AnswerKeyGroup[] = [];
      if (source === "duplex") {
        for (let i = 0; i < files.length; i += 2) {
          const pages = [{ id: uuidv4(), file: files[i], label: `페이지 ${i + 1} (앞)` }];
          if (i + 1 < files.length) {
            pages.push({ id: uuidv4(), file: files[i + 1], label: `페이지 ${i + 2} (뒤)` });
          }
          newGroups.push({ id: uuidv4(), pages, status: "pending" });
        }
      } else {
        for (let i = 0; i < files.length; i++) {
          newGroups.push({
            id: uuidv4(),
            pages: [{ id: uuidv4(), file: files[i], label: `페이지 ${i + 1}` }],
            status: "pending",
          });
        }
      }
      return newGroups;
    },
    [],
  );

  const analyzeGroup = useCallback(async (group: AnswerKeyGroup) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === group.id ? { ...g, status: "analyzing" } : g)),
    );
    try {
      const images = await filesToImages(group.pages.map((p) => p.file));
      const structure = await extractAnswerStructureFromImages(images);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === group.id
            ? {
                ...g,
                status: "ready",
                title: structure.title || `정답지 ${prev.indexOf(g) + 1}`,
                questionCount: structure.totalQuestions ?? 0,
                structure,
              }
            : g,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setGroups((prev) =>
        prev.map((g) => (g.id === group.id ? { ...g, status: "error", error: message } : g)),
      );
    }
  }, []);

  const startScan = useCallback(async () => {
    const opts: ScanOptions = { format: "jpeg", source: scanSettings.source };
    shouldStopRef.current = false;
    setIsScanning(true);
    setScanPageCount(0);

    const scanned: File[] = [];
    while (!shouldStopRef.current) {
      try {
        const { filePath, mimeType, additionalFiles } =
          await window.electronAPI!.scanner.scan(opts);
        const all = [filePath, ...(additionalFiles ?? [])];
        for (const fp of all) {
          const base64 = await window.electronAPI!.scanner.readScanFile(fp);
          const ext = mimeType.split("/")[1] ?? "jpeg";
          const file = base64ToFile(base64, `answer-key-scan-${scanned.length}.${ext}`, mimeType);
          await window.electronAPI!.scanner.cleanupScanFile(fp);
          scanned.push(file);
          setScanPageCount(scanned.length);
        }
      } catch {
        break;
      }
    }
    setIsScanning(false);

    if (scanned.length > 0) {
      const newGroups = createGroups(scanned, scanSettings.source);
      setGroups((prev) => [...prev, ...newGroups]);
      newGroups.forEach((g) => analyzeGroup(g));
    }
  }, [scanSettings, createGroups, analyzeGroup]);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const arr = Array.from(files);
      const newGroups = createGroups(arr, scanSettings.source);
      setGroups((prev) => [...prev, ...newGroups]);
      newGroups.forEach((g) => analyzeGroup(g));
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [scanSettings.source, createGroups, analyzeGroup],
  );

  const splitGroup = useCallback(
    (id: string) => {
      setGroups((prev) => {
        const idx = prev.findIndex((g) => g.id === id);
        if (idx === -1) return prev;
        const g = prev[idx];
        if (g.pages.length <= 1) return prev;
        const newGroups: AnswerKeyGroup[] = g.pages.map((p) => ({
          id: uuidv4(),
          pages: [p],
          status: "pending",
        }));
        const result = [...prev];
        result.splice(idx, 1, ...newGroups);
        newGroups.forEach((ng) => analyzeGroup(ng));
        return result;
      });
    },
    [analyzeGroup],
  );

  const removeGroup = (id: string) => setGroups((prev) => prev.filter((g) => g.id !== id));

  const createTabs = () => {
    const ready = groups.filter((g) => g.status === "ready" && g.structure);
    for (const g of ready) {
      addTabFromAnswerKey({
        title: g.title || "New Exam",
        files: g.pages.map((p) => p.file),
        structure: g.structure!,
      });
    }
  };

  const readyCount = groups.filter((g) => g.status === "ready").length;
  const analyzingCount = groups.filter((g) => g.status === "analyzing").length;
  const okCount = readyCount;
  const errCount = groups.filter((g) => g.status === "error").length;

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        background: "var(--wds-cool-99)",
        padding: "28px 32px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <div
            style={{ fontSize: 12, fontWeight: 700, color: "var(--wds-primary)", marginBottom: 6 }}
          >
            답안지 스캔 워크플로
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-.02em",
              color: "var(--wds-label-strong)",
            }}
          >
            여러 시험지를 한번에 처리하세요
          </h1>
        </div>

        <div className="g-steps">
          <div className="g-step active">
            <div className="g-step-num">1</div>
            <div className="g-step-label">정답지 등록</div>
          </div>
          <div className="g-step-line" />
          <div className="g-step">
            <div className="g-step-num">2</div>
            <div className="g-step-label">답안지 스캔</div>
          </div>
          <div className="g-step-line" />
          <div className="g-step">
            <div className="g-step-num">3</div>
            <div className="g-step-label">결과 확인</div>
          </div>
        </div>

        <div
          className="g-card"
          style={{ marginBottom: 16, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}
        >
          <div
            style={{
              fontSize: 13,
              color: "var(--wds-label-neutral)",
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ color: "var(--wds-label-alternative)", fontWeight: 500 }}>급지</span>
              <select
                value={scanSettings.source}
                onChange={(e) =>
                  updateScanSettings({ source: e.target.value as ScanSettings["source"] })
                }
                style={{
                  border: "1px solid var(--wds-line-neutral)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 12,
                  background: "white",
                  fontFamily: "inherit",
                }}
              >
                <option value="feeder">자동급지 · 단면</option>
                <option value="duplex">자동급지 · 양면</option>
              </select>
            </label>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf, image/jpeg, image/png"
              multiple
              className="hidden"
              style={{ display: "none" }}
              onChange={handleUpload}
            />
            <button
              type="button"
              className="g-btn g-btn-md g-btn-outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={15} />
              PDF로 업로드
            </button>
            <button
              type="button"
              className="g-btn g-btn-md g-btn-primary"
              onClick={isScanning ? () => (shouldStopRef.current = true) : startScan}
              disabled={!isScanning && !isDevMode && devices.length === 0}
            >
              {isScanning ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  스캔 중 ({scanPageCount}장)
                </>
              ) : (
                <>
                  <ScanLine size={15} />
                  스캔 시작
                </>
              )}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
            padding: "0 4px",
          }}
        >
          <div
            style={{ fontSize: 13, fontWeight: 700, color: "var(--wds-label-strong)" }}
          >
            스캔된 정답지 · {groups.length}건
          </div>
          {groups.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--wds-label-alternative)" }}>
              완료 {okCount}건{errCount > 0 ? ` · 오류 ${errCount}건` : ""}
            </div>
          )}
        </div>

        {groups.length === 0 ? (
          <div
            className="g-card"
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--wds-label-assistive)",
            }}
          >
            <ScanLine size={36} style={{ opacity: 0.4, marginBottom: 12 }} />
            <p style={{ fontSize: 14, margin: 0 }}>
              스캔 시작이나 PDF 업로드로 정답지를 추가하세요.
            </p>
          </div>
        ) : (
          groups.map((g, i) => (
            <div
              key={g.id}
              className={`g-scan-item ${
                g.status === "ready" ? "ok" : g.status === "error" ? "err" : ""
              }`}
            >
              <div className="g-scan-page" />
              <div className="g-scan-body">
                <div className="g-scan-title">
                  {g.status === "analyzing" ? (
                    <span style={{ color: "var(--wds-label-alternative)" }}>분석 중…</span>
                  ) : g.status === "ready" ? (
                    g.title
                  ) : g.status === "error" ? (
                    "분석 실패"
                  ) : (
                    `정답지 ${i + 1}`
                  )}
                </div>
                <div className="g-scan-meta">
                  <span>{g.pages.map((p) => p.label).join(", ")}</span>
                  {g.questionCount != null && (
                    <>
                      <span>·</span>
                      <span>{g.questionCount}문항</span>
                    </>
                  )}
                  {g.status === "ready" && (
                    <>
                      <span>·</span>
                      <span
                        className="g-chip g-chip-green"
                        style={{ height: 18, padding: "0 6px", fontSize: 11 }}
                      >
                        <Check size={10} />
                        준비 완료
                      </span>
                    </>
                  )}
                  {g.status === "analyzing" && (
                    <>
                      <span>·</span>
                      <span
                        className="g-chip g-chip-blue"
                        style={{ height: 18, padding: "0 6px", fontSize: 11 }}
                      >
                        구조 추출 중
                      </span>
                    </>
                  )}
                  {g.status === "error" && (
                    <>
                      <span>·</span>
                      <span
                        className="g-chip g-chip-red"
                        style={{ height: 18, padding: "0 6px", fontSize: 11 }}
                      >
                        다시 스캔 필요
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="g-scan-acts">
                <button
                  type="button"
                  className="g-iconbtn"
                  style={{ width: 28, height: 28 }}
                  onClick={() => setPreviewGroup(g)}
                  title="미리보기"
                >
                  <Eye size={14} />
                </button>
                {g.pages.length > 1 && (
                  <button
                    type="button"
                    className="g-iconbtn"
                    style={{ width: 28, height: 28 }}
                    onClick={() => splitGroup(g.id)}
                    title="페이지 분리"
                  >
                    <Scissors size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className="g-iconbtn"
                  style={{ width: 28, height: 28 }}
                  onClick={() => removeGroup(g.id)}
                  title="삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <button
            type="button"
            className="g-btn g-btn-md g-btn-primary"
            disabled={readyCount === 0 || analyzingCount > 0}
            onClick={createTabs}
          >
            탭 생성하기 ({readyCount}개)
          </button>
        </div>
      </div>

      {previewGroup && (
        <AnswerKeyImagePreview
          files={previewGroup.pages.map((p) => p.file)}
          title={previewGroup.title || `정답지`}
          onClose={() => setPreviewGroup(null)}
        />
      )}
    </div>
  );
}
