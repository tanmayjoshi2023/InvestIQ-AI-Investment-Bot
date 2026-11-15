import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildScoreBreakdown,
  calculateFinancialScore,
  gateBuyVerdict,
} from '../lib/agent/scoring'
import type { FinancialMetrics } from '../lib/agent/types'

const completeMetrics: FinancialMetrics = {
  peRatio: 20,
  revenueGrowthYoY: 0.15,
  debtToEquity: 0.5,
  grossMargin: 0.4,
  freeCashFlowYield: 0.03,
}

test('unavailable metrics score the same as five explicitly missing metrics', () => {
  const allMissing: FinancialMetrics = {
    peRatio: null,
    revenueGrowthYoY: null,
    debtToEquity: null,
    grossMargin: null,
    freeCashFlowYield: null,
  }

  assert.equal(calculateFinancialScore(null), calculateFinancialScore(allMissing))
  assert.ok(calculateFinancialScore(null) < calculateFinancialScore(completeMetrics))
})

test('score breakdown is deterministic for the same evidence inputs', () => {
  const context = {
    metrics: completeMetrics,
    newsArticles: [
      { sentiment: 0.4, relevanceScore: 0.8 },
      { sentiment: -0.2, relevanceScore: 0.6 },
    ],
    competitorData: [{ threatLevel: 3 }, { threatLevel: 6 }],
  }

  assert.deepEqual(
    buildScoreBreakdown('TEST', 'Technology', context),
    buildScoreBreakdown('TEST', 'Technology', context)
  )
})

test('BUY requires both a BUY-level score and sufficient data quality', () => {
  assert.equal(gateBuyVerdict('BUY', 'BUY', 0.9), 'BUY')
  assert.equal(gateBuyVerdict('BUY', 'BUY', 0.69), 'HOLD')
  assert.equal(gateBuyVerdict('BUY', 'HOLD', 0.9), 'HOLD')
  assert.equal(gateBuyVerdict('BUY', 'PASS', 1), 'PASS')
  assert.equal(gateBuyVerdict('HOLD', 'BUY', 0.2), 'HOLD')
})

test('missing competitor evidence produces no competitor score and is excluded from the composite', () => {
  const scores = buildScoreBreakdown('TEST', 'Technology', {
    metrics: completeMetrics,
    newsArticles: [],
    competitorData: [],
  })
  const fixedWeightContribution = Math.round(
    scores.financial * 0.3 + scores.market * 0.2 + scores.sentiment * 0.15 + scores.risk * 0.2
  )

  assert.equal(scores.competition, null)
  assert.equal(scores.composite, fixedWeightContribution)
})