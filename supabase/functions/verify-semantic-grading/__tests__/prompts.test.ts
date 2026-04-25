import { describe, it, expect } from 'vitest'
import { getGradingPrompt } from '../prompts'

describe('getGradingPrompt — 구조', () => {
  it('lenient와 standard 프롬프트는 공통 섹션(입력 형식, 복수 정답 |||, 괄호 보충설명)을 모두 포함한다', () => {
    const standard = getGradingPrompt('standard')
    const lenient = getGradingPrompt('lenient')

    for (const prompt of [standard, lenient]) {
      expect(prompt).toContain('questions 배열')
      expect(prompt).toContain('|||')
      expect(prompt).toContain('괄호')
      expect(prompt).toContain('(미작성)')
      expect(prompt).toContain('(판독불가)')
    }
  })

  it('lenient와 standard 프롬프트 모두 출력 JSON 형식 예시(isCorrect, reason)를 포함한다', () => {
    const standard = getGradingPrompt('standard')
    const lenient = getGradingPrompt('lenient')

    for (const prompt of [standard, lenient]) {
      expect(prompt).toContain('isCorrect')
      expect(prompt).toContain('reason')
      expect(prompt).toContain('results')
    }
  })

  it('공통 섹션 문구는 두 프롬프트에서 동일하다 (drift 방지)', () => {
    const standard = getGradingPrompt('standard')
    const lenient = getGradingPrompt('lenient')

    const commonAnchors = [
      '당신은 시험 채점 전문가입니다',
      '## 입력 형식',
      '## 출력 형식',
      '반드시 아래 JSON 형식',
    ]

    for (const anchor of commonAnchors) {
      expect(standard).toContain(anchor)
      expect(lenient).toContain(anchor)
    }
  })

  it('기본값은 standard 프롬프트를 반환한다', () => {
    expect(getGradingPrompt()).toBe(getGradingPrompt('standard'))
  })
})

describe('getGradingPrompt — standard 전용 규칙', () => {
  const standard = getGradingPrompt('standard')

  it('"언어 일치 필수" 문구를 포함한다', () => {
    expect(standard).toContain('언어 일치 필수')
  })

  it('품사 불일치 원칙 오답 규칙을 포함한다', () => {
    expect(standard).toMatch(/품사.*(다르|불일치)/)
  })

  it('관대 전용 문구("사전 번역어", "한↔영", "사역/피동")를 포함하지 않는다', () => {
    expect(standard).not.toContain('사전 번역어')
    expect(standard).not.toContain('한↔영')
    expect(standard).not.toContain('사역/피동')
    expect(standard).not.toContain('자동사/타동사')
  })

  it('lenient few-shot 다의어 예시(adapt, effectiveness)를 포함하지 않는다', () => {
    expect(standard).not.toContain('adapt')
    expect(standard).not.toContain('effectiveness')
  })
})

