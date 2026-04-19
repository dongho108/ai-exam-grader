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

    // 공통 프롬프트에 들어가야 할 anchor 문구들
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

  it('관대 전용 문구("영어 사전", "한↔영", "사역/피동")를 포함하지 않는다', () => {
    expect(standard).not.toContain('영어 사전')
    expect(standard).not.toContain('한↔영')
    expect(standard).not.toContain('사역/피동')
    expect(standard).not.toContain('자동사/타동사')
  })

  it('few-shot 영단어 예시(banana)를 포함하지 않는다', () => {
    expect(standard).not.toContain('banana')
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

  it('"영어 사전" 문구를 포함한다', () => {
    expect(lenient).toContain('영어 사전')
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

  it('정답지의 단어와 의미가 달라도 정답 인정 override 문구를 포함한다', () => {
    expect(lenient).toMatch(/(정답지|정답).*의미.*(달라|다르)/)
  })

  it('few-shot 예시(banana, apple)를 포함한다', () => {
    expect(lenient).toContain('banana')
    expect(lenient).toContain('apple')
  })

  it('오타·사전 미등재는 오답이라는 가드 문구를 포함한다', () => {
    expect(lenient).toMatch(/사전.*미등재|존재하지 않는 철자|무의미한 문자열/)
  })

  it('standard 전용 문구("언어 일치 필수")를 포함하지 않는다', () => {
    expect(lenient).not.toContain('언어 일치 필수')
  })
})
