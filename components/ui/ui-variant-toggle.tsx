"use client";

import { Sparkles } from "lucide-react";
import { useUserPreferencesStore } from "@/store/use-user-preferences-store";
import { cn } from "@/lib/utils";

interface UiVariantToggleProps {
  className?: string;
}

export function UiVariantToggle({ className }: UiVariantToggleProps) {
  const uiVariant = useUserPreferencesStore((s) => s.uiVariant);
  const setUiVariant = useUserPreferencesStore((s) => s.setUiVariant);

  const isWds = uiVariant === "wds";

  return (
    <button
      type="button"
      onClick={() => setUiVariant(isWds ? "classic" : "wds")}
      title={isWds ? "기본 UI로 전환" : "새 UI 실험해보기"}
      aria-pressed={isWds}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
        isWds
          ? "border-transparent bg-[#0066FF] text-white hover:bg-[#005EEB]"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" />
      <span>{isWds ? "새 UI · ON" : "새 UI 실험"}</span>
    </button>
  );
}
