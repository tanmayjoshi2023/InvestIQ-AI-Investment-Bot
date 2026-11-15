import type { Citation } from './state'

export interface ClaimSourceReference {
  point: string
  sourceIndex: number
}

function isUsableCitation(citation: Citation): boolean {
  if (!Number.isInteger(citation.index) || citation.index <= 0) return false

  try {
    const url = new URL(citation.url)
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname)
  } catch {
    return false
  }
}

export function hasResolvableCitationReference(
  sourceIndex: number,
  citations: Citation[]
): boolean {
  if (!Number.isInteger(sourceIndex) || sourceIndex <= 0) return false
  const matches = citations.filter((citation) => citation.index === sourceIndex)
  return matches.length === 1 && isUsableCitation(matches[0])
}

export function getClaimsWithoutResolvableCitation(
  claims: ClaimSourceReference[],
  citations: Citation[]
): string[] {
  return claims
    .filter((claim) => !hasResolvableCitationReference(claim.sourceIndex, citations))
    .map((claim) => claim.point)
}

export function describeEvidenceAvailability(sourceCount: number, unreferencedClaimCount: number): string {
  const sourceSummary = sourceCount === 0
    ? 'No sources were retrieved.'
    : `${sourceCount} source${sourceCount === 1 ? '' : 's'} retrieved.`
  return `${sourceSummary} ${unreferencedClaimCount} claim${unreferencedClaimCount === 1 ? '' : 's'} lack a uniquely resolvable source reference. Factual verification was not performed.`
}