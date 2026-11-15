import type { InvestmentAnalysisState } from '@/lib/agent/state'
import { callStructuredLLM } from '@/lib/agent/llm'
import { BearCaseSchema } from '@/lib/agent/schemas'
import { bearPrompt } from '@/lib/agent/prompts'
import { buildContextSummary, makeAgentOutput, makeThought, stateInput } from './helpers'
import { emitThought } from '@/lib/agent/event-bus'

export async function bearNode(state: InvestmentAnalysisState): Promise<Partial<InvestmentAnalysisState>> {
  const start = Date.now()
  emitThought(state.analysisId, 'Bear Case', 'running', 'Constructing bear arguments...')
  const input = stateInput(state)
  const context = buildContextSummary(state)

  const fallback = () => {
    const metrics = state.financialMetrics
    const points: Array<{ point: string; sourceIndex: number; severity: number }> = []

    if (metrics?.debtToEquity !== null && metrics?.debtToEquity !== undefined && metrics.debtToEquity > 1.5) {
      points.push({
        point: `Debt to equity of ${metrics.debtToEquity.toFixed(2)} raises leverage risk and reduces downside protection if earnings soften [source: 1]`,
        sourceIndex: 1,
        severity: 5,
      })
    }
    if (metrics?.revenueGrowthYoY !== null && metrics?.revenueGrowthYoY !== undefined && metrics.revenueGrowthYoY < 0) {
      points.push({
        point: `Revenue growth is negative at ${(metrics.revenueGrowthYoY * 100).toFixed(1)}%, indicating a weak top-line trend that could pressure margins and valuation [source: 1]`,
        sourceIndex: 1,
        severity: 5,
      })
    }
    if (state.sentimentScore < 45) {
      points.push({
        point: `The sentiment signal is weak at ${state.sentimentScore}/100, which may reflect broader market skepticism rather than genuine operating strength [source: 2]`,
        sourceIndex: 2,
        severity: 4,
      })
    }
    if (state.riskScore >= 60) {
      points.push({
        point: `A risk score of ${state.riskScore}/100 shows elevated macro or execution sensitivity, which can quickly reduce the investment case if fundamentals worsen [source: 2]`,
        sourceIndex: 2,
        severity: 4,
      })
    }

    if (points.length === 0) {
      points.push({
        point: `The evidence base for ${state.companyName} is incomplete, so the bear case is intentionally conservative and limited to known risk factors rather than speculative assumptions [source: 0]`,
        sourceIndex: 0,
        severity: 3,
      })
    }

    return {
      points: points.slice(0, 5),
      bearConfidence: Math.min(72, Math.max(30, 100 - state.compositeScore)),
    }
  }

  const result = await callStructuredLLM(
    'bear',
    bearPrompt(state.companyName, state.ticker, context),
    context,
    BearCaseSchema,
    fallback
  )

  const output = result.points.map((p) => p.point).join('\n')
  const agent = makeAgentOutput('Bear Case', 'bear', input, output, result.bearConfidence / 100, Date.now() - start)

  emitThought(state.analysisId, 'Bear Case', 'complete', `${result.points.length} bear points ready`, agent.executionTimeMs)

  return {
    bearCase: result.points,
    bearConfidence: result.bearConfidence,
    agents: [agent],
    thoughtEvents: [
      makeThought('Bear Case', 'running', 'Constructing bear arguments...'),
      makeThought('Bear Case', 'complete', `${result.points.length} bear points ready`, agent.executionTimeMs),
    ],
  }
}
