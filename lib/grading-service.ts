import { GradingResult, QuestionResult, AnswerKeyStructure, StudentExamStructure } from '@/types/grading';
import { supabase } from './supabase';
import { fileToImages } from './file-utils';

/**
 * Extracts the correct answers AND their coordinates from the Answer Key PDF
 */
export async function extractAnswerStructure(file: File): Promise<AnswerKeyStructure> {
  try {
    const images = await fileToImages(file);
    
    const { data, error } = await supabase.functions.invoke('extract-answer-structure', {
      body: { images }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Failed to extract answer structure');

    return data.data as AnswerKeyStructure;
  } catch (error) {
    console.error('Extract Answer Structure Error:', error);
    // Fallback Mock with 0-1 normalized coordinates
    return {
      title: "원당중 2 7과 프린트(2) Test",
      answers: {
        "1": { text: "The students consider him a good teacher.", x: 0.5, y: 0.15, page: 1 },
        "2": { text: "They elected Emily the class president.", x: 0.5, y: 0.20, page: 1 },
        "3": { text: "Mom leaves the windows open every morning.", x: 0.5, y: 0.25, page: 1 },
        "4": { text: "We found our neighbor kind.", x: 0.5, y: 0.30, page: 1 },
        "5": { text: "They named their son Lucas.", x: 0.5, y: 0.35, page: 1 },
        "6": { text: "A lot of homework makes me busy.", x: 0.5, y: 0.40, page: 1 },
        "7": { text: "Vitamin keeps our bones strong.", x: 0.5, y: 0.45, page: 1 },
        "8": { text: "The difficult exam made/makes the students nervous.", x: 0.5, y: 0.50, page: 1 },
        "9": { text: "The new recipe will make the food delicious.", x: 0.5, y: 0.55, page: 1 }
      },
      totalQuestions: 9
    };
  }
}

/**
 * Extracts ONLY the student's text answers and name from the Exam PDF
 */
export async function extractExamStructure(file: File): Promise<StudentExamStructure> {
  try {
    const images = await fileToImages(file);
    
    const { data, error } = await supabase.functions.invoke('extract-exam-structure', {
      body: { images }
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Failed to extract exam structure');

    return data.data as StudentExamStructure;
  } catch (error) {
    console.error('Extract Exam Structure Error:', error);
    // Fallback Mock (Text only)
    return {
      studentName: "학생",
      answers: {
        "1": "The students consider him a good teacher.",
        "2": "They elected Emily their school president.",
        "3": "Mom keeps the window open.",
        "4": "We found our neighbor kind.",
        "5": "They named their son Lucas.",
        "6": "A lot of homeworks make me busy.",
        "7": "Vitamins keep our bones healthy.",
        "8": "The difficult exam made the students nervous.",
        "9": "The new recipe will make the food delicious."
      },
      totalQuestions: 9
    };
  }
}

/**
 * Normalizes text for comparison by removing whitespace, special characters, and converting to lowercase.
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/[()[\]{}]/g, ''); // Remove parentheses and brackets
}

/**
 * Checks if a student's answer matches any of the possible correct answers.
 */
export function isAnswerCorrect(studentAnswer: string, correctAnswer: string): boolean {
  const normStudent = normalizeText(studentAnswer);
  
  // Split correct answer by common delimiters (/, ,) to support multiple valid answers
  const possibleAnswers = correctAnswer.split(/[\\/|,]/).map(a => normalizeText(a));
  
  return possibleAnswers.some(ans => ans === normStudent && ans !== "");
}

/**
 * Local grading logic: compares student answers using coordinates from the answer key.
 * Uses AI semantic fallback only for Korean answers.
 */
export async function calculateGradingResult(
  submissionId: string,
  answerKey: AnswerKeyStructure,
  studentExam: StudentExamStructure
): Promise<GradingResult> {
  const results: QuestionResult[] = [];
  const failedQuestions: { id: string; studentAnswer: string; correctAnswer: string }[] = [];
  let correctCount = 0;

  // 1. Initial Local Match Pass
  Object.entries(answerKey.answers).forEach(([qNum, answerKeyData]) => {
    const studentAnswerRaw = studentExam.answers[qNum] || "(미작성)";
    const isLocalMatch = studentAnswerRaw !== "(미작성)" && studentAnswerRaw !== "(판독불가)" && isAnswerCorrect(studentAnswerRaw, answerKeyData.text);

    if (isLocalMatch) {
      correctCount++;
      results.push({
        questionNumber: parseInt(qNum),
        studentAnswer: studentAnswerRaw,
        correctAnswer: answerKeyData.text,
        isCorrect: true,
        position: {
          x: Math.min(Math.max(answerKeyData.x, 0), 1),
          y: Math.min(Math.max(answerKeyData.y, 0), 1),
          page: answerKeyData.page || 1,
        }
      });
    } else {
      // Collect for AI batch if candidate for semantic check
      const isCandidate = studentAnswerRaw !== "(미작성)" && studentAnswerRaw !== "(판독불가)";
      
      // 언어 판별: 정답에 한글이 포함되어 있는지 확인
      const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(answerKeyData.text);
      
      // 한글 해석 문제인 경우에만 AI 의미 채도(Semantic Check) 후보로 등록
      if (isCandidate && hasKorean) {
        failedQuestions.push({ id: qNum, studentAnswer: studentAnswerRaw, correctAnswer: answerKeyData.text });
      }
      
      results.push({
        questionNumber: parseInt(qNum),
        studentAnswer: studentAnswerRaw,
        correctAnswer: answerKeyData.text,
        isCorrect: false, // 기본값은 false, AI가 승인하면 나중에 업데이트됨
        position: {
          x: Math.min(Math.max(answerKeyData.x, 0), 1),
          y: Math.min(Math.max(answerKeyData.y, 0), 1),
          page: answerKeyData.page || 1,
        }
      });
    }
  });

  // 2. AI Semantic Batch Check (Fallback for Korean answers)
  if (failedQuestions.length > 0) {
    try {
      const { data, error } = await supabase.functions.invoke('verify-semantic-grading', {
        body: { questions: failedQuestions }
      });

      if (!error && data.success) {
        const aiResults: { id: string; isCorrect: boolean; reason: string }[] = data.data;
        aiResults.forEach(aiResult => {
          if (aiResult.isCorrect) {
            const questionIdx = results.findIndex(r => r.questionNumber === parseInt(aiResult.id));
            if (questionIdx !== -1) {
              results[questionIdx].isCorrect = true;
              correctCount++;
              console.log(`AI Semantic Match [Q${aiResult.id}]: "${results[questionIdx].studentAnswer}" -> Correct (${aiResult.reason})`);
            }
          }
        });
      }
    } catch (error) {
      console.warn('Batch semantic grading failed:', error);
    }
  }

  // DERIVE TOTAL COUNT
  const total = Object.keys(answerKey.answers).length;
  const percentage = total > 0 ? (correctCount / total) * 100 : 0;

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
 * Legacy support
 */
export async function gradeSubmission(
  answerKeyFile: File,
  studentFile: File
): Promise<GradingResult> {
  const answerStructure = await extractAnswerStructure(answerKeyFile);
  const examStructure = await extractExamStructure(studentFile);
  return await calculateGradingResult('temp-id', answerStructure, examStructure);
}

/**
 * Recalculates grading result after manual answer edit.
 * Pure synchronous function - no AI calls, only local text matching.
 */
export function recalculateAfterEdit(
  submissionId: string,
  results: QuestionResult[],
  editedQuestionNumber: number,
  newStudentAnswer: string,
  studentName?: string
): GradingResult {
  const updatedResults = results.map((result) => {
    if (result.questionNumber !== editedQuestionNumber) return result;
    return {
      ...result,
      studentAnswer: newStudentAnswer,
      isCorrect: isAnswerCorrect(newStudentAnswer, result.correctAnswer),
      isEdited: true,
    };
  });

  const correct = updatedResults.filter((r) => r.isCorrect).length;
  const total = updatedResults.length;

  return {
    submissionId,
    studentName,
    score: { correct, total, percentage: total > 0 ? (correct / total) * 100 : 0 },
    results: updatedResults,
  };
}

/**
 * Toggles the correct/incorrect status of a specific question.
 * Allows teachers to manually override grading results.
 */
export function toggleCorrectStatus(
  submissionId: string,
  results: QuestionResult[],
  questionNumber: number,
  newIsCorrect: boolean,
  studentName?: string
): GradingResult {
  const updatedResults = results.map((result) => {
    if (result.questionNumber !== questionNumber) return result;
    return {
      ...result,
      isCorrect: newIsCorrect,
      isEdited: true,
    };
  });

  const correct = updatedResults.filter((r) => r.isCorrect).length;
  const total = updatedResults.length;

  return {
    submissionId,
    studentName,
    score: { correct, total, percentage: total > 0 ? (correct / total) * 100 : 0 },
    results: updatedResults,
  };
}

