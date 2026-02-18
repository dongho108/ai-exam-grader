"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { UploadAnswerKey } from "@/features/grader/components/upload-answer-key";
import { GradingWorkspace } from "@/features/grader/components/grading-workspace";
import { useTabStore, StoreExamSession } from "@/store/use-tab-store";
import { useInitialData } from "@/hooks/use-initial-data";
import { useAuthInit } from "@/hooks/use-auth-init";
import { useSessionSync } from "@/hooks/use-session-sync";
import { resolveFile } from "@/lib/file-resolver";
import { Loader2 } from "lucide-react";

/**
 * Resolves the answer key File for a tab.
 * If fileRef exists, use it directly. Otherwise, lazy-download from storagePath.
 */
function useAnswerKeyFile(activeTab: StoreExamSession | undefined) {
  const [file, setFile] = useState<File | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeTab || activeTab.status !== 'ready') {
      setFile(undefined);
      return;
    }

    const akf = activeTab.answerKeyFile;
    if (!akf) {
      setFile(undefined);
      return;
    }

    // If we have a local file reference, use it
    if (akf.fileRef) {
      setFile(akf.fileRef);
      return;
    }

    // If we have a storage path, download it
    if (akf.storagePath) {
      setIsLoading(true);
      resolveFile(akf.storagePath, akf.name)
        .then((resolved) => {
          setFile(resolved);
          // Also update the store so we don't re-download
          const state = useTabStore.getState();
          useTabStore.setState({
            tabs: state.tabs.map((t) =>
              t.id === activeTab.id && t.answerKeyFile
                ? { ...t, answerKeyFile: { ...t.answerKeyFile, fileRef: resolved } }
                : t
            ),
          });
        })
        .catch((err) => console.error('[AnswerKeyResolve] Failed:', err))
        .finally(() => setIsLoading(false));
    }
  }, [activeTab?.id, activeTab?.status, activeTab?.answerKeyFile?.storagePath, activeTab?.answerKeyFile?.fileRef]);

  return { file, isLoading };
}

export default function Home() {
  // Load initial mock data for development
  useInitialData();
  useAuthInit();
  useSessionSync();

  // In a real app we might route by ID, but for SPA feel we use store
  const { activeTabId, tabs } = useTabStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const { file: answerKeyFile, isLoading: isResolvingFile } = useAnswerKeyFile(activeTab);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden">
      <Header />

      <main className="flex-1 overflow-hidden relative p-4">
        {activeTab ? (
           activeTab.status === 'idle' || activeTab.status === 'extracting' ? (
             <UploadAnswerKey />
           ) : activeTab.status === 'ready' && answerKeyFile ? (
             <GradingWorkspace
               tabId={activeTab.id}
               answerKeyFile={answerKeyFile}
             />
           ) : isResolvingFile ? (
             <div className="flex flex-col h-full items-center justify-center text-gray-400 gap-2">
               <Loader2 className="w-8 h-8 animate-spin text-primary" />
               <span>파일 불러오는 중...</span>
             </div>
           ) : (
             <div className="flex h-full items-center justify-center text-gray-400">
               Loading...
             </div>
           )
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            No active tab
          </div>
        )}
      </main>
    </div>
  );
}
