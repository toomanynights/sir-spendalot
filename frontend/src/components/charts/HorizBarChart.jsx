import { useMemo, useState } from 'react'
import { formatAmount } from '../../utils/format'

/**
 * Horizontal proportional bar chart with optional expandable subcategory rows
 * and optional trend arrow badges.
 *
 * Props:
 *   rows: Array<{ label, total, subcategories?: Array<{ label, total }> }>
 *   trends?: Record<string, { delta_percent: number, previous_total: number }>
 *   onRowClick?: (label: string | null) => void
 *   expandedLabel?: string
 */
export default function HorizBarChart({ rows, trends, onRowClick, expandedLabel: controlledExpanded }) {
  const [internalExpanded, setInternalExpanded] = useState(null)
  const expandedLabel = controlledExpanded !== undefined ? controlledExpanded : internalExpanded
  // { label, clientX, clientY, delta, prev }
  const [trendTooltip, setTrendTooltip] = useState(null)

  const maxVal = useMemo(
    () => rows.reduce((m, r) => Math.max(m, Number(r.total || 0)), 0),
    [rows]
  )

  if (!rows?.length) return null

  return (
    <>
      <div className="space-y-1">
        {rows.map((row) => {
          const val = Number(row.total || 0)
          const pct = maxVal > 0 ? Math.max(3, Math.round((val / maxVal) * 100)) : 0
          const isExpanded = expandedLabel === row.label
          const hasSubs = (row.subcategories || []).length > 0
          const trend = trends?.[row.label]

          return (
            <div key={row.label} className="rounded-md border border-gold/10 overflow-hidden">
              <button
                type="button"
                className="w-full px-3 pt-2 pb-1 flex flex-col gap-1 text-left"
                onClick={() => {
                  if (onRowClick) {
                    onRowClick(isExpanded ? null : row.label)
                  } else {
                    setInternalExpanded((prev) => (prev === row.label ? null : row.label))
                  }
                }}
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="text-parchment truncate">{row.label}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {trend != null && (() => {
                      const delta = Number(trend.delta_percent)
                      const isUp = delta >= 0
                      return (
                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded cursor-default select-none
                            ${isUp ? 'text-danger bg-danger/10' : 'text-success bg-success/10'}`}
                          onMouseEnter={(e) => {
                            e.stopPropagation()
                            setTrendTooltip({
                              label: row.label,
                              clientX: e.clientX,
                              clientY: e.clientY,
                              delta: Number(trend.delta_percent),
                              prev: trend.previous_total,
                            })
                          }}
                          onMouseMove={(e) => {
                            setTrendTooltip((t) => t ? { ...t, clientX: e.clientX, clientY: e.clientY } : t)
                          }}
                          onMouseLeave={() => setTrendTooltip(null)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isUp ? '↗' : '↘'}
                        </span>
                      )
                    })()}
                    <span className="text-gold-muted">{formatAmount(val)}</span>
                  </div>
                </div>
                <div className="h-2 rounded bg-black/30 overflow-hidden">
                  <div className="h-full bg-gold/70 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </button>

              {isExpanded && hasSubs ? (
                <div className="px-3 pb-2 pt-1 border-t border-gold/10 space-y-1 bg-black/10">
                  {row.subcategories.map((sub) => {
                    const sv = Number(sub.total || 0)
                    const sp = val > 0 ? Math.max(3, Math.round((sv / val) * 100)) : 0
                    return (
                      <div key={sub.label} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-parchment/80 truncate pr-2">{sub.label}</span>
                          <span className="text-gold-muted/80 shrink-0">{formatAmount(sv)}</span>
                        </div>
                        <div className="h-1.5 rounded bg-black/30 overflow-hidden">
                          <div className="h-full bg-gold/40" style={{ width: `${sp}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Fixed-position tooltip — escapes any overflow:hidden ancestor */}
      {trendTooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-[#1a0f0a] border border-gold/30 rounded px-2 py-1 text-xs text-parchment whitespace-nowrap shadow-lg"
          style={{ left: trendTooltip.clientX + 12, top: trendTooltip.clientY - 10 }}
        >
          <span className={trendTooltip.delta >= 0 ? 'text-danger' : 'text-success'}>
            {trendTooltip.delta >= 0 ? '↗' : '↘'} {Math.abs(trendTooltip.delta).toFixed(1)}%
          </span>
          <span className="text-gold-muted ml-2">vs {formatAmount(trendTooltip.prev)} prev period</span>
        </div>
      )}
    </>
  )
}
