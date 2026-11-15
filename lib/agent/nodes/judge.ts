import type { InvestmentAnalysisState } from '@/lib/agent/state'
import { applyRiskTolerance, gateBuyVerdict } from '@/lib/agent/scoring'
import { callStructuredLLM } from '@/lib/agent/llm'
import { VerdictSchema } from '@/lib/agent/schemas'
import { judgePrompt } from '@/lib/agent/prompts'
import { makeAgentOutput, makeThought, stateInput } from './helpers'
import { emitThought } from '@/lib/agent/event-bus'
import type { z } from 'zod'
import type { Verdict } from '@/lib/agent/types'

export async function judgeNode(state: InvestmentAnalysisState): Promise<Partial<InvestmentAnalysisState>> {
  const start = Date.now()
  emitThought(state.analysisId, 'Judge', 'running', 'Weighing bull vs bear evidence...')
  const input = stateInput(state)
  const bullText = state.bullCase.map((p) => p.point).join('\n')
  const bearText = state.bearCase.map((p) => p.point).join('\n')

  const qualityScore = Math.min(1, Math.max(0.15, state.dataQualityScore ?? 0.5))
  const adjustedScore = Math.max(0, Math.min(100, state.compositeScore - (1 - qualityScore) * 25))
  const scoreVerdict = applyRiskTolerance(adjustedScore, state.riskTolerance)
  const fallbackVerdict: Verdict = gateBuyVerdict(scoreVerdict, scoreVerdict, qualityScore)
  const fallbackConfidence = Math.min(82, Math.round(adjustedScore * 0.8 + (qualityScore * 10)))

  const fallback = () => ({
    verdict: fallbackVerdict,
    confidenceScore: fallbackConfidence,
    reasoning: `The verdict for ${state.companyName} (${state.ticker}) was based on the weighted evidence quality available. With a data quality score of ${Math.round(qualityScore * 100)}/100 and a composite score of ${Math.round(adjustedScore)}/100, the evidence supports a ${fallbackVerdict} only when the company-specific signal is strong enough and not weakened by missing data or low-quality research.`,
    bullPointsUsed: state.bullCase.map((_, i) => i + 1),
    bearPointsUsed: state.bearCase.map((_, i) => i + 1),
    contestedPoints: [] as string[],
  })

  const result = await callStructuredLLM<z.infer<typeof VerdictSchema>>(
    'judge',
    judgePrompt(state.companyName, state.ticker, bullText, bearText, state.compositeScore, state.riskTolerance),
    `Bull:\n${bullText}\n\nBear:\n${bearText}`,
    VerdictSchema,
    fallback
  )

  const verdict = gateBuyVerdict(result.verdict, scoreVerdict, qualityScore)
  const confidenceScore = Math.min(
    result.confidenceScore,
    Math.round(qualityScore * 100),
    verdict === result.verdict ? 95 : 60
  )
  const reasoning = verdict === result.verdict
    ? result.reasoning
    : `${result.reasoning.slice(0, 300)} The BUY rating was capped at ${verdict} because the evidence-adjusted score or data quality did not meet the configured BUY threshold.`

  const agent = makeAgentOutput(
    'Judge',
    'judge',
    input,
    reasoning,
    confidenceScore / 100,
    Date.now() - start
  )

  emitThought(state.analysisId, 'Judge', 'complete', `Verdict: ${verdict} (${confidenceScore}%)`, agent.executionTimeMs)

  return {
    verdict,
    confidenceScore,
    reasoning,
    agents: [agent],
    thoughtEvents: [
      makeThought('Judge', 'running', 'Weighing bull vs bear evidence...'),
      makeThought('Judge', 'complete', `Verdict: ${verdict} (${confidenceScore}%)`, agent.executionTimeMs),
    ],
  }
}
