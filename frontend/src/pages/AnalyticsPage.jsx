import { useMemo, useState } from 'react'
import { BarChart3, ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import PageContextHeader from '../components/layout/PageContextHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { useSelectedAccount } from '../contexts/AccountContext'
import { useSettings } from '../hooks/useSettings'
import {
  useAnalyticsInsights,
  useBalanceHistory,
  useDailyTrend,
  useMonthlyComparison,
  useSpendingByCategory,
  useSpendingBySubcategory,
  useSpendingByType,
} from '../hooks/useStats'
import { formatAmount, formatDate } from '../utils/format'
import {
  BalanceLineChart,
  HorizBarChart,
  MonthlyGroupedBarChart,
  SpendingLineChart,
} from '../components/charts'

// ── helpers ──────────────────────────────────────────────────────────────────

function toLocalDateInput(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function periodRange(days, offset) {
  const end = new Date()
  end.setDate(end.getDate() - offset * days)
  const start = new Date(end)
  start.setDate(end.getDate() - Math.max(1, days) + 1)
  return { from: toLocalDateInput(start), to: toLocalDateInput(end) }
}

// ── DonutChart (kept as-is) ───────────────────────────────────────────────────

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const startOuter = polarToCartesian(cx, cy, rOuter, endAngle)
  const endOuter = polarToCartesian(cx, cy, rOuter, startAngle)
  const startInner = polarToCartesian(cx, cy, rInner, endAngle)
  const endInner = polarToCartesian(cx, cy, rInner, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ')
}

function DonutChart({ rows }) {
  const [expandedIdx, setExpandedIdx] = useState(null)
  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0)
  if (total <= 0) return null
  const colors = ['#d4af37', '#8b4513', '#cd5c5c', '#4ade80', '#7c5cff', '#f59e0b']
  let cursor = 0
  const parts = rows.map((r, idx) => {
    const share = Number(r.total || 0) / total
    const start = cursor
    const end = cursor + share * 360
    cursor = end
    return { ...r, color: colors[idx % colors.length], start, end }
  })
  const cx = 90
  const cy = 90
  const rOuter = 80
  const rInner = 48
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-4 items-center">
      <div className="w-[180px] mx-auto">
        <svg viewBox="0 0 180 180" className="w-[180px] h-[180px] mx-auto">
          {parts.map((p, idx) => (
            <path
              key={p.label}
              d={arcPath(cx, cy, rOuter, rInner, p.start, p.end)}
              fill={p.color}
              opacity={expandedIdx == null || expandedIdx === idx ? 1 : 0.45}
              className="cursor-pointer transition-opacity"
              onClick={() => setExpandedIdx((prev) => (prev === idx ? null : idx))}
            />
          ))}
          <circle cx={cx} cy={cy} r={rInner - 1} fill="rgba(26,15,10,0.92)" stroke="rgba(212,175,55,0.25)" />
          <text x={cx} y={cy} textAnchor="middle" className="fill-[#d4af37]" style={{ fontSize: 12 }}>
            {formatAmount(total)}
          </text>
        </svg>
      </div>
      <div className="space-y-2">
        {parts.map((p, idx) => (
          <div key={p.label} className="rounded-md border border-gold/10 bg-black/20">
            <button
              type="button"
              className="w-full px-3 py-2 flex items-center justify-between text-sm"
              onClick={() => setExpandedIdx((prev) => (prev === idx ? null : idx))}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
                <span className="text-parchment">{p.label}</span>
              </div>
              <span className="text-gold-muted">
                {formatAmount(p.total)} ({((Number(p.total || 0) / total) * 100).toFixed(0)}%)
              </span>
            </button>
            {expandedIdx === idx && (p.categories || []).length > 0 ? (
              <div className="px-3 pb-2 pt-1 border-t border-gold/10 space-y-1 max-h-40 overflow-auto">
                {p.categories.map((cat) => (
                  <div key={cat.category_name} className="flex items-center justify-between text-xs">
                    <span className="text-parchment truncate pr-2">{cat.category_name}</span>
                    <span className="text-gold-muted shrink-0">{formatAmount(cat.total)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── PeriodControl ─────────────────────────────────────────────────────────────

function PeriodControl({ periodDays, periodOffset, onChange }) {
  const isPresent = periodOffset === 0

  const range = useMemo(() => periodRange(periodDays, periodOffset), [periodDays, periodOffset])

  return (
    <Card>
      <CardBody>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="segmented-toggle" role="group" aria-label="Period length">
            {[7, 30, 60, 90].map((d) => (
              <button
                key={d}
                type="button"
                className={[
                  'segmented-toggle-button text-xs py-2 px-3',
                  periodDays === d ? 'segmented-toggle-button-active' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onChange(d, 0)}
              >
                {d}d
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 sm:ml-auto">
            <button
              type="button"
              className="btn btn-ghost text-sm flex items-center gap-1"
              onClick={() => onChange(periodDays, periodOffset + 1)}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="text-xs text-gold-muted px-2 whitespace-nowrap">
              {range.from} — {range.to}
            </span>
            <button
              type="button"
              className="btn btn-ghost text-sm flex items-center gap-1 disabled:opacity-30"
              disabled={isPresent}
              onClick={() => onChange(periodDays, Math.max(0, periodOffset - 1))}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { selectedAccount, selectedId } = useSelectedAccount()
  const { data: settings } = useSettings()

  // Global period state
  const [periodDays, setPeriodDays] = useState(30)
  const [periodOffset, setPeriodOffset] = useState(0)

  // Composition tabs
  const [activeCompositionTab, setActiveCompositionTab] = useState('type')
  const [categorySubType, setCategorySubType] = useState('daily')
  const [expandedCategory, setExpandedCategory] = useState(null)


  const range = useMemo(() => periodRange(periodDays, periodOffset), [periodDays, periodOffset])

  const accountParam = selectedId ? { account_id: selectedId } : {}

  const typeQuery = useSpendingByType({ date_from: range.from, date_to: range.to, ...accountParam })
  const categoryQuery = useSpendingByCategory({
    date_from: range.from,
    date_to: range.to,
    tx_type: categorySubType,
    ...accountParam,
  })
  const subcategoryQuery = useSpendingBySubcategory({
    category_name: expandedCategory,
    date_from: range.from,
    date_to: range.to,
    tx_type: categorySubType,
    ...accountParam,
  })
  const dailyTrendQuery = useDailyTrend(periodDays, periodOffset, selectedId)
  const monthlyQuery = useMonthlyComparison(12, selectedId)
  const balanceQuery = useBalanceHistory(periodDays, periodOffset, selectedId)
  const insightsQuery = useAnalyticsInsights({ date_from: range.from, date_to: range.to, ...accountParam })

  const typeRows = typeQuery.data?.types || []
  const categoryRows = categoryQuery.data?.categories || []
  const trendPoints = dailyTrendQuery.data?.points || []
  const monthRows = monthlyQuery.data?.months || []
  const balancePoints = balanceQuery.data?.points || []
  const insights = insightsQuery.data

  const typeCards = typeRows.map((row) => ({
    label: row.tx_type === 'predicted' ? 'Scheduled' : row.tx_type[0].toUpperCase() + row.tx_type.slice(1),
    total: Number(row.total || 0),
    categories: row.categories || [],
  }))

  const categoryBarRows = categoryRows.map((row) => ({
    label: row.category_name,
    total: Number(row.total || 0),
    subcategories: expandedCategory === row.category_name
      ? (subcategoryQuery.data?.subcategories || []).map((s) => ({ label: s.subcategory, total: Number(s.total || 0) }))
      : undefined,
  }))

  const highThreshold = settings?.daily_high_threshold ?? 110
  const lowThreshold = settings?.daily_low_threshold ?? 90

  const categoryTrendsMap = useMemo(() => {
    const map = {}
    for (const t of (insights?.category_trends || [])) {
      map[t.category_name] = { delta_percent: Number(t.delta_percent), previous_total: Number(t.previous_total) }
    }
    return map
  }, [insights?.category_trends])

  const hasInsights = insights && (
    insights.days_above_zero > 0 ||
    insights.longest_streak_without_unplanned > 0 ||
    insights.most_expensive_purchase_amount ||
    insights.biggest_spending_day_amount ||
    insights.most_frequent_payment_method ||
    insights.most_frequent_daily_category ||
    insights.most_frequent_unplanned_category
  )

  return (
    <div className="page-shell">
      <PageContextHeader
        icon={BarChart3}
        title="Analytics"
        subtitle={
          selectedAccount
            ? `Charts and trends for ${selectedAccount.name}`
            : 'Charts and trends of thy treasury'
        }
        showAccountSwitcher
      />
      <div className="page-container">
        <div className="flex flex-col gap-6 max-w-3xl w-full">

          {/* ── Period Control ── */}
          <PeriodControl
            periodDays={periodDays}
            periodOffset={periodOffset}
            onChange={(d, o) => { setPeriodDays(d); setPeriodOffset(o) }}
          />

          {/* ── Spending Composition (tabbed) ── */}
          <Card shimmer>
            <CardHeader title="Spending Composition">
              <div className="ml-auto shrink-0 segmented-toggle" role="group" aria-label="Composition view">
                {[
                  { value: 'type', label: 'Type' },
                  { value: 'category', label: 'Category' },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    className={[
                      'segmented-toggle-button text-xs py-2 px-3',
                      activeCompositionTab === tab.value ? 'segmented-toggle-button-active' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => setActiveCompositionTab(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardBody>
              {activeCompositionTab === 'type' ? (
                typeQuery.isLoading ? (
                  <p className="text-gold-muted font-crimson">Gathering ledgers...</p>
                ) : typeCards.length > 0 ? (
                  <DonutChart rows={typeCards} />
                ) : (
                  <p className="text-gold-muted/60 font-crimson italic text-sm">No spending records in this period.</p>
                )
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="input-label mb-0">Type:</span>
                    <div className="segmented-toggle" role="group">
                      {[
                        { value: 'daily', label: 'Daily' },
                        { value: 'unplanned', label: 'Unplanned' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={[
                            'segmented-toggle-button text-xs py-1.5 px-3',
                            categorySubType === opt.value ? 'segmented-toggle-button-active' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={() => { setCategorySubType(opt.value); setExpandedCategory(null) }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {categoryQuery.isLoading ? (
                    <p className="text-gold-muted font-crimson text-sm">Loading categories...</p>
                  ) : categoryBarRows.length > 0 ? (
                    <HorizBarChart
                      rows={categoryBarRows}
                      trends={categoryTrendsMap}
                      expandedLabel={expandedCategory}
                      onRowClick={(label) => setExpandedCategory(label)}
                    />
                  ) : (
                    <p className="text-gold-muted/60 font-crimson italic text-sm">
                      No category spending found for this period.
                    </p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* ── Daily Spending ── */}
          <Card shimmer>
            <CardHeader title="Daily Spending" />
            <CardBody>
              {dailyTrendQuery.isLoading ? (
                <p className="text-gold-muted font-crimson text-sm">Loading trend data...</p>
              ) : (
                <SpendingLineChart
                  points={trendPoints}
                  highThreshold={highThreshold}
                  lowThreshold={lowThreshold}
                />
              )}
            </CardBody>
          </Card>

          {/* ── Monthly Overview ── */}
          <Card shimmer>
            <CardHeader title="Monthly Chronicle" />
            <CardBody>
              {monthlyQuery.isLoading ? (
                <p className="text-gold-muted font-crimson text-sm">Consulting the chronicles...</p>
              ) : (
                <MonthlyGroupedBarChart months={monthRows} />
              )}
            </CardBody>
          </Card>

          {/* ── Balance History ── */}
          <Card shimmer>
            <CardHeader title="Treasury Over Time" />
            <CardBody>
              {balanceQuery.isLoading ? (
                <p className="text-gold-muted font-crimson text-sm">Loading balance history...</p>
              ) : (
                <BalanceLineChart points={balancePoints} />
              )}
            </CardBody>
          </Card>

          {/* ── Achievements ── */}
          <Card shimmer>
            <CardHeader icon={<Trophy size={16} />} title="Achievements" />
            <CardBody className="space-y-3">
              {insightsQuery.isLoading ? (
                <p className="text-gold-muted font-crimson text-sm">Tallying thy deeds...</p>
              ) : insightsQuery.isError ? (
                <p className="text-danger font-crimson italic text-sm">
                  Hark! Insights could not be calculated for this period.
                </p>
              ) : !hasInsights ? (
                <p className="text-gold-muted/60 font-crimson italic text-sm">
                  No highlight metrics yet for this period.
                </p>
              ) : (
                <>
                  {insights.period_total_spending > 0 && (
                    <p className="text-sm text-parchment flex flex-wrap gap-x-1.5 gap-y-0.5">
                      <span className="whitespace-nowrap">
                        <span className="text-gold">Period spending:</span>{' '}
                        <span className="text-danger">{formatAmount(insights.period_total_spending)}</span>
                      </span>
                      {insights.period_total_gains > 0 && (
                        <>
                          <span className="text-gold-muted">·</span>
                          <span className="whitespace-nowrap">
                            <span className="text-gold">Gains:</span>{' '}
                            <span className="text-success">{formatAmount(insights.period_total_gains)}</span>
                          </span>
                          <span className="text-gold-muted">·</span>
                          <span className="whitespace-nowrap">
                            <span className="text-gold">Net:</span>{' '}
                            <span className={insights.period_net >= 0 ? 'text-success' : 'text-danger'}>
                              {insights.period_net >= 0 ? '+' : ''}{formatAmount(insights.period_net)}
                            </span>
                          </span>
                        </>
                      )}
                    </p>
                  )}
                  <p className="text-sm text-parchment flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-gold">Days above 0 balance:</span>
                    <span className="whitespace-nowrap">{insights.days_above_zero}</span>
                  </p>
                  <p className="text-sm text-parchment flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-gold">Longest streak without unplanned spending:</span>
                    <span className="whitespace-nowrap">{insights.longest_streak_without_unplanned} days</span>
                  </p>
                  {insights.days_since_last_overdue_prediction != null && (
                    <p className="text-sm text-parchment flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-gold">Days since last overdue prediction:</span>
                      <span className="whitespace-nowrap">{insights.days_since_last_overdue_prediction}</span>
                    </p>
                  )}
                  {insights.most_expensive_purchase_amount && (
                    <p className="text-sm text-parchment flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-gold">Most expensive unplanned purchase:</span>
                      <span className="whitespace-nowrap">{formatAmount(insights.most_expensive_purchase_amount)} ({insights.most_expensive_purchase_label || '—'})</span>
                    </p>
                  )}
                  {insights.biggest_spending_day_amount && (
                    <p className="text-sm text-parchment flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-gold">Biggest spending day:</span>
                      <span className="whitespace-nowrap">{formatAmount(insights.biggest_spending_day_amount)} on {formatDate(insights.biggest_spending_day_date)}</span>
                    </p>
                  )}
                  {insights.most_frequent_payment_method && (
                    <p className="text-sm text-parchment flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-gold">Most frequent payment method:</span>
                      <span className="whitespace-nowrap">{insights.most_frequent_payment_method} ({insights.most_frequent_payment_method_count} times)</span>
                    </p>
                  )}
                  {insights.most_frequent_daily_category && (
                    <p className="text-sm text-parchment flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-gold">Most frequent daily category:</span>
                      <span className="whitespace-nowrap">{insights.most_frequent_daily_category} ({insights.most_frequent_daily_category_count} times)</span>
                    </p>
                  )}
                  {insights.most_frequent_unplanned_category && (
                    <p className="text-sm text-parchment flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-gold">Most frequent unplanned category:</span>
                      <span className="whitespace-nowrap">{insights.most_frequent_unplanned_category} ({insights.most_frequent_unplanned_category_count} times)</span>
                    </p>
                  )}
                </>
              )}
            </CardBody>
          </Card>


        </div>
      </div>
    </div>
  )
}
