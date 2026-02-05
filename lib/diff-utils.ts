/**
 * Diff utility for comparing student answers with correct answers
 */

export interface DiffResult {
  text: string;
  isDifferent: boolean;
}

/**
 * Compare two strings word by word and return diff results for the correct answer
 * @param studentAnswer - The student's answer
 * @param correctAnswer - The correct answer
 * @returns Array of DiffResult for each word in the correct answer
 */
export function diffWords(studentAnswer: string, correctAnswer: string): DiffResult[] {
  // Normalize and split into words (preserve punctuation attached to words)
  const normalizeAndSplit = (str: string): string[] => {
    return str.trim().split(/\s+/).filter(word => word.length > 0);
  };

  const studentWords = normalizeAndSplit(studentAnswer.toLowerCase());
  const correctWords = normalizeAndSplit(correctAnswer);
  const correctWordsLower = correctWords.map(w => w.toLowerCase());

  // Compare each word in the correct answer
  return correctWords.map((word, index) => {
    const studentWord = studentWords[index]?.toLowerCase() || '';
    const correctWordLower = correctWordsLower[index];

    // Check if the word exists at the same position and matches
    const isDifferent = studentWord !== correctWordLower;

    return {
      text: word,
      isDifferent,
    };
  });
}
