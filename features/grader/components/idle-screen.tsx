"use client";

import { useRef, useCallback } from "react";
import { useTabStore } from "@/store/use-tab-store";
import { useAuthStore } from "@/store/use-auth-store";
import { useScannerAvailability } from "@/features/scanner/hooks/use-scanner-availability";
import { useScanStore } from "@/store/use-scan-store";
import { UploadAnswerKey } from "./upload-answer-key";
import { Button } from "@/components/ui/button";
import {
  ScanLine,
  FileUp,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { extractAnswerStructure } from "@/lib/grading-service";
import { uploadAndTrackAnswerKey } from "@/lib/auto-save";
import type { AnswerKeyStructure } from "@/types/grading";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export function IdleScreen() {
  const { activeTabId, tabs, setAnswerKeyFile, setAnswerKeyStructure } =
    useTabStore();
  const user = useAuthStore((s) => s.user);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const { available, isElectron, devices, reason, isRefreshing, refreshDevices } =
    useScannerAvailability();

  if (activeTab?.status === "extracting") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-6 animate-pulse">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-700">정답지 분석 중...</h2>
        <p className="text-gray-500 mt-2">
          문제 구조와 정답을 추출하고 있습니다
        </p>
      </div>
    );
  }

  if (isElectron) {
    return (
      <ElectronIdleLayout
        activeTabId={activeTabId}
        available={available}
        devices={devices}
        reason={reason}
        isRefreshing={isRefreshing}
        refreshDevices={refreshDevices}
        setAnswerKeyFile={setAnswerKeyFile}
        setAnswerKeyStructure={setAnswerKeyStructure}
        userId={user?.id}
      />
    );
  }

  return <UploadAnswerKey />;
}

interface ElectronIdleLayoutProps {
  activeTabId: string | null;
  available: boolean;
  devices: { name: string }[];
  reason?: string;
  isRefreshing: boolean;
  refreshDevices: () => void;
  setAnswerKeyFile: (id: string, file: File) => void;
  setAnswerKeyStructure: (id: string, structure: AnswerKeyStructure) => void;
  userId?: string;
}

function ElectronIdleLayout({
  activeTabId,
  available,
  devices,
  reason,
  isRefreshing,
  refreshDevices,
  setAnswerKeyFile,
  setAnswerKeyStructure,
  userId,
}: ElectronIdleLayoutProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!activeTabId) return;

      if (!ACCEPTED_TYPES.includes(file.type)) {
        console.error("Unsupported file type:", file.type);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        console.error("File too large:", file.size);
        return;
      }

      try {
        setAnswerKeyFile(activeTabId, file);
        const structure = await extractAnswerStructure(file);
        setAnswerKeyStructure(activeTabId, structure);

        if (userId) {
          uploadAndTrackAnswerKey(userId, activeTabId, file);
        }
      } catch (error) {
        console.error("Extraction failed:", error);
      }
    },
    [activeTabId, setAnswerKeyFile, setAnswerKeyStructure, userId]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [handleFileSelect]
  );

  // Scanner status logic (mirrors scanner-status-indicator.tsx)
  const deviceName = devices.length > 0 ? devices[0].name : null;
  const isNoDevice = reason === "no-device-found";
  const isPermissionDenied = reason === "permission-denied";
  const dotColor = available
    ? "bg-green-500"
    : isPermissionDenied
      ? "bg-yellow-500"
      : "bg-red-500";
  const textColor = available
    ? "text-green-700"
    : isPermissionDenied
      ? "text-yellow-700"
      : "text-red-600";
  const label =
    available && deviceName
      ? deviceName
      : isPermissionDenied
        ? "스캐너 권한 필요"
        : isNoDevice
          ? "스캐너 없음"
          : "스캐너 미연결";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Scanner icon */}
      <div className="p-5 rounded-2xl bg-primary/10 mb-6">
        <ScanLine className="w-14 h-14 text-primary" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-[#164E63] mb-2">
        스캐너로 채점 시작
      </h2>

      {/* Subtitle */}
      <p className="text-gray-500 text-center mb-8">
        답안지를 스캔하고 AI가 자동 채점합니다
      </p>

      {/* CTA Button */}
      <Button
        variant="cta"
        size="lg"
        className="w-72 gap-2 text-lg h-14 rounded-full shadow-lg shadow-cta/20 hover:shadow-cta/40 hover:-translate-y-1 transition-all"
        onClick={() => useScanStore.getState().openWorkflow()}
        disabled={!available}
      >
        <ScanLine className="h-5 w-5" />
        스캔 시작하기
      </Button>

      {/* Scanner status badge */}
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        <span className={textColor}>{label}</span>
        {!available && (
          <button
            onClick={refreshDevices}
            disabled={isRefreshing}
            className="text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
            aria-label="스캐너 다시 검색"
          >
            <RefreshCw
              className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 w-full max-w-xs mx-auto my-8">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">또는</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* PDF upload link */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-primary transition-colors cursor-pointer group"
      >
        <FileUp className="h-4 w-4" />
        <span>PDF 파일로 정답지 업로드</span>
        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
