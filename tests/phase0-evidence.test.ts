import assert from 'node:assert/strict'
import test from 'node:test'
import { getClaimsWithoutResolvableCitation, describeEvidenceAvailability } from '../lib/agent/evidence'
import { competitorNode } from '../lib/agent/nodes/competitor'
import { verifierNode } from '../lib/agent/nodes/verifier'
import {
  buildAnalysisReportCsv,
  buildAnalysisReportJson,
  buildAnalysisReportPdf,
  buildAnalysisReportText,
} from '../lib/report-export'
import type { Citation, InvestmentAnalysisState } from '../lib/agent/state'

const citation: Citation = {
  index: 1,
  title: 'Company filing',
  url: 'https://www.sec.gov/Archives/edgar/data/example',
  type: 'sec_filing',
}

test('citation references must resolve uniquely to an HTTP(S) source index', () => {
  const claims = [
    { point: 'Supported reference index', sourceIndex: 1 },
    { point: 'Missing source index', sourceIndex: 2 },
    { point: 'Uncited claim', sourceIndex: 0 },
    { point: 'Fractional index', sourceIndex: 1.5 },
  ]

  assert.deepEqual(getClaimsWithoutResolvableCitation(claims, [citation]), [
    'Missing source index',
    'Uncited claim',
    'Fractional index',
  ])
  assert.deepEqual(getClaimsWithoutResolvableCitation(claims.slice(0, 1), [
    citation,
    { ...citation, title: 'Duplicate index' },
  ]), ['Supported reference index'])
  assert.deepEqual(getClaimsWithoutResolvableCitation(claims.slice(0, 1), [
    { ...citation, url: 'javascript:alert(1)' },
  ]), ['Supported reference index'])
})

test('evidence presentation distinguishes retrieved sources from factual verification', () => {
  const message = describeEvidenceAvailability(2, 1)
  const emptyMessage = describeEvidenceAvailability(0, 0)

  assert.match(message, /2 sources retrieved/)
  assert.match(message, /1 claim lack a uniquely resolvable source reference/)
  assert.match(message, /Factual verification was not performed/)
  assert.match(emptyMessage, /No sources were retrieved/)
  assert.match(emptyMessage, /Factual verification was not performed/)
  assert.doesNotMatch(message, /verified|grounding|hallucination/i)
})

test('evidence availability does not calculate grounding or replace judge confidence', async () => {
  const state = {
    analysisId: 'test-analysis',
    ticker: 'TEST',
    companyName: 'Test Company',
    sector: 'Unknown',
    riskTolerance: 'moderate',
    bullCase: [{ point: 'Claim without a source reference', sourceIndex: 1, specificity: 4 }],
    bearCase: [],
    citations: [],
    confidenceScore: 73,
    agents: [],
    thoughtEvents: [],
  } as unknown as InvestmentAnalysisState

  const result = await verifierNode(state)

  assert.equal('groundingScore' in result, false)
  assert.equal('confidenceScore' in result, false)
  assert.deepEqual(result.unreferencedClaims, ['Claim without a source reference'])
  assert.match(result.agents?.[0].output ?? '', /Factual verification was not performed/)
})

test('competitor node reports unavailable instead of creating ticker-seeded peers or scores', async () => {
  const state = {
    analysisId: 'test-analysis',
    ticker: 'TEST',
    companyName: 'Test Company',
    sector: 'Technology',
    riskTolerance: 'moderate',
  } as InvestmentAnalysisState

  const result = await competitorNode(state)

  assert.deepEqual(result.competitorData, [])
  assert.equal(result.competitionScore, null)
  assert.match(result.agents?.[0].output ?? '', /unavailable/)
  assert.doesNotMatch(result.agents?.[0].output ?? '', /moat|leader|challenger|competition score/i)
})

test('downloaded report text preserves verification and source availability limitations', () => {
  const payload = {
    ticker: 'TEST',
    sources: [citation],
    unreferencedClaims: ['Claim lacking a resolvable source reference'],
  }
  const report = buildAnalysisReportText(payload)

  assert.match(report, /Factual claim verification: Not performed/)
  assert.match(report, /Sources retrieved: 1/)
  assert.match(report, /Claims without a resolvable source reference: 1/)
  assert.match(report, /Company filing/)
  assert.match(report, /Claim lacking a resolvable source reference/)

  const csv = buildAnalysisReportCsv(payload)
  const json = JSON.parse(buildAnalysisReportJson(payload)) as { factualVerificationStatus: string }
  const pdf = buildAnalysisReportPdf(payload)
  assert.match(csv, /Factual claim verification/)
  assert.equal(json.factualVerificationStatus, 'not_performed')
  assert.ok(pdf.output('arraybuffer').byteLength > 0)
})