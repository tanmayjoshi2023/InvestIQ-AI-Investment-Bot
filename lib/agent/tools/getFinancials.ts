import YahooFinance from 'yahoo-finance2'
import type { FinancialMetrics } from '@/lib/agent/types'
import { FinancialMetricsSchema } from '@/lib/agent/schemas'
import { fetchWithTimeout, cached } from './http'

export interface FinancialDataResult extends FinancialMetrics {
  ticker: string
  source: 'alpha_vantage' | 'yahoo_finance' | 'manual'
  stale?: boolean
  missingMetrics?: string[]
  dataQuality?: 'high' | 'partial' | 'unavailable'
}

const yfInstance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] })

function getMissingMetrics(data: Partial<FinancialMetrics>): string[] {
  return Object.entries(data)
    .filter(([, value]) => value === null || value === undefined)
    .map(([key]) => key)
}

function withQuality(ticker: string, metrics: Partial<FinancialMetrics>, source: FinancialDataResult['source']): FinancialDataResult {
  const missingMetrics = getMissingMetrics(metrics)
  const quality = missingMetrics.length === 0 ? 'high' : missingMetrics.length >= 4 ? 'unavailable' : 'partial'

  return {
    ticker,
    peRatio: metrics.peRatio ?? null,
    revenueGrowthYoY: metrics.revenueGrowthYoY ?? null,
    debtToEquity: metrics.debtToEquity ?? null,
    grossMargin: metrics.grossMargin ?? null,
    freeCashFlowYield: metrics.freeCashFlowYield ?? null,
    source,
    stale: source === 'manual',
    missingMetrics,
    dataQuality: quality,
  }
}

async function fetchAlphaVantage(ticker: string): Promise<FinancialDataResult | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY
  if (!apiKey) return null

  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`
    const res = await fetchWithTimeout(url, { next: { revalidate: 3600 } } as RequestInit)
    if (!res.ok) return null
    const data = await res.json()
    if (data.Note || data.Information || !data.Symbol) return null

    const metrics = FinancialMetricsSchema.parse({
      ticker,
      peRatio: data.PERatio ? parseFloat(data.PERatio) : null,
      revenueGrowthYoY: data.QuarterlyRevenueGrowthYOY ? parseFloat(data.QuarterlyRevenueGrowthYOY) : null,
      debtToEquity: data.DebtToEquity ? parseFloat(data.DebtToEquity) : null,
      grossMargin: data.GrossProfitTTM && data.RevenueTTM ? parseFloat(data.GrossProfitTTM) / parseFloat(data.RevenueTTM) : null,
      freeCashFlowYield: null,
      source: 'alpha_vantage',
    })

    return withQuality(ticker, metrics, 'alpha_vantage')
  } catch {
    return null
  }
}

async function fetchYahooFinance(ticker: string): Promise<FinancialDataResult | null> {
  try {
    const result = await Promise.race([
      yfInstance.quoteSummary(ticker, {
        modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics'],
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('yahoo timeout')), 8_000)),
    ])
    if (!result) return null

    const peRatio = result.summaryDetail?.trailingPE || result.defaultKeyStatistics?.forwardPE || null
    const revenueGrowthYoY = result.financialData?.revenueGrowth || null
    const rawDebt = result.financialData?.debtToEquity
    const debtToEquity = typeof rawDebt === 'number' ? rawDebt / 100 : null
    const grossMargin = result.financialData?.grossMargins || null

    const freeCashflow = result.financialData?.freeCashflow || null
    const marketCap = result.summaryDetail?.marketCap || null
    const freeCashFlowYield = freeCashflow && marketCap ? freeCashflow / marketCap : null

    const metrics = FinancialMetricsSchema.parse({
      ticker,
      peRatio,
      revenueGrowthYoY,
      debtToEquity,
      grossMargin,
      freeCashFlowYield,
      source: 'yahoo_finance',
    })

    return withQuality(ticker, metrics, 'yahoo_finance')
  } catch (error) {
    console.error('[fetchYahooFinance] failed:', error)
    return null
  }
}

/**
 * Live providers are preferred, but if they are unavailable we intentionally return
 * partial or empty metrics instead of synthetic numbers. This preserves truthfulness.
 */
export async function getFinancials(ticker: string): Promise<FinancialDataResult> {
  return cached(`financials:${ticker}`, async () => {
    const liveAV = await fetchAlphaVantage(ticker)
    if (liveAV) return liveAV

    const liveYF = await fetchYahooFinance(ticker)
    if (liveYF) return liveYF

    console.warn(`[getFinancials] no usable financial data for ${ticker}; returning unavailable metrics`)
    return withQuality(ticker, {
      peRatio: null,
      revenueGrowthYoY: null,
      debtToEquity: null,
      grossMargin: null,
      freeCashFlowYield: null,
    }, 'manual')
  })
}