describe('getGradingPrompt — lenient 전용 규칙', () => {
  const lenient = getGradingPrompt('lenient')

  it('관대 모드 공통 규칙(동의어, 품사 차이 허용, 자·타동사 무시, 사역/피동 무시, 부분 답안)을 포함한다', () => {
    expect(lenient).toContain('동의어')
    expect(lenient).toContain('자동사/타동사')
    expect(lenient).toContain('사역/피동')
    expect(lenient).toMatch(/부분 답안|부분.*핵심 개념/)
  })

  it('한↔영 번역 양방향 적용 조건을 명시한다', () => {
    // 한국어 → 영어 방향
    expect(lenient).toMatch(/문제.*한국어.*정답.*영어/)
    // 영어 → 한국어 방향
    expect(lenient).toMatch(/문제.*영어.*정답.*한국어/)
  })

  it('"최우선" 또는 동등한 우선순위 override 문구를 포함한다', () => {
    expect(lenient).toMatch(/최우선|우선합니다/)
  })

  it('"사전" 기반 판단 문구(영한/한영 사전)를 포함한다', () => {
    expect(lenient).toMatch(/영한|한영|사전/)
    expect(lenient).toContain('사전 번역어')
  })

  it('"다른 영단어의 번역어" 가드 문구를 포함한다 (오답 판정 기준)', () => {
    expect(lenient).toContain('다른 영단어의 번역어')
  })

  it('의미장(semantic field) 표현 인정 규칙을 포함한다', () => {
    expect(lenient).toContain('의미장')
    expect(lenient).toMatch(/semantic field|의미장/)
  })

  it('스냅샷 기반 의미장 일치 긍정 예시(monetary, adapt to)를 포함한다', () => {
    expect(lenient).toContain('monetary')
    expect(lenient).toMatch(/돈\s*위주/)
    expect(lenient).toContain('adapt to')
    expect(lenient).toMatch(/익숙해지/)
  })

  it('다른 영단어 번역어 부정 예시(cumulative→계산적인=calculating, authority→관객=audience)를 포함한다', () => {
    expect(lenient).toContain('cumulative')
    expect(lenient).toContain('calculating')
    expect(lenient).toContain('authority')
    expect(lenient).toContain('audience')
    expect(lenient).toContain('justify')
    expect(lenient).toContain('define')
  })

  it('의미장 판단 가이드(학생 답안을 영어로 역추적) 문구를 포함한다', () => {
    expect(lenient).toMatch(/영어로 옮겨|영어로 역추적|어떤 영단어/)
  })

  it('다의어 긍정 예시(adapt + 적응하다 정답일치)를 포함한다', () => {
    expect(lenient).toContain('adapt')
    expect(lenient).toContain('적응하다')
  })

  it('다의어 긍정 예시(adapt의 또 다른 사전 번역어 "각색하다" 인정)를 포함한다', () => {
    expect(lenient).toContain('각색하다')
    expect(lenient).toMatch(/adapt.*또 다른.*번역어|각색하다.*adapt/)
  })

  it('다의어 긍정 예시(effectiveness + 유효성/실효성 인정)를 포함한다', () => {
    expect(lenient).toContain('effectiveness')
    expect(lenient).toContain('유효성')
    expect(lenient).toContain('실효성')
  })

  it('부정 예시(무관어 "먹다", "속도" 등 → 오답)를 명시한다', () => {
    expect(lenient).toMatch(/먹다|속도/)
    expect(lenient).toContain('오답')
    expect(lenient).toMatch(/사전 번역어 아님|번역어 불일치/)
  })

  it('오타·사전 미등재는 오답이라는 가드 문구를 포함한다 (예: adaptt)', () => {
    expect(lenient).toMatch(/사전 미등재|미등재/)
    expect(lenient).toContain('adaptt')
  })

  it('standard 전용 문구("언어 일치 필수")를 포함하지 않는다', () => {
    expect(lenient).not.toContain('언어 일치 필수')
  })

  it('회귀 방지: 이전 잘못된 표현 "등재된 실제 영단어"를 포함하지 않는다', () => {
    expect(lenient).not.toContain('등재된 실제 영단어')
  })

  it('회귀 방지: 이전 잘못된 표현 "정답지의 단어와 의미가 전혀 달라도"를 포함하지 않는다', () => {
    expect(lenient).not.toContain('정답지의 단어와 의미가 전혀 달라도')
    expect(lenient).not.toContain('의미가 전혀 달라도')
  })

  it('회귀 방지: 이전 잘못된 banana → apple 긍정 예시 매핑이 없다', () => {
    // "banana"라는 단어가 학생 답안으로 정답 처리되는 예시는 없어야 함
    // 단어 자체는 다른 맥락(예: 부정 예시)으로 등장 가능하지만
    // "정답 \"apple\", 학생 \"banana\" → isCorrect: true" 같은 양성 매핑은 금지
    expect(lenient).not.toMatch(/정답 "apple", 학생 "banana".*true/s)
    expect(lenient).not.toMatch(/banana.*영어 사전 단어/)
  })
})
