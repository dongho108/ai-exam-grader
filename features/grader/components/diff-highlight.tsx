"use client";

import { diffWords } from "@/lib/diff-utils";

interface DiffHighlightProps {
  studentAnswer: string;
  correctAnswer: string;
}

/**
 * Highlights the differences between student answer and correct answer
 * Shows the correct answer with different words highlighted
 */
export function DiffHighlight({ studentAnswer, correctAnswer }: DiffHighlightProps) {
  const diffResult = diffWords(studentAnswer, correctAnswer);

  return (
    <span>
      {diffResult.map((part, index) => (
        <span key={index}>
          {part.isDifferent ? (
            <span className="bg-yellow-200 font-bold rounded px-0.5 text-red-700">
              {part.text}
            </span>
          ) : (
            <span>{part.text}</span>
          )}
          {index < diffResult.length - 1 && " "}
        </span>
      ))}
    </span>
  );
}
