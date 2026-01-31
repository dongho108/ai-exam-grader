"use client";

import { useTabStore } from "@/store/use-tab-store";
import { UploadZone } from "@/features/upload/upload-zone";

export function UploadAnswerKey() {
  const { activeTabId, setAnswerKeyFile } = useTabStore();
  
  const handleFileSelect = (file: File) => {
    if (activeTabId) {
        setAnswerKeyFile(activeTabId, file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8 space-y-2">
        <h2 className="text-3xl font-bold text-[#164E63]">Upload Answer Key</h2>
        <p className="text-gray-500">First, we need the correct answers to grade against.</p>
      </div>
      
      <UploadZone onFileSelect={handleFileSelect} />
    </div>
  );
}
