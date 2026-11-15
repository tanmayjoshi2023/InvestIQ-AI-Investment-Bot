import type { InvestmentAnalysisState } from '@/lib/agent/state'
import { makeAgentOutput, makeThought, stateInput } from './helpers'
import { emitThought } from '@/lib/agent/event-bus'

/** No validated peer evidence provider is configured, so no competitor score is emitted. */
export async function competitorNode(state: InvestmentAnalysisState): Promise<Partial<InvestmentAnalysisState>> {
  const start = Date.now()
  emitThought(state.analysisId, 'Competitor Analyst', 'running', 'Analyzing competitive landscape...')
  const input = stateInput(state)
  const output = 'Competitor analysis unavailable: search results are not a validated peer set. No competitor score was assigned.'
  const agent = makeAgentOutput('Competitor Analyst', 'competitor', input, output, 0, Date.now() - start)

  emitThought(state.analysisId, 'Competitor Analyst', 'complete', output, agent.executionTimeMs)

  return {
    competitorData: [],
    competitionScore: null,
    agents: [agent],
    thoughtEvents: [
      makeThought('Competitor Analyst', 'running', 'Analyzing competitive landscape...'),
      makeThought('Competitor Analyst', 'complete', output, agent.executionTimeMs),
    ],
  }
}
