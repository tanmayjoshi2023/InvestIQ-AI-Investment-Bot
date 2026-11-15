import React, { type JSX } from 'react'
import { Card } from '@/components/ui/card'
import { VerdictBadge } from '@/components/ui/verdict-badge'
import type { ExplainabilityPanel } from '@/lib/agent/types'
import { describeEvidenceAvailability } from '@/lib/agent/evidence'

interface VerdictCardProps {
  verdict: 'BUY' | 'HOLD' | 'PASS'
  confidence?: number | null
  targetPrice?: number
  currentPrice?: number
  upside?: number
  timeframe?: string
  summary: string
  explainability?: ExplainabilityPanel | null
  unreferencedClaims?: string[] | null
  className?: string
}

export function VerdictCard({
  verdict,
  confidence,
  targetPrice,
  currentPrice,
  upside,
  timeframe = '12 months',
  summary,
  explainability = null,
  unreferencedClaims = null,
  className = '',
}: VerdictCardProps): JSX.Element {
  return (
    <Card className={`p-6 space-y-6 animate-verdict-entrance ${className}`}>
      {/* Verdict Badge and Confidence */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <VerdictBadge verdict={verdict} size="lg" confidence={confidence ?? undefined} />
          {confidence !== undefined && confidence !== null && (
            <p className="text-sm text-muted-foreground">
              Model confidence (heuristic, not a probability): <span className="font-semibold text-foreground">{Math.round(confidence)}/100</span>
            </p>
          )}
        </div>

        {confidence !== undefined && confidence !== null && <svg className="w-20 h-20" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={verdict === 'BUY' ? '#22C55E' : verdict === 'HOLD' ? '#F59E0B' : '#EF4444'}
            strokeWidth="3"
            strokeDasharray={`${(confidence / 100) * 283} 283`}
            strokeLinecap="round"
            className="animate-progress-ring transition-all"
          />
          <text
            x="50"
            y="55"
            textAnchor="middle"
            className="text-lg font-bold fill-foreground"
          >
            {Math.round(confidence)}/100
          </text>
        </svg>}
      </div>

      {/* Price Metrics */}
      {(currentPrice !== undefined || targetPrice || upside !== undefined) && (
        <div className="grid grid-cols-3 gap-4 py-4 border-y">
          {currentPrice !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="text-lg font-semibold text-foreground">${currentPrice.toFixed(2)}</p>
            </div>
          )}
          {targetPrice && (
            <div>
              <p className="text-xs text-muted-foreground">Target ({timeframe})</p>
              <p className="text-lg font-semibold text-foreground">${targetPrice.toFixed(2)}</p>
            </div>
          )}
          {upside !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground">Upside</p>
              <p
                className={`text-lg font-semibold ${upside >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Explainability Breakdown */}
      {explainability?.scores && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider">Analysis Score Breakdown</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-2 bg-muted/40 rounded-lg text-center border">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Financial</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{explainability.scores.financial}</p>
            </div>
            <div className="p-2 bg-muted/40 rounded-lg text-center border">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">News / Sent</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{explainability.scores.sentiment}</p>
            </div>
            <div className="p-2 bg-muted/40 rounded-lg text-center border">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Competition</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{explainability.scores.competition ?? 'Unavailable'}</p>
            </div>
            <div className="p-2 bg-muted/40 rounded-lg text-center border">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Risk / Safety</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{explainability.scores.risk}</p>
            </div>
            <div className="p-2 bg-brand-blue/5 dark:bg-brand-blue/15 rounded-lg text-center border border-brand-blue/30 col-span-2 md:col-span-1">
              <p className="text-[10px] text-brand-blue font-bold uppercase">Composite</p>
              <p className="text-lg font-black text-brand-blue mt-0.5">{explainability.scores.composite}</p>
            </div>
          </div>
        </div>
      )}

      {/* Evidence & Verification Drivers */}
      {explainability?.scores && (
        <div className="border-t pt-4 space-y-2">
          <h4 className="font-semibold text-foreground text-sm uppercase tracking-wider">Heuristic Score Components</h4>
          <ul className="space-y-1.5 pl-4 list-disc text-sm text-foreground/80 leading-relaxed">
            <li>Financial component: {explainability.scores.financial}/100 from a limited set of ratios; not a full statement analysis.</li>
            <li>Sentiment component: {explainability.scores.sentiment}/100 from a keyword-based news heuristic.</li>
            <li>Risk component: {explainability.scores.risk}/100 from the configured formula; not a measured loss probability.</li>
            {explainability.scores.competition === null
              ? <li>Competition component unavailable: no validated peer evidence was retrieved.</li>
              : <li>Competition component: {explainability.scores.competition}/100; this is not a validated peer comparison.</li>}
          </ul>
        </div>
      )}

      {/* Summary */}
      <div className="space-y-2 border-t pt-4">
        <h4 className="font-semibold text-foreground">Key Takeaway</h4>
        <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
      </div>

      <p className="text-xs text-muted-foreground">
        {describeEvidenceAvailability(explainability?.sources.length ?? 0, unreferencedClaims?.length ?? 0)}
      </p>
      {unreferencedClaims && unreferencedClaims.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-muted-foreground">
          {unreferencedClaims.map((claim, index) => <li key={`${index}-${claim}`}>{claim}</li>)}
        </ul>
      )}
    </Card>
  )
}

export default VerdictCard
