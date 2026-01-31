"use client";

import { Header } from "@/components/layout/header";
import { UploadAnswerKey } from "@/features/grader/components/upload-answer-key";
import { GradingWorkspace } from "@/features/grader/components/grading-workspace";
import { useTabStore } from "@/store/use-tab-store";

export default function Home() {
  // In a real app we might route by ID, but for SPA feel we use store
  const { activeTabId, tabs } = useTabStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden">
      <Header />
      
      <main className="flex-1 overflow-hidden relative p-4">
        {activeTab ? (
           activeTab.status === 'idle' || activeTab.status === 'extracting' ? (
             <UploadAnswerKey />
           ) : activeTab.status === 'ready' && activeTab.answerKeyFile?.fileRef ? (
             <GradingWorkspace 
               tabId={activeTab.id} 
               answerKeyFile={activeTab.answerKeyFile.fileRef} 
             />
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
