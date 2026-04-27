import type { QuestionResult } from '@/types/grading'

/**
 * 채점 스냅샷 #2 — 다의어 누락 케이스 모음 (사용자 제보, isEdited 없음)
 *
 * 특징:
 * - 50문항 중 18건이 AI에서 false 판정
 * - 그 중 다수는 정답지가 부수적 의미만 적혀 있고, 학생이 단어의 1차 의미로 답한 케이스
 *   → v2 프롬프트의 "다의어 사전 번역어 모두 인정" 규칙으로 대부분 정답 처리되어야 함
 *
 * 의도:
 * - 케이스별 few-shot 없이 일반 규칙으로 다의어를 잡는지 회귀 검증
 */

export const SNAPSHOT_RESULTS_2: QuestionResult[] = [
  { questionNumber: 1, question: 'in question', correctAnswer: '해당하는', studentAnswer: '해당하는', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 2, question: 'standard', correctAnswer: '기준', studentAnswer: '기준', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 3, question: 'have no choice but to', correctAnswer: '~하지 않을 수 없다', studentAnswer: '~하지 않을수 없다', isCorrect: true, aiReason: '띄어쓰기 무시, 의미 일치' },
  { questionNumber: 4, question: 'typically', correctAnswer: '일반적으로', studentAnswer: '전형적으로', isCorrect: true, aiReason: '유의어 인정' },
  { questionNumber: 5, question: 'deliberately', correctAnswer: '일부러, 고의로', studentAnswer: '의도적으로', isCorrect: true, aiReason: '유의어 인정' },
  { questionNumber: 6, question: 'prime', correctAnswer: '준비시키다', studentAnswer: '준비시키다', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 7, question: 'accidental', correctAnswer: '우연한', studentAnswer: '사고의, 갑작스러운', isCorrect: false, aiReason: '의미 불일치' },
  { questionNumber: 8, question: 'jumping-off point', correctAnswer: '발판', studentAnswer: '발판', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 9, question: 'plate', correctAnswer: '(금속 따위의) 판', studentAnswer: '접시', isCorrect: false, aiReason: '의미 불일치' },
  { questionNumber: 10, question: 'insure', correctAnswer: '보장하다, 보증하다', studentAnswer: '확신하다', isCorrect: false, aiReason: '의미 불일치' },
  { questionNumber: 11, question: 'connection', correctAnswer: '환승', studentAnswer: '환승', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 12, question: 'liberation', correctAnswer: '해방', studentAnswer: '해방', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 13, question: 'adapt to', correctAnswer: '~에 적응하다', studentAnswer: '적응하다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 14, question: 'bombard', correctAnswer: '(폭탄처럼) 쏟아붓다', studentAnswer: '쏟아붓다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 15, question: 'vanish', correctAnswer: '사라지다', studentAnswer: '사라지다', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 16, question: 'perhaps', correctAnswer: '아마도', studentAnswer: '아마도', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 17, question: 'novelty', correctAnswer: '참신성', studentAnswer: '참신성', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 18, question: 'joint', correctAnswer: '공동의', studentAnswer: '공동의', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 19, question: 'facility', correctAnswer: '(생활의 편의를 위한) 시설', studentAnswer: '시설', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 20, question: 'acceptance', correctAnswer: '수용', studentAnswer: '수용', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 21, question: 'presence', correctAnswer: '존재', studentAnswer: '존재', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 22, question: 'cut down', correctAnswer: '무시하다, 깎아내리다', studentAnswer: '깎아내리다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 23, question: 'consume', correctAnswer: '먹다, 소비하다', studentAnswer: '소비하다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 24, question: 'on the ground that', correctAnswer: '~이라는 근거로', studentAnswer: '~라는 근거로', isCorrect: true, aiReason: '조사 차이 무시' },
  { questionNumber: 25, question: 'clumsy', correctAnswer: '어설픈', studentAnswer: '애매한', isCorrect: false, aiReason: '의미 불일치' },
  { questionNumber: 26, question: 'cause', correctAnswer: '대의(명분)', studentAnswer: '원인', isCorrect: false, aiReason: '의미 불일치' },
  { questionNumber: 27, question: 'adverse', correctAnswer: '불리한, 불운한', studentAnswer: '불리한', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 28, question: 'term', correctAnswer: '용어', studentAnswer: '용어', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 29, question: 'architecture', correctAnswer: '건축학', studentAnswer: '건축', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 30, question: 'previously', correctAnswer: '이전에', studentAnswer: '이전의', isCorrect: false, aiReason: '품사 불일치' },
  { questionNumber: 31, question: 'institution', correctAnswer: '제도', studentAnswer: '평판', isCorrect: false, aiReason: '의미 불일치' },
  { questionNumber: 32, question: 'halt', correctAnswer: '중단하다', studentAnswer: '그만두다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 33, question: 'confusion', correctAnswer: '혼란', studentAnswer: '혼란', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 34, question: 'disclosure', correctAnswer: '공개', studentAnswer: '숨김', isCorrect: false, aiReason: '의미 반대' },
  { questionNumber: 35, question: 'dynamics', correctAnswer: '역학 관계', studentAnswer: '역학 관계', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 36, question: 'deficiency', correctAnswer: '결함', studentAnswer: '결함', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 37, question: 'transport', correctAnswer: '운송하다, 운반하다', studentAnswer: '보내다', isCorrect: false, aiReason: '의미 불일치' },
  { questionNumber: 38, question: 'potential', correctAnswer: '잠재적인', studentAnswer: '잠재적인', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 39, question: 'collaboration', correctAnswer: '협력', studentAnswer: '조화, 협업', isCorrect: true, aiReason: '유의어 인정' },
  { questionNumber: 40, question: 'illustrate', correctAnswer: '입증하다, 분명히 보여 주다', studentAnswer: '설명하다', isCorrect: false, aiReason: '의미 불일치' },
  { questionNumber: 41, question: 'accumulation', correctAnswer: '축적', studentAnswer: '축적', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 42, question: 'predictable', correctAnswer: '예측 가능한', studentAnswer: '예측 가능한', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 43, question: 'sensation', correctAnswer: '감정, 기분', studentAnswer: '감각', isCorrect: false, aiReason: '의미 불일치' },
  { questionNumber: 44, question: 'self-sufficiency', correctAnswer: '자급자족', studentAnswer: '자급자족', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 45, question: 'chart', correctAnswer: '보여 주다, 나타내다', studentAnswer: '보여주다', isCorrect: true, aiReason: '의미 일치' },
  { questionNumber: 46, question: 'apply', correctAnswer: '적용하다', studentAnswer: '신청하다', isCorrect: false, aiReason: '의미 불일치' },
  { questionNumber: 47, question: 'yield', correctAnswer: '수확(량)', studentAnswer: '생산량', isCorrect: false, aiReason: '의미 불일치' },
  { questionNumber: 48, question: 'extent', correctAnswer: '정도, 규모', studentAnswer: '강도', isCorrect: false, aiReason: '의미 불일치' },
  { questionNumber: 49, question: 'odds', correctAnswer: '가능성', studentAnswer: '가능성', isCorrect: true, aiReason: '정답 일치' },
  { questionNumber: 50, question: 'exemplify', correctAnswer: '예를 들어 보여 주다', studentAnswer: '예를 들다', isCorrect: true, aiReason: '의미 일치' },
]

/**
 * 이 스냅샷에서 v2 프롬프트가 정답으로 뒤집어 줘야 할 케이스 (다의어 사전 번역어).
 * 기준: 학생 답안이 question 영단어의 사전 등재 다의어 중 하나에 해당.
 */
export const SHOULD_FLIP_TO_CORRECT_2: number[] = [9, 26, 30, 40, 43, 46, 47]

/**
 * 그대로 오답 유지해야 할 케이스 (다른 영단어와 혼동/반대 의미/명백 무관).
 */
export const SHOULD_STAY_INCORRECT_2: number[] = [10, 25, 31, 34, 37, 48, 7]
