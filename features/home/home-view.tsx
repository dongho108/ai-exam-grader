"use client";

import { FileUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeView() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-8 bg-gradient-to-br from-[#ECFEFF] to-white">
      <div className="max-w-md text-center space-y-6 animate-in fade-in zoom-in duration-500">
        
        {/* Icon Circle */}
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-primary/10">
          <Sparkles className="h-10 w-10 text-primary animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#164E63]">
            Start Grading
          </h1>
          <p className="text-gray-500">
            Upload an Answer Key PDF to begin a new exam session.
            AI Grader will help you check student papers automatically.
          </p>
        </div>

        <div className="pt-4">
          <Button size="lg" variant="cta" className="w-full gap-2 text-lg h-14 rounded-full shadow-lg shadow-cta/20 hover:shadow-cta/40 hover:-translate-y-1 transition-all">
            <FileUp className="h-5 w-5" />
            Upload Answer Key
          </Button>
          <p className="mt-4 text-xs text-slate-400 font-mono">
            Supported formats: PDF only
          </p>
        </div>

      </div>
    </div>
  );
}
