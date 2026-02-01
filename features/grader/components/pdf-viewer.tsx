"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, X, Bug } from 'lucide-react';
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
    
    // Check if file is an image
    if (file instanceof File) {
      if (file.type.startsWith('image/')) {
        setIsImage(true);
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        setNumPages(1);
        setPageNumber(1);
        return () => URL.revokeObjectURL(url);
      } else {
        setIsImage(false);
        setImageUrl(null);
      }
    } else if (typeof file === 'string' && (file.startsWith('data:image/') || file.match(/\.(jpg|jpeg|png|webp)$/i))) {
      setIsImage(true);
      setImageUrl(file);
      setNumPages(1);
      setPageNumber(1);
    } else {
      setIsImage(false);
      setImageUrl(null);
    }
  }, [file]);

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isImage, setIsImage] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!debugMode || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
  }, [debugMode]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgSize({ width: naturalWidth, height: naturalHeight });
    setLoading(false);
  };

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  // All results for current page (for debug mode)
  const allPageResults = results?.filter(
    res => res.position && (res.position.page || 1) === pageNumber
  ) || [];

  // Only incorrect answers for grading overlay
  const incorrectResults = allPageResults.filter(res => !res.isCorrect);

  const renderOverlays = () => (
    <>
      {/* Debug Grid Overlay */}
      {debugMode && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Vertical grid lines every 10% */}
          {Array.from({ length: 9 }, (_, i) => (
            <div
              key={`v-${i}`}
              className="absolute top-0 bottom-0 w-px bg-blue-300/50"
              style={{ left: `${(i + 1) * 10}%` }}
            >
              <span className="absolute top-0 left-1 text-[8px] text-blue-500 font-mono">
                {((i + 1) * 0.1).toFixed(1)}
              </span>
            </div>
          ))}
          {/* Horizontal grid lines every 10% */}
          {Array.from({ length: 9 }, (_, i) => (
            <div
              key={`h-${i}`}
              className="absolute left-0 right-0 h-px bg-blue-300/50"
              style={{ top: `${(i + 1) * 10}%` }}
            >
              <span className="absolute left-1 top-0.5 text-[8px] text-blue-500 font-mono">
                {((i + 1) * 0.1).toFixed(1)}
              </span>
            </div>
          ))}
          {/* Mouse position crosshair and tooltip */}
          {mousePos && (
            <>
              <div
                className="absolute top-0 bottom-0 w-px bg-green-500"
                style={{ left: `${mousePos.x * 100}%` }}
              />
              <div
                className="absolute left-0 right-0 h-px bg-green-500"
                style={{ top: `${mousePos.y * 100}%` }}
              />
              <div
                className="absolute bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded pointer-events-none"
                style={{
                  left: `${mousePos.x * 100}%`,
                  top: `${mousePos.y * 100}%`,
                  transform: 'translate(8px, 8px)',
                }}
              >
                ({mousePos.x.toFixed(3)}, {mousePos.y.toFixed(3)})
              </div>
            </>
          )}
          {/* Debug markers for extracted coordinate points (all results) */}
          {allPageResults.map((res, idx) => (
            <div
              key={`debug-${res.questionNumber}-${idx}`}
              className="absolute w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow translate-x-[-50%] translate-y-[-50%]"
              style={{
                left: `${res.position!.x * 100}%`,
                top: `${res.position!.y * 100}%`,
              }}
              title={`Q${res.questionNumber}: (${res.position!.x.toFixed(3)}, ${res.position!.y.toFixed(3)})`}
            />
          ))}
        </div>
      )}

      {/* Grading Overlay - only show incorrect answers */}
      {incorrectResults.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {incorrectResults.map((res, idx) => (
            <div
              key={`grade-${res.questionNumber}-${idx}`}
              className="absolute flex flex-col items-center translate-x-[-50%] translate-y-[-50%] animate-in zoom-in-50 duration-500"
              style={{
                left: `${res.position!.x * 100}%`,
                top: `${res.position!.y * 100}%`,
              }}
            >
              <X className="w-7 h-7 text-red-500 stroke-[4px] animate-in zoom-in duration-300" />
              <div className="absolute top-full mt-1 bg-red-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap animate-in fade-in slide-in-from-top-1">
                {res.correctAnswer}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

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
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <Button
            variant={debugMode ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setDebugMode(!debugMode)}
            title="Toggle Debug Mode"
          >
            <Bug className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Document Container */}
      <div className="flex-1 overflow-auto p-8 flex justify-center bg-gray-100/50">
        {isImage ? (
          <div 
            className="relative bg-white shadow-xl transition-all duration-200"
            style={{ 
              width: imgSize ? imgSize.width * scale : 'auto',
              maxHeight: 'none'
            }}
            ref={overlayRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {imageUrl && (
              <img 
                src={imageUrl} 
                alt="Exam Paper" 
                className="w-full h-auto block"
                onLoad={handleImageLoad}
              />
            )}
            
            {/* Overlay Container for Image */}
            <div className="absolute inset-0 pointer-events-none">
              {renderOverlays()}
            </div>
          </div>
        ) : (
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
            <div
              className="relative"
              ref={overlayRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                className="bg-white shadow-sm"
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />

              {renderOverlays()}
            </div>
          </Document>
        )}
      </div>
    </div>
  );
}
