import { AnswerKeyStructure, StudentExamStructure, GradingResult } from '@/types/grading';

export const MOCK_ANSWER_STRUCTURE: AnswerKeyStructure = {
  title: "원당중 2 7과 프린트(2) Test",
  answers: {
    "1": { text: "The students consider him a good teacher.", question: "그 학생들은 그를 좋은 선생님으로 여긴다." },
    "2": { text: "They elected Emily the class president.", question: "그들은 Emily를 반장으로 선출했다." },
    "3": { text: "Mom leaves the windows open every morning.", question: "엄마는 매일 아침 창문을 열어두신다." },
    "4": { text: "We found our neighbor kind.", question: "우리는 우리 이웃이 친절하다는 것을 알게 되었다." },
    "5": { text: "They named their son Lucas.", question: "그들은 그들의 아들을 Lucas라고 이름지었다." },
    "6": { text: "A lot of homework makes me busy.", question: "많은 숙제가 나를 바쁘게 만든다." },
    "7": { text: "Vitamin keeps our bones strong.", question: "비타민은 우리의 뼈를 건강한 상태로 둔다/유지한다." },
    "8": { text: "The difficult exam made/makes the students nervous.", question: "그 어려운 시험은 그 학생들을 긴장하게 만들었다. (difficult exam/nervous)" },
    "9": { text: "The new recipe will make the food delicious.", question: "그 새로운 요리법은 그 음식을 맛있게 만들어줄 것이다. (new recipe)" }
  },
  totalQuestions: 9
};

export const MOCK_STUDENT_EXAM_STRUCTURE: StudentExamStructure = {
  studentName: "홍길동",
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

export const getMockGradingResult = (submissionId: string): GradingResult => {
  return {
    submissionId,
    studentName: MOCK_STUDENT_EXAM_STRUCTURE.studentName,
    score: {
      correct: 5,
      total: 9,
      percentage: (5 / 9) * 100,
    },
    results: [
      {
        questionNumber: 1,
        studentAnswer: "The students consider him a good teacher.",
        correctAnswer: "The students consider him a good teacher.",
        question: "그 학생들은 그를 좋은 선생님으로 여긴다.",
        isCorrect: true,
      },
      {
        questionNumber: 2,
        studentAnswer: "They elected Emily their school president.",
        correctAnswer: "They elected Emily the class president.",
        question: "그들은 Emily를 반장으로 선출했다.",
        isCorrect: false,
      },
      {
        questionNumber: 3,
        studentAnswer: "Mom keeps the window open.",
        correctAnswer: "Mom leaves the windows open every morning.",
        question: "엄마는 매일 아침 창문을 열어두신다.",
        isCorrect: false,
      },
      {
        questionNumber: 4,
        studentAnswer: "We found our neighbor kind.",
        correctAnswer: "We found our neighbor kind.",
        question: "우리는 우리 이웃이 친절하다는 것을 알게 되었다.",
        isCorrect: true,
      },
      {
        questionNumber: 5,
        studentAnswer: "They named their son Lucas.",
        correctAnswer: "They named their son Lucas.",
        question: "그들은 그들의 아들을 Lucas라고 이름지었다.",
        isCorrect: true,
      },
      {
        questionNumber: 6,
        studentAnswer: "A lot of homeworks make me busy.",
        correctAnswer: "A lot of homework makes me busy.",
        question: "많은 숙제가 나를 바쁘게 만든다.",
        isCorrect: false,
      },
      {
        questionNumber: 7,
        studentAnswer: "Vitamins keep our bones healthy.",
        correctAnswer: "Vitamin keeps our bones strong.",
        question: "비타민은 우리의 뼈를 건강한 상태로 둔다/유지한다.",
        isCorrect: false,
      },
      {
        questionNumber: 8,
        studentAnswer: "The difficult exam made the students nervous.",
        correctAnswer: "The difficult exam made/makes the students nervous.",
        question: "그 어려운 시험은 그 학생들을 긴장하게 만들었다. (difficult exam/nervous)",
        isCorrect: true,
      },
      {
        questionNumber: 9,
        studentAnswer: "The new recipe will make the food delicious.",
        correctAnswer: "The new recipe will make the food delicious.",
        question: "그 새로운 요리법은 그 음식을 맛있게 만들어줄 것이다. (new recipe)",
        isCorrect: true,
      },
    ],
  };
};
