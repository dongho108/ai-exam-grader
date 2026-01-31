import { GradingResult, QuestionResult } from '@/types/grading';

/**
 * Mock grading function for Stage 1
 * In production, this would call an AI service to analyze the PDF
 */
export async function gradeSubmission(
  answerKeyFile: File,
  studentFile: File
): Promise<GradingResult> {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock: Generate random results for 20 questions
  const totalQuestions = 20;
  const results: QuestionResult[] = [];
  
  for (let i = 1; i <= totalQuestions; i++) {
    const isCorrect = Math.random() > 0.3; // 70% correct rate
    const correctAnswer = generateMockAnswer();
    const studentAnswer = isCorrect ? correctAnswer : generateMockAnswer();
    
    results.push({
      questionNumber: i,
      studentAnswer,
      correctAnswer,
      isCorrect,
      position: {
        x: 50 + (i % 2) * 250, // Mock position for overlay
        y: 100 + Math.floor((i - 1) / 2) * 40,
      },
    });
  }

  const correct = results.filter((r) => r.isCorrect).length;
  const percentage = (correct / totalQuestions) * 100;

  // Extract name (Simulated extraction)
  let studentName = studentFile.name.replace('.pdf', '').replace(/_/g, ' ');
  
  // Demo specific: If the filename is generic, use the name from the provided image
  if (studentFile.name.includes('시험지')) {
    studentName = '허재인';
  }

  return {
    submissionId: '', // Will be set by caller
    studentName,
    score: {
      correct,
      total: totalQuestions,
      percentage,
    },
    results,
  };
}

function generateMockAnswer(): string {
  const answers = ['A', 'B', 'C', 'D'];
  return answers[Math.floor(Math.random() * answers.length)];
}
