"use client";

import { useTabStore } from "@/store/use-tab-store";
import { UploadZone } from "@/features/upload/upload-zone";

import { useState } from "react";
import { extractAnswerStructure } from "@/lib/grading-service";
import { Loader2 } from "lucide-react";

export function UploadAnswerKey() {
  const { activeTabId, setAnswerKeyFile, setAnswerKeyStructure } = useTabStore();
  const [isExtracting, setIsExtracting] = useState(false);
  
  const handleFileSelect = async (file: File) => {
    if (activeTabId) {
        setIsExtracting(true);
        try {
            // 1. Save the file ref first
            setAnswerKeyFile(activeTabId, file);
            
            // 2. Perform AI Extraction
            const structure = await extractAnswerStructure(file);
            
            // 3. Save the structure to store
            setAnswerKeyStructure(activeTabId, structure);
        } catch (error) {
            console.error("Extraction failed:", error);
        } finally {
            setIsExtracting(false);
        }
    }
  };

  if (isExtracting) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-6 animate-pulse">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-700">Analysing Answer Key...</h2>
        <p className="text-gray-500 mt-2">Extracting problem structures and correct answers</p>
      </div>
    );
  }

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
