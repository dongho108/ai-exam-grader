"use client";

import { useTabStore } from "@/store/use-tab-store";
import { UploadZone } from "@/features/upload/upload-zone";

import { useState } from "react";
import { extractAnswerStructure } from "@/lib/grading-service";
import { Loader2 } from "lucide-react";

export function UploadAnswerKey() {
  const { activeTabId, tabs, setAnswerKeyFile, setAnswerKeyStructure } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const isExtracting = activeTab?.status === 'extracting';
  
  const handleFileSelect = async (file: File) => {
    if (activeTabId) {
        try {
            // 1. Save the file ref first (Sets status to 'extracting')
            setAnswerKeyFile(activeTabId, file);
            
            // 2. Perform AI Extraction
            const structure = await extractAnswerStructure(file);
            
            // 3. Save the structure to store (Sets status to 'ready')
            setAnswerKeyStructure(activeTabId, structure);
        } catch (error) {
            console.error("Extraction failed:", error);
        }
    }
  };

  if (isExtracting) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-6 animate-pulse">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-700">정답지 분석 중...</h2>
        <p className="text-gray-500 mt-2">문제 구조와 정답을 추출하고 있습니다</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8 space-y-2">
        <h2 className="text-3xl font-bold text-[#164E63]">정답지 업로드</h2>
        <p className="text-gray-500">채점을 위해 먼저 정답지가 필요합니다.</p>
      </div>
      
      <UploadZone onFileSelect={handleFileSelect} />
    </div>
  );
}
