"use client";

import { useState, useRef, useEffect } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
}

export function ResizablePanel({
  children,
  defaultWidth = 384,
  minWidth = 280,
  maxWidth = 600,
  className,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      setWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, minWidth, maxWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  return (
    <div
      ref={panelRef}
      className={cn("relative flex-shrink-0", className)}
      style={{ width: `${width}px` }}
    >
      {/* Drag Handle */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize flex items-center justify-center transition-colors",
          "hover:bg-primary/50",
          isDragging ? "bg-primary" : "bg-gray-200"
        )}
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="w-3 h-3 text-gray-400" />
      </div>

      {/* Content */}
      <div className="h-full pl-1">
        {children}
      </div>

      {/* Global pointer-events-none overlay during drag */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize pointer-events-auto" />
      )}
    </div>
  );
}
