import { describe, it, expect, vi, beforeAll } from 'vitest'

// Stub Deno global so GeminiProvider constructor doesn't throw
beforeAll(() => {
  ;(globalThis as any).Deno = {
    env: { get: vi.fn().mockReturnValue('test-api-key') },
  }
})

describe('GeminiProvider.parseResult', () => {
  async function getProvider() {
    const mod = await import('../gemini')
    return new mod.GeminiProvider()
  }

  it('examTitle이 정상 포함되는 경우', async () => {
    const provider = await getProvider()
    const json = JSON.stringify({
      studentName: '홍길동',
      examTitle: '초6A - 능률보카 실력 5,6',
      className: 'A반',
      answers: { '1': '①', '2': '③' },
      totalQuestions: 2,
    })

    const result = (provider as any).parseResult(json)
    expect(result.examTitle).toBe('초6A - 능률보카 실력 5,6')
    expect(result.className).toBe('A반')
    expect(result.studentName).toBe('홍길동')
    expect(result.answers).toEqual({ 1: '①', 2: '③' })
    expect(result.totalQuestions).toBe(2)
  })

  it('examTitle이 없으면 빈 문자열 폴백', async () => {
    const provider = await getProvider()
    const json = JSON.stringify({
      studentName: '김철수',
      answers: { '1': '②' },
      totalQuestions: 1,
    })

    const result = (provider as any).parseResult(json)
    expect(result.examTitle).toBe('')
  })

  it('className이 없으면 undefined', async () => {
    const provider = await getProvider()
    const json = JSON.stringify({
      studentName: '이영희',
      answers: { '1': '④' },
      totalQuestions: 1,
    })

    const result = (provider as any).parseResult(json)
    expect(result.className).toBeUndefined()
  })

  it('```json 코드블록 래핑된 응답도 파싱', async () => {
    const provider = await getProvider()
    const text = '```json\n' + JSON.stringify({
      studentName: '박수진',
      examTitle: '수학 중간고사',
      answers: { '1': '①' },
      totalQuestions: 1,
    }) + '\n```'

    const result = (provider as any).parseResult(text)
    expect(result.examTitle).toBe('수학 중간고사')
    expect(result.studentName).toBe('박수진')
  })

  it('studentName이 없으면 "학생" 폴백', async () => {
    const provider = await getProvider()
    const json = JSON.stringify({
      examTitle: '영어 기말',
      answers: { '1': '③' },
      totalQuestions: 1,
    })

    const result = (provider as any).parseResult(json)
    expect(result.studentName).toBe('학생')
  })
})
