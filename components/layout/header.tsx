"use client";

import { useTabStore } from "@/store/use-tab-store";
import { cn } from "@/lib/utils";
import { Plus, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export function Header() {
  const { tabs, activeTabId, addTab, setActiveTab, removeTab } = useTabStore();

  // Initialize with one tab if empty on mount (Client-side only)
  useEffect(() => {
    if (tabs.length === 0) {
      addTab();
    }
  }, [tabs.length, addTab]);

  return (
    <header className="flex h-12 items-center border-b border-gray-200 bg-white px-2 shadow-sm shrink-0">
      {/* Brand Icon or Logo Area */}
      <div className="mr-4 flex items-center gap-2 px-2 text-primary font-bold">
        <Globe className="h-5 w-5" />
        <span className="hidden sm:inline-block">AI 채점기</span>
      </div>

      {/* Tabs Container */}
      <div className="flex flex-1 items-end gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "group relative flex md:w-48 max-w-[200px] min-w-[120px] cursor-pointer items-center justify-between rounded-t-lg border-t border-x px-3 py-2 text-sm font-medium transition-all select-none",
              activeTabId === tab.id
                ? "border-gray-300 bg-[#ECFEFF] text-primary shadow-[0_-2px_5px_rgba(0,0,0,0.02)] z-10"
                : "border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 mt-1 h-9"
            )}
          >
            <span className="truncate mr-2 flex items-center gap-1.5">
              {tab.status === 'extracting' && (
                <Plus className="h-3 w-3 animate-spin text-primary shrink-0" />
              )}
              {tab.status === 'extracting' ? '분석 중...' : tab.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
              className={cn(
                "rounded-full p-0.5 opacity-0 transition-opacity hover:bg-red-100 hover:text-red-500",
                activeTabId === tab.id && "opacity-100",
                "group-hover:opacity-100"
              )}
            >
              <X className="h-3 w-3" />
            </button>
            
            {/* Active Indicator Line */}
            {activeTabId === tab.id && (
              <div className="absolute top-0 left-0 h-[2px] w-full bg-primary rounded-t-full" />
            )}
          </div>
        ))}

        {/* New Tab Button */}
        <button
          onClick={addTab}
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-primary transition-colors mb-1"
          aria-label="새 시험"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Right Side Actions (User Profile etc - Future) */}
      <div className="ml-4 w-8" /> 
    </header>
  );
}
