import type { InvestmentAnalysisState } from '@/lib/agent/state'
import { makeAgentOutput, makeThought, stateInput } from './helpers'
import { emitThought } from '@/lib/agent/event-bus'
import { describeEvidenceAvailability, getClaimsWithoutResolvableCitation } from '@/lib/agent/evidence'

/** Reports source-reference availability only; it does not verify factual claims. */
export async function verifierNode(state: InvestmentAnalysisState): Promise<Partial<InvestmentAnalysisState>> {
  const start = Date.now()
  emitThought(state.analysisId, 'Evidence Availability', 'running', 'Checking source-reference availability...')
  const input = stateInput(state)
  const claims = [...(state.bullCase || []), ...(state.bearCase || [])]
  const unreferencedClaims = getClaimsWithoutResolvableCitation(claims, state.citations)
  const output = describeEvidenceAvailability(state.citations.length, unreferencedClaims.length)
  const agent = makeAgentOutput('Evidence Availability', 'evidence', input, output, 0, Date.now() - start)

  emitThought(state.analysisId, 'Evidence Availability', 'complete', output, agent.executionTimeMs)

  return {
    unreferencedClaims,
    agents: [agent],
    thoughtEvents: [
      makeThought('Evidence Availability', 'running', 'Checking source-reference availability...'),
      makeThought('Evidence Availability', 'complete', output, agent.executionTimeMs),
    ],
  }
}
