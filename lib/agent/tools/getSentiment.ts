import type { NewsArticle } from '@/lib/agent/state'

const POSITIVE_WORDS = [
  'beat', 'beats', 'upbeat', 'growth', 'strong', 'surge', 'rally', 'record', 'upgrade', 'expansion',
  'profit', 'profitability', 'revenue rise', 'accelerates', 'outperform', 'higher', 'gains', 'launch',
  'innovation', 'demand', 'earnings', 'cash flow', 'positive', 'breakout', 'milestone'
]

const NEGATIVE_WORDS = [
  'miss', 'misses', 'warn', 'warning', 'down', 'decline', 'declines', 'drop', 'drops', 'loss', 'layoff',
  'lawsuit', 'investigation', 'downgrade', 'cut', 'slows', 'sluggish', 'weak', 'volatility', 'risk',
  'margin pressure', 'headwinds', 'concern', 'charge', 'fraud', 'recall', 'delays'
]

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function sentimentFromText(text: string): number {
  const normalized = text.toLowerCase()
  const positiveHits = POSITIVE_WORDS.filter((word) => normalized.includes(word)).length
  const negativeHits = NEGATIVE_WORDS.filter((word) => normalized.includes(word)).length

  const total = positiveHits + negativeHits
  if (total === 0) return 0.08

  const raw = ((positiveHits - negativeHits) / total) * 0.9
  return clamp(raw, -0.9, 0.9)
}

export function getSentiment(articles: NewsArticle[]): number {
  if (articles.length === 0) return 50

  const now = Date.now()
  let weightedSum = 0
  let weightTotal = 0

  for (const article of articles) {
    const age = now - new Date(article.publishedAt).getTime()
    const daysOld = age / 86400000
    const recencyWeight = daysOld <= 7 ? 2.5 : daysOld <= 30 ? 1.4 : 0.8
    const normalizedSentiment = ((article.sentiment + 1) / 2) * 100
    weightedSum += normalizedSentiment * recencyWeight * (article.relevanceScore ?? 0.7)
    weightTotal += recencyWeight * (article.relevanceScore ?? 0.7)
  }

  return weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 50
}

export function articlesFromSearch(
  results: Array<{ title: string; url: string; content: string; publishedAt?: string; score?: number }>
): NewsArticle[] {
  return results.map((r) => {
    const combinedText = `${r.title} ${r.content}`
    const sentiment = sentimentFromText(combinedText)

    return {
      title: r.title,
      url: r.url,
      publishedAt: r.publishedAt || new Date().toISOString(),
      sentiment,
      relevanceScore: clamp(r.score ?? 0.7, 0.2, 1),
      keyQuote: r.content.slice(0, 200),
    }
  })
}
