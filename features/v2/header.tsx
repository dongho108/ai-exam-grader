"use client";

import { useEffect, useRef, useState } from "react";
import { Settings, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { useUserPreferencesStore } from "@/store/use-user-preferences-store";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { ScannerStatusIndicator } from "@/features/scanner/components/scanner-status-indicator";
import { UiVariantToggle } from "@/components/ui/ui-variant-toggle";
import type { GradingStrictness } from "@/types/grading";

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

export function HeaderV2() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signOut = useAuthStore((s) => s.signOut);
  const defaultStrictness = useUserPreferencesStore((s) => s.defaultGradingStrictness);
  const setDefaultStrictness = useUserPreferencesStore((s) => s.setDefaultGradingStrictness);
  const savePreferences = useUserPreferencesStore((s) => s.savePreferences);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const initials = (user?.user_metadata?.full_name || user?.email || "G")
    .toString()
    .replace(/[^A-Za-z가-힣]/g, "")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="g-appbar">
      <div className="g-brand">
        <div className="g-brand-mark">G</div>
        Gradely
      </div>

      <div className="g-appbar-right">
        <UiVariantToggle />
        <ScannerStatusIndicator />

        <div className="g-settings" ref={wrapRef}>
          <button
            type="button"
            className={`g-settings-btn ${open ? "is-open" : ""}`}
            onClick={() => setOpen((v) => !v)}
            aria-label="설정"
            title="설정"
          >
            <Settings size={16} />
          </button>
          {open && (
            <div className="g-popover g-settings-pop" role="dialog">
              <div className="g-popover-head">
                <div
                  className="wds-label1 wds-bold"
                  style={{ color: "var(--wds-label-strong)" }}
                >
                  설정
                </div>
              </div>
              <div className="g-popover-section">
                <div
                  className="wds-caption1 wds-bold"
                  style={{
                    color: "var(--wds-label-alternative)",
                    letterSpacing: ".02em",
                    textTransform: "uppercase",
                    marginBottom: "var(--wds-sp-8)",
                  }}
                >
                  기본 채점 모드
                </div>
                <div className="g-radio-list">
                  {STRICTNESS_OPTIONS.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      className={`g-radio-item ${defaultStrictness === m.id ? "is-active" : ""}`}
                      onClick={() => {
                        setDefaultStrictness(m.id);
                        if (user?.id) savePreferences(user.id);
                      }}
                    >
                      <span className="g-radio-dot" style={{ background: m.dot }} />
                      <div className="g-radio-body">
                        <div className="g-radio-label">{m.label}</div>
                        <div className="g-radio-desc">{m.desc}</div>
                      </div>
                      {defaultStrictness === m.id && (
                        <span className="g-radio-check">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 8l3 3 7-7" />
                          </svg>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div
                  className="wds-caption1"
                  style={{
                    color: "var(--wds-label-assistive)",
                    marginTop: "var(--wds-sp-10)",
                    lineHeight: 1.5,
                  }}
                >
                  새로 추가되는 정답지에 기본으로 적용됩니다.
                </div>
              </div>
            </div>
          )}
        </div>

        {!isAuthenticated ? (
          <GoogleLoginButton
            onClick={signInWithGoogle}
            label="로그인"
            className="h-8 py-0 px-2 min-h-[32px]"
          />
        ) : (
          <>
            <div className="g-avatar" title={user?.user_metadata?.full_name || user?.email || ""}>
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata.full_name || "프로필"}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={signOut}
              className="g-iconbtn"
              aria-label="로그아웃"
              title="로그아웃"
            >
              <LogOut size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
