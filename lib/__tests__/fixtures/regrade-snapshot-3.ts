import type { QuestionResult } from '@/types/grading'

/**
 * 채점 스냅샷 #3 — 다의어/품사 변형 isEdited 5건 + AI false 추가 분석
 *
 * 특징:
 * - isEdited 5건 (5, 6, 10, 23, 31번): 사용자가 의미 차이 있어도 정답 인정
 *   - 5 territory/영역, 6 adapt/적응하다(자타동), 10 embody/나타내다, 23 relaxation/완화, 31 alien/외계인
 * - AI false 6건 중 4건은 다의어로 정답 처리되어야 함
 *   - 15 bound/한계선, 35 grant/허용하다, 36 effectiveness/효율성(복수정답 버그), 39 confirm/승인하다
 *
 * 의도:
 * - v2 프롬프트가 자·타동사 무시, 다의어 인정, 복수 정답 매칭을 일반 규칙으로 처리하는지 검증
 */

export const SNAPSHOT_RESULTS_3: QuestionResult[] = [
  { questionNumber: 1, question: 'boundary', correctAnswer: '경계(선)', studentAnswer: '경계', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 2, question: 'distortion', correctAnswer: '왜곡', studentAnswer: '왜곡', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 3, question: 'whisper', correctAnswer: '속삭이다', studentAnswer: '속삭이다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 4, question: 'highlight', correctAnswer: '부각[강조]하다', studentAnswer: '강조하다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 5, question: 'territory', correctAnswer: '영토', studentAnswer: '영역', isCorrect: true, aiReason: '영역과 영토는 의미 차이 존재', isEdited: true },
  { questionNumber: 6, question: 'adapt', correctAnswer: '적응시키다', studentAnswer: '적응하다', isCorrect: true, aiReason: '자동사와 타동사 차이', isEdited: true },
  { questionNumber: 7, question: 'adapt to', correctAnswer: '~에 적응하다', studentAnswer: '-에 적응하다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 8, question: 'inhabitable', correctAnswer: '사람이 거주 가능한', studentAnswer: '거주할 수 있는', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 9, question: 'foster', correctAnswer: '조성하다', studentAnswer: '조성하다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 10, question: 'embody', correctAnswer: '구현하다', studentAnswer: '나타내다', isCorrect: true, aiReason: '의미 차이', isEdited: true },
  { questionNumber: 11, question: 'cognitive', correctAnswer: '인지의', studentAnswer: '인지의', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 12, question: 'negative', correctAnswer: '부정적인', studentAnswer: '부정적인', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 13, question: 'administration', correctAnswer: '행정 부서', studentAnswer: '행정부서', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 14, question: 'variation', correctAnswer: '변형, 변이', studentAnswer: '변이', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 15, question: 'bound', correctAnswer: '얽매인', studentAnswer: '한계선', isCorrect: false, aiReason: '품사 및 의미 불일치' },
  { questionNumber: 16, question: 'iteration', correctAnswer: '반복', studentAnswer: '반복', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 17, question: 'context', correctAnswer: '(어떤 일의) 맥락, 전후 사정', studentAnswer: '맥락', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 18, question: 'escape', correctAnswer: '도피', studentAnswer: '도피', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 19, question: 'reflect', correctAnswer: '반영하다', studentAnswer: '반영하다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 20, question: 'adaptive', correctAnswer: '적응의', studentAnswer: '적응하는', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 21, question: 'derived from', correctAnswer: '~에서 나온, 유래한', studentAnswer: '-에서 비롯된', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 22, question: 'evaluate', correctAnswer: '평가하다', studentAnswer: '평가하다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 23, question: 'relaxation', correctAnswer: '휴식', studentAnswer: '완화', isCorrect: true, aiReason: '의미 차이', isEdited: true },
  { questionNumber: 24, question: 'perception', correctAnswer: '인식', studentAnswer: '인식', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 25, question: 'interconnectedness', correctAnswer: '상호 연결성', studentAnswer: '상호연결성', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 26, question: 'normative', correctAnswer: '규범의, 규범적인', studentAnswer: '규범의', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 27, question: 'self-esteem', correctAnswer: '자존감', studentAnswer: '자존감', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 28, question: 'intention', correctAnswer: '의도', studentAnswer: '의도', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 29, question: 'priority', correctAnswer: '우선순위', studentAnswer: '우선순위', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 30, question: 'prior knowledge', correctAnswer: '배경 지식', studentAnswer: '사전지식', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 31, question: 'alien', correctAnswer: '외국인, 이방인', studentAnswer: '외계인', isCorrect: true, aiReason: '의미 차이', isEdited: true },
  { questionNumber: 32, question: 'activate', correctAnswer: '활성화하다', studentAnswer: '활성화하다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 33, question: 'crucial', correctAnswer: '중요한', studentAnswer: '중요한', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 34, question: 'objective', correctAnswer: '목적', studentAnswer: '목적', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 35, question: 'grant', correctAnswer: '보조금', studentAnswer: '허용하다', isCorrect: false, aiReason: '품사 및 의미 불일치' },
  { questionNumber: 36, question: 'effectiveness', correctAnswer: '효과, 효율성', studentAnswer: '효율성', isCorrect: false, aiReason: '효율성과 효과는 다른 의미' },
  { questionNumber: 37, question: 'anthropological', correctAnswer: '인류학적인', studentAnswer: '인류학의', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 38, question: 'perspective', correctAnswer: '관점, 시각', studentAnswer: '관점', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 39, question: 'confirm', correctAnswer: '확인하다', studentAnswer: '승인하다', isCorrect: false, aiReason: '의미 차이' },
  { questionNumber: 40, question: 'yield', correctAnswer: '생기게 하다, 생산하다', studentAnswer: '생산하다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 41, question: 'cast aside', correctAnswer: '~을 버리다, 제쳐 놓다', studentAnswer: '버리다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 42, question: 'evaluate', correctAnswer: '평가하다', studentAnswer: '평가하다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 43, question: 'comprehension', correctAnswer: '이해력', studentAnswer: '이해력', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 44, question: 'stress', correctAnswer: '강조하다', studentAnswer: '강조하다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 45, question: 'give the appearance of', correctAnswer: '~인 것처럼 보이다', studentAnswer: '나타나다', isCorrect: false, aiReason: '의미 차이' },
  { questionNumber: 46, question: 'diverse', correctAnswer: '다양한', studentAnswer: '다양한', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 47, question: 'multiple', correctAnswer: '여러, 다수의', studentAnswer: '다수의', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 48, question: 'come up with', correctAnswer: '~을 생각해 내다', studentAnswer: '생각해내다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 49, question: 'conductor', correctAnswer: '지휘자', studentAnswer: '지휘자', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 50, question: 'approximately', correctAnswer: '거의', studentAnswer: '거의', isCorrect: true, aiReason: '의미 일치' },
]

/**
 * v2 프롬프트가 자동 정답 처리해야 할 케이스 (다의어/품사/복수 정답).
 * isEdited 5건 + AI false 4건 = 9건.
 */
export const SHOULD_FLIP_TO_CORRECT_3: number[] = [5, 6, 10, 23, 31, 15, 35, 36, 39]

/**
 * 그대로 오답 유지해야 할 케이스 (명백한 의미 차이).
 */
export const SHOULD_STAY_INCORRECT_3: number[] = [45]
