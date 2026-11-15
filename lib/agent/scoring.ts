import type { FinancialMetrics, RiskTolerance, ScoreBreakdown, Verdict } from './types'

export interface ScoreContext {
  metrics?: FinancialMetrics | null
  newsArticles?: Array<{ sentiment?: number | null; relevanceScore?: number | null }> | null
  competitorData?: Array<{ threatLevel?: number | null }> | null
  sector?: string
  riskTolerance?: RiskTolerance
}

const WEIGHTS = {
  financial: 0.3,
  market: 0.2,
  sentiment: 0.15,
  competition: 0.15,
  risk: 0.2,
} as const

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

function missingMetricCount(metrics: FinancialMetrics | null | undefined): number {
  if (!metrics) return 5
  return Object.values(metrics).filter((value) => value === null || value === undefined).length
}

function scorePe(pe: number | null): number {
  if (pe === null) return 50
  if (pe < 12) return 100
  if (pe > 35) return 20
  return clamp(100 - ((pe - 12) / 23) * 80)
}

function scoreGrowth(growth: number | null): number {
  if (growth === null) return 50
  if (growth > 0.18) return 100
  if (growth < -0.05) return 0
  return clamp(50 + growth * 500)
}

function scoreDebt(debt: number | null): number {
  if (debt === null) return 50
  if (debt < 0.35) return 100
  if (debt > 2.5) return 0
  return clamp(100 - ((debt - 0.35) / 2.15) * 100)
}

function scoreMargin(margin: number | null): number {
  if (margin === null) return 50
  if (margin > 0.45) return 100
  if (margin < 0.08) return 0
  return clamp(((margin - 0.08) / 0.37) * 100)
}

function scoreFcfYield(fcf: number | null): number {
  if (fcf === null) return 50
  if (fcf > 0.04) return 100
  if (fcf < 0) return 0
  return clamp(fcf * 2500)
}

function scoreNewsSentiment(newsArticles?: Array<{ sentiment?: number | null; relevanceScore?: number | null }> | null): number {
  if (!newsArticles || newsArticles.length === 0) return 50
  const weighted = newsArticles.reduce((sum, article) => {
    const relevance = article.relevanceScore ?? 0.5
    const sentiment = article.sentiment ?? 0
    return sum + sentiment * relevance
  }, 0)
  const average = weighted / newsArticles.length
  return clamp(Math.round(50 + average * 40))
}

function scoreCompetition(competitorData?: Array<{ threatLevel?: number | null }> | null): number | null {
  if (!competitorData || competitorData.length === 0) return null
  const averageThreat = competitorData.reduce((sum, item) => sum + (item.threatLevel ?? 0.5), 0) / competitorData.length
  return clamp(Math.round(100 - averageThreat * 30))
}

export function calculateFinancialScore(metrics: FinancialMetrics | null | undefined): number {
  if (!metrics) return 25

  const missingCount = missingMetricCount(metrics)
  const baseSubScores = [
    scorePe(metrics.peRatio) * 0.2,
    scoreGrowth(metrics.revenueGrowthYoY) * 0.2,
    scoreFcfYield(metrics.freeCashFlowYield) * 0.2,
    scoreMargin(metrics.grossMargin) * 0.2,
    scoreDebt(metrics.debtToEquity) * 0.2,
  ]
  const base = Math.round(baseSubScores.reduce((a, b) => a + b, 0))
  const qualityPenalty = Math.min(25, missingCount * 7)
  return clamp(Math.round(base - qualityPenalty), 0, 100)
}

export function applyRiskTolerance(
  compositeScore: number,
  riskTolerance: RiskTolerance = 'moderate'
): Verdict {
  const thresholds = {
    conservative: { buy: 80, hold: 60 },
    moderate: { buy: 70, hold: 45 },
    aggressive: { buy: 55, hold: 35 },
  }
  const { buy, hold } = thresholds[riskTolerance]
  if (compositeScore >= buy) return 'BUY'
  if (compositeScore >= hold) return 'HOLD'
  return 'PASS'
}

export function gateBuyVerdict(
  proposedVerdict: Verdict,
  scoreVerdict: Verdict,
  dataQualityScore: number
): Verdict {
  if (proposedVerdict !== 'BUY') return proposedVerdict
  if (scoreVerdict === 'PASS') return 'PASS'
  if (scoreVerdict !== 'BUY' || dataQualityScore < 0.7) return 'HOLD'
  return 'BUY'
}

export function calculateCompositeScore(scores: Omit<ScoreBreakdown, 'composite'>): ScoreBreakdown {
  const availableDimensions = (Object.entries(scores) as Array<[keyof typeof WEIGHTS, number | null]>)
    .filter((entry): entry is [keyof typeof WEIGHTS, number] => entry[1] !== null)
  const weightedTotal = availableDimensions.reduce(
    (total, [dimension, score]) => total + score * WEIGHTS[dimension],
    0
  )
  const composite = Math.round(weightedTotal)
  return { ...scores, composite }
}

export function buildScoreBreakdown(ticker: string, sector?: string, context?: ScoreContext): ScoreBreakdown {
  const metrics = context?.metrics ?? null
  const financial = calculateFinancialScore(metrics)
  const missingCount = missingMetricCount(metrics)
  const qualityPenalty = Math.min(30, missingCount * 6)

  const sectorBoost = sector?.toLowerCase().includes('tech') ? 8 : 0
  const newsScore = scoreNewsSentiment(context?.newsArticles)
  const competitionScore = scoreCompetition(context?.competitorData)
  const riskPressure = (metrics?.debtToEquity ?? 0.5) * 24 + (newsScore < 50 ? 12 : 0)

  const market = clamp(Math.round(financial * 0.55 + newsScore * 0.25 + sectorBoost * 0.2 + 5 - qualityPenalty * 0.3))
  const sentiment = clamp(Math.round(newsScore * 0.75 + (metrics?.revenueGrowthYoY ?? 0) * 55 + 10 - qualityPenalty * 0.25))
  const competition = competitionScore === null
    ? null
    : clamp(Math.round(competitionScore * 0.85 + (sectorBoost > 0 ? 6 : 0) - qualityPenalty * 0.2))
  const risk = clamp(Math.round(100 - financial * 0.3 - riskPressure - qualityPenalty * 0.5))

  const baseScores = calculateCompositeScore({ financial, market, sentiment, competition, risk })
  const composite = clamp(baseScores.composite - qualityPenalty, 0, 100)

  return {
    ...baseScores,
    composite,
  }
}

export { WEIGHTS }
