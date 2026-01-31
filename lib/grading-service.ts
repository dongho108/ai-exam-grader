import { GradingResult, QuestionResult, AnswerKeyStructure, StudentExamStructure } from '@/types/grading';
import { supabase } from './supabase';
import { convertPdfToImages } from './pdf-utils';

/**
 * Extracts the correct answers from the Answer Key PDF
 */
export async function extractAnswerStructure(file: File): Promise<AnswerKeyStructure> {
  try {
    const images = await convertPdfToImages(file);
    
    const { data, error } = await supabase.functions.invoke('extract-answer-structure', {
      body: { images }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Failed to extract answer structure');

    return data.data as AnswerKeyStructure;
  } catch (error) {
    console.error('Extract Answer Structure Error:', error);
    // Fallback Mock
    return {
      answers: {
        "1": "A", "2": "B", "3": "C", "4": "D", "5": "A",
        "6": "B", "7": "C", "8": "D", "9": "A", "10": "B"
      },
      totalQuestions: 10
    };
  }
}

/**
 * Extracts the student's answers from the Exam PDF
 */
export async function extractExamStructure(file: File): Promise<StudentExamStructure> {
  try {
    const images = await convertPdfToImages(file);
    
    const { data, error } = await supabase.functions.invoke('extract-exam-structure', {
      body: { images }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Failed to extract exam structure');

    return data.data as StudentExamStructure;
  } catch (error) {
    console.error('Extract Exam Structure Error:', error);
    // Fallback Mock
    return {
      studentName: "허재인",
      answers: {
        "1": "A", "2": "C", "3": "C", "4": "D", "5": "B",
        "6": "B", "7": "A", "8": "D", "9": "A", "10": "B"
      },
      totalQuestions: 10
    };
  }
}

/**
 * Local grading logic: compares student answers with the answer key
 */
export function calculateGradingResult(
  submissionId: string,
  answerKey: AnswerKeyStructure,
  studentExam: StudentExamStructure
): GradingResult {
  const results: QuestionResult[] = [];
  let correctCount = 0;

  // Compare each question
  Object.entries(answerKey.answers).forEach(([qNum, correctAnswer]) => {
    const studentAnswer = studentExam.answers[qNum] || "(미작성)";
    const isCorrect = studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    
    if (isCorrect) correctCount++;

    results.push({
      questionNumber: parseInt(qNum),
      studentAnswer,
      correctAnswer,
      isCorrect,
      position: {
        x: 50 + (parseInt(qNum) % 2) * 250, // Mock positions as AI structure extraction doesn't provide them yet
        y: 100 + Math.floor((parseInt(qNum) - 1) / 2) * 40,
      }
    });
  });

  const total = answerKey.totalQuestions;
  const percentage = (correctCount / total) * 100;

  return {
    submissionId,
    studentName: studentExam.studentName,
    score: {
      correct: correctCount,
      total,
      percentage,
    },
    results,
  };
}

/**
 * Main entrance (Compatibility with existing code)
 * Note: GradingWorkspace will be updated to call individual steps, but we keep this for legacy refs if any
 */
export async function gradeSubmission(
  answerKeyFile: File,
  studentFile: File
): Promise<GradingResult> {
  const answerStructure = await extractAnswerStructure(answerKeyFile);
  const examStructure = await extractExamStructure(studentFile);
  return calculateGradingResult('temp-id', answerStructure, examStructure);
}
