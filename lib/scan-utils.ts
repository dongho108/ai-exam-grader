import type { AnswerKeyEntry, ScannedPage, ClassifiedStudent } from '@/types'

/**
 * Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length

  if (m === 0) return n
  if (n === 0) return m

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }

  return dp[m][n]
}

/**
 * 0~1 similarity score (1 = identical).
 */
export function calculateSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1.0
  const maxLen = Math.max(a.length, b.length)
  return 1 - levenshteinDistance(a, b) / maxLen
}

/**
 * Match a title against registered answer keys (80% threshold).
 * Returns the best matching entry or null.
 */
export function matchExamTitle(
  title: string,
  answerKeys: AnswerKeyEntry[],
): AnswerKeyEntry | null {
  if (answerKeys.length === 0) return null

  const THRESHOLD = 0.8
  let bestMatch: AnswerKeyEntry | null = null
  let bestScore = 0

  for (const key of answerKeys) {
    const score = calculateSimilarity(title, key.title)
    if (score >= THRESHOLD && score > bestScore) {
      bestScore = score
      bestMatch = key
    }
  }

  return bestMatch
}

/**
 * Mode A: Group scanned pages by student name + exam title.
 * Pages without a name go into an "unclassified" group.
 */
export function groupPagesByStudent(
  pages: ScannedPage[],
  answerKeys: AnswerKeyEntry[],
): ClassifiedStudent[] {
  const groups = new Map<string, { pages: ScannedPage[]; name: string; className?: string; examTitle: string; answerKeyId: string }>()
  const unclassified: ScannedPage[] = []

  for (const page of pages) {
    if (!page.ocrResult || !page.ocrResult.studentName) {
      unclassified.push(page)
      continue
    }

    const { studentName, examTitle = '', className } = page.ocrResult
    const matchedKey = matchExamTitle(examTitle, answerKeys)
    const answerKeyId = matchedKey?.id ?? ''
    const groupKey = `${studentName}::${examTitle}`

    const existing = groups.get(groupKey)
    if (existing) {
      existing.pages.push(page)
    } else {
      groups.set(groupKey, {
        pages: [page],
        name: studentName,
        className,
        examTitle,
        answerKeyId,
      })
    }
  }

  const result: ClassifiedStudent[] = []

  for (const group of groups.values()) {
    result.push({
      name: group.name,
      className: group.className,
      examTitle: group.examTitle,
      pages: group.pages,
      answerKeyId: group.answerKeyId,
    })
  }

  // Unclassified pages as a single group
  if (unclassified.length > 0) {
    result.push({
      name: '',
      examTitle: '',
      pages: unclassified,
      answerKeyId: '',
    })
  }

  return result
}

/**
 * Mode B: Group pages by fixed count (e.g. every N pages = 1 student).
 */
export function groupPagesByFixedCount(
  pages: ScannedPage[],
  n: number,
): ScannedPage[][] {
  if (pages.length === 0 || n <= 0) return []

  const groups: ScannedPage[][] = []
  for (let i = 0; i < pages.length; i += n) {
    groups.push(pages.slice(i, i + n))
  }
  return groups
}

/**
 * Convert a base64 string to a File object.
 */
export function base64ToFile(
  base64: string,
  name: string,
  mimeType: string,
): File {
  const byteString = atob(base64)
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new File([ab], name, { type: mimeType })
}
