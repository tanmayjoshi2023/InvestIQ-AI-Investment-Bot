import type { InvestmentAnalysisState } from '@/lib/agent/state'
import { callStructuredLLM } from '@/lib/agent/llm'
import { BullCaseSchema } from '@/lib/agent/schemas'
import { bullPrompt } from '@/lib/agent/prompts'
import { buildContextSummary, makeAgentOutput, makeThought, stateInput } from './helpers'
import { emitThought } from '@/lib/agent/event-bus'

export async function bullNode(state: InvestmentAnalysisState): Promise<Partial<InvestmentAnalysisState>> {
  const start = Date.now()
  emitThought(state.analysisId, 'Bull Case', 'running', 'Constructing bull arguments...')
  const input = stateInput(state)
  const context = buildContextSummary(state)

  const fallback = () => {
    const metrics = state.financialMetrics
    const points: Array<{ point: string; sourceIndex: number; specificity: number }> = []

    if (metrics?.revenueGrowthYoY !== null && metrics?.revenueGrowthYoY !== undefined) {
      points.push({
        point: `${state.companyName} has revenue growth of ${(metrics.revenueGrowthYoY * 100).toFixed(1)}%, which supports expansion momentum if the trend remains intact [source: 1]`,
        sourceIndex: 1,
        specificity: 5,
      })
    }
    if (metrics?.grossMargin !== null && metrics?.grossMargin !== undefined) {
      points.push({
        point: `Gross margin of ${(metrics.grossMargin * 100).toFixed(1)}% indicates operating leverage or pricing power in ${state.sector} [source: 1]`,
        sourceIndex: 1,
        specificity: 5,
      })
    }
    if (state.sentimentScore >= 55) {
      points.push({
        point: `Recent sentiment is constructive at ${state.sentimentScore}/100, suggesting the market is responding positively to ${state.companyName}'s operating outlook [source: 2]`,
        sourceIndex: 2,
        specificity: 4,
      })
    }
    if (state.competitionScore !== null && state.competitionScore >= 60) {
      points.push({
        point: `The competitive profile is favorable, with the model estimating a competition score of ${state.competitionScore}/100 and indicating relative market positioning [source: 3]`,
        sourceIndex: 3,
        specificity: 4,
      })
    }

    if (points.length === 0) {
      points.push({
        point: `The current evidence base for ${state.companyName} is limited, so the bullish case is intentionally conservative and based only on the available signals rather than unsupported assumptions [source: 0]`,
        sourceIndex: 0,
        specificity: 2,
      })
    }

    return {
      points: points.slice(0, 5),
      bullConfidence: Math.min(70, Math.max(35, state.compositeScore)),
    }
  }

  const result = await callStructuredLLM(
    'bull',
    bullPrompt(state.companyName, state.ticker, context),
    context,
    BullCaseSchema,
    fallback
  )

  const output = result.points.map((p) => p.point).join('\n')
  const agent = makeAgentOutput('Bull Case', 'bull', input, output, result.bullConfidence / 100, Date.now() - start)

  emitThought(state.analysisId, 'Bull Case', 'complete', `${result.points.length} bull points ready`, agent.executionTimeMs)

  return {
    bullCase: result.points,
    bullConfidence: result.bullConfidence,
    agents: [agent],
    thoughtEvents: [
      makeThought('Bull Case', 'running', 'Constructing bull arguments...'),
      makeThought('Bull Case', 'complete', `${result.points.length} bull points ready`, agent.executionTimeMs),
    ],
  }
}
