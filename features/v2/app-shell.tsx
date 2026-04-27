"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { useTabStore } from "@/store/use-tab-store";
import { useInitialData } from "@/hooks/use-initial-data";
import { useAuthInit } from "@/hooks/use-auth-init";
import { useSessionSync } from "@/hooks/use-session-sync";
import { HeaderV2 } from "./header";
import { GradingWorkspaceV2 } from "./grading/grading-workspace-v2";
import { AnswerKeyScanPanelV2 } from "./scanner/answer-key-scan-panel-v2";

export function AppShellV2() {
  useInitialData();
  useAuthInit();
  useSessionSync();

  const { isHydrating, hydrationError } = useTabStore();
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const isInitialLoading = isAuthLoading || isHydrating;

  const [active, setActive] = useState<"grade" | "scan">("grade");

  return (
    <div className="wds-theme" style={{ height: "100vh" }}>
      <div className="g-frame">
      <HeaderV2 active={active} onNavigate={setActive} />

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {isInitialLoading ? (
          <div className="g-empty">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                color: "var(--wds-label-alternative)",
              }}
            >
              <Loader2
                size={28}
                className="animate-spin"
                style={{ color: "var(--wds-primary)" }}
              />
              <span className="wds-caption1">데이터 불러오는 중...</span>
            </div>
          </div>
        ) : hydrationError === "auth" ? (
          <div className="g-empty">
            <div className="g-empty-card">
              <div className="wds-headline2 wds-bold-body">세션이 만료되었습니다</div>
              <p className="wds-caption1" style={{ color: "var(--wds-label-alternative)" }}>
                다시 로그인해 주세요.
              </p>
            </div>
          </div>
        ) : hydrationError === "network" ? (
          <div className="g-empty">
            <div className="g-empty-card">
              <div className="wds-headline2 wds-bold-body">서버 연결에 실패했어요</div>
              <button
                type="button"
                className="g-btn g-btn-md g-btn-primary"
                onClick={() => window.location.reload()}
              >
                새로고침
              </button>
            </div>
          </div>
        ) : active === "scan" ? (
          <AnswerKeyScanPanelV2 />
        ) : (
          <GradingWorkspaceV2 onScanClick={() => setActive("scan")} />
        )}
      </div>
      </div>
    </div>
  );
}
