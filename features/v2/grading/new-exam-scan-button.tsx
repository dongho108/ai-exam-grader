"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Plus,
  ScanLine,
  Square,
  X,
} from "lucide-react";
import { useScanStore } from "@/store/use-scan-store";
import { useTabStore } from "@/store/use-tab-store";
import { useScannerAvailability } from "@/features/scanner/hooks/use-scanner-availability";
import { extractAnswerStructureFromImages } from "@/lib/grading-service";
import { filesToImages } from "@/lib/file-utils";
import { base64ToFile } from "@/lib/scan-utils";
import type { ScanOptions } from "@/types";

const NO_MORE_PAGES_PATTERNS = [
  "no-more-pages",
  "no more pages",
  "no documents",
  "feeder empty",
  "out of paper",
  "feeder is empty",
  "no paper",
  "adf empty",
  "nomedia",
  "no scanned pages",
];
const OCCUPIED_KEYWORDS = ["in use", "busy", "locked", "exclusive", "denied"];

export function NewExamScanButton() {
  const { scanSettings, updateScanSettings } = useScanStore();
  const { addTabFromAnswerKey } = useTabStore();
  const { devices } = useScannerAvailability();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [analyzingCount, setAnalyzingCount] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const shouldStopRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const isDevMode =
    process.env.NODE_ENV === "development" &&
    (typeof window === "undefined" || !window.electronAPI?.isElectron);
  const disabled = !isDevMode && devices.length === 0;

  useEffect(() => {
    setDismissed(false);
  }, [isScanning, pageCount, analyzingCount, createdCount, lastError]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const stopScan = () => {
    shouldStopRef.current = true;
  };

  const start = async (source: "duplex" | "feeder") => {
    setMenuOpen(false);
    updateScanSettings({ source });

    const opts: ScanOptions = { format: "jpeg", source };
    shouldStopRef.current = false;
    setIsScanning(true);
    setLastError(null);
    setPageCount(0);
    setAnalyzingCount(0);
    setCreatedCount(0);

    const scanned: File[] = [];
    while (!shouldStopRef.current) {
      try {
        const { filePath, mimeType, additionalFiles } =
          await window.electronAPI!.scanner.scan(opts);
        const all = [filePath, ...(additionalFiles ?? [])];
        for (const fp of all) {
          const base64 = await window.electronAPI!.scanner.readScanFile(fp);
          const ext = mimeType.split("/")[1] ?? "jpeg";
          const file = base64ToFile(
            base64,
            `answer-key-scan-${scanned.length}.${ext}`,
            mimeType,
          );
          await window.electronAPI!.scanner.cleanupScanFile(fp);
          scanned.push(file);
          setPageCount(scanned.length);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const lower = message.toLowerCase();
        const isNoMore = NO_MORE_PAGES_PATTERNS.some((p) => lower.includes(p));
        const isExhausted = scanned.length > 0 && lower.includes("command failed");
        if (isNoMore || isExhausted) break;
        if (OCCUPIED_KEYWORDS.some((k) => lower.includes(k))) {
          setLastError(
            "다른 프로그램이 스캐너를 사용 중입니다. 해당 프로그램을 종료한 후 다시 시도해 주세요.",
          );
        } else {
          setLastError(message);
        }
        break;
      }
    }
    setIsScanning(false);

    if (scanned.length === 0) return;

    const groupSize = source === "duplex" ? 2 : 1;
    const groups: File[][] = [];
    for (let i = 0; i < scanned.length; i += groupSize) {
      groups.push(scanned.slice(i, i + groupSize));
    }
    setAnalyzingCount(groups.length);

    let created = 0;
    let firstError: string | null = null;
    let remainingAnalyzing = groups.length;
    for (let i = 0; i < groups.length; i++) {
      const files = groups[i];
      try {
        const images = await filesToImages(files);
        const structure = await extractAnswerStructureFromImages(images);
        addTabFromAnswerKey({
          title: structure.title || `정답지 ${i + 1}`,
          files,
          structure,
        });
        created++;
        setCreatedCount(created);
      } catch (err) {
        if (!firstError) {
          firstError = err instanceof Error ? err.message : String(err);
        }
      } finally {
        remainingAnalyzing--;
        setAnalyzingCount(remainingAnalyzing);
      }
    }
    if (firstError && created < groups.length) {
      setLastError(`정답지 분석 실패: ${firstError}`);
    }
  };

  const showProgress =
    isScanning ||
    analyzingCount > 0 ||
    (!dismissed && (pageCount > 0 || createdCount > 0 || !!lastError));
  const mode = scanSettings.source === "duplex" ? "양면" : "단면";

  let statusLabel: string;
  if (lastError) {
    statusLabel = lastError;
  } else if (isScanning) {
    statusLabel = `스캔 중… ${pageCount}장`;
  } else if (analyzingCount > 0) {
    statusLabel = `정답지 분석 중… ${analyzingCount}개 남음`;
  } else if (createdCount > 0) {
    statusLabel = `새 시험 ${createdCount}개 추가됨`;
  } else {
    statusLabel = `스캔 완료 · ${pageCount}장`;
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {showProgress ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: "var(--wds-radius-md)",
            background: lastError
              ? "var(--g-wrong-bg, #FEECEC)"
              : isScanning || analyzingCount > 0
                ? "var(--wds-blue-95)"
                : "var(--g-correct-bg)",
            border: `1px solid ${
              lastError
                ? "var(--g-wrong, #DC2626)"
                : isScanning || analyzingCount > 0
                  ? "var(--wds-blue-90)"
                  : "var(--wds-green-90, #C8E9D2)"
            }`,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {lastError ? null : isScanning ? (
              <span className="g-dot g-dot-blue" />
            ) : analyzingCount > 0 ? (
              <Loader2
                size={14}
                className="animate-spin"
                style={{ color: "var(--wds-primary)" }}
              />
            ) : (
              <span
                className="g-modal-ring g-modal-ring-green"
                style={{ width: 22, height: 22 }}
              >
                <Check size={12} />
              </span>
            )}
            <div
              style={{
                flex: 1,
                fontSize: 12,
                fontWeight: 600,
                color: lastError
                  ? "var(--g-wrong, #DC2626)"
                  : "var(--wds-label-strong)",
                lineHeight: 1.4,
              }}
            >
              {statusLabel}
            </div>
            {!lastError && (isScanning || pageCount > 0) && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--wds-label-alternative)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {mode}
              </div>
            )}
            {isScanning ? (
              <button
                type="button"
                onClick={stopScan}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  border: "none",
                  background: "transparent",
                  color: "var(--g-wrong, #DC2626)",
                  fontSize: 11,
                  cursor: "pointer",
                  padding: "2px 4px",
                }}
              >
                <Square size={11} />
                중단
              </button>
            ) : analyzingCount > 0 ? null : (
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setDismissed(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  background: "transparent",
                  color: "var(--wds-label-alternative)",
                  cursor: "pointer",
                  padding: 2,
                  borderRadius: "var(--wds-radius-xs)",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="g-btn g-btn-md g-btn-outline g-btn-block"
          onClick={() => setMenuOpen((o) => !o)}
          disabled={disabled}
        >
          <Plus size={15} />새 시험
          <ChevronDown size={11} />
        </button>
      )}

      {menuOpen && !showProgress && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: "calc(100% + 6px)",
            background: "var(--wds-bg-elevated)",
            borderRadius: "var(--wds-radius-md)",
            boxShadow: "var(--wds-shadow-lg)",
            border: "1px solid var(--wds-line-soft, var(--wds-cool-97))",
            padding: 6,
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--wds-label-alternative)",
              padding: "6px 10px 4px",
              letterSpacing: ".04em",
            }}
          >
            급지 방식 선택
          </div>
          <ScanModeButton
            icon={<ScanLine size={14} />}
            label="양면 스캔"
            sub="앞뒤 모두 스캔"
            onClick={() => start("duplex")}
          />
          <ScanModeButton
            icon={<ScanLine size={14} />}
            label="단면 스캔"
            sub="앞면만 스캔"
            onClick={() => start("feeder")}
          />
        </div>
      )}
    </div>
  );
}

function ScanModeButton({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        border: "none",
        background: "transparent",
        borderRadius: "var(--wds-radius-sm)",
        cursor: "pointer",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--wds-cool-98)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {icon}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--wds-label-strong)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--wds-label-alternative)",
          }}
        >
          {sub}
        </div>
      </div>
    </button>
  );
}
