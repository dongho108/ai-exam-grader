"use client";

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { QuestionResult } from '@/types/grading';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface PDFViewerProps {
  file: File | string;
  results?: QuestionResult[];
  className?: string;
}

export function PDFViewer({ file, results, className }: PDFViewerProps) {
  useEffect(() => {
    // Configure PDF worker client-side only
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }, []);

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState(true);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  return (
    <div className={cn("flex flex-col h-full bg-gray-100/50 rounded-xl overflow-hidden border border-gray-200", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums text-gray-600">
            Page {pageNumber} of {numPages || '--'}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs font-medium w-12 text-center text-gray-500">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(2.5, s + 0.1))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Document Container */}
      <div className="flex-1 overflow-auto p-8 flex justify-center bg-gray-100/50">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center gap-2 text-primary font-medium animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading PDF...
            </div>
          }
          className="shadow-xl"
        >
           <div className="relative">
              <Page 
                pageNumber={pageNumber} 
                scale={scale} 
                className="bg-white shadow-sm"
                renderTextLayer={false} 
                renderAnnotationLayer={false}
              />
              
              {/* Grading Overlay */}
              {results && results.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {results.map((res, idx) => (
                    res.position && (
                      <div
                        key={`${res.questionNumber}-${idx}`}
                        className="absolute flex items-center justify-center translate-x-[-50%] translate-y-[-50%] animate-in zoom-in-50 duration-500"
                        style={{
                          left: `${res.position.x * 100}%`,
                          top: `${res.position.y * 100}%`,
                        }}
                      >
                        {res.isCorrect ? (
                          <div className="relative">
                            <div className="w-7 h-7 rounded-full border-[3px] border-red-500/80 animate-in zoom-in duration-300" />
                          </div>
                        ) : (
                          <div className="relative flex flex-col items-center">
                            <X className="w-7 h-7 text-red-500 stroke-[4px] animate-in zoom-in duration-300" />
                            <div className="absolute top-full mt-1 bg-red-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap animate-in fade-in slide-in-from-top-1">
                              {res.correctAnswer}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              )}
           </div>
        </Document>
      </div>
    </div>
  );
}
