import { useMemo, useRef, useState } from 'react'
import { formatAmount } from '../../utils/format'

const BAR_GAP = 3
const GROUP_GAP = 14
const BAR_W = 18
const GROUP_W = BAR_W * 2 + BAR_GAP + GROUP_GAP
const H = 180
const PAD = { top: 12, right: 12, bottom: 36, left: 60 }
const CHART_H = H - PAD.top - PAD.bottom

/**
 * Side-by-side grouped bar chart: spending (danger red) vs gains (success green) per month.
 * Props:
 *   months: Array<{ month: string, spending: number, gains: number }>
 */
export default function MonthlyGroupedBarChart({ months }) {
  const [tooltip, setTooltip] = useState(null)
  const clearTimer = useRef(null)

  if (!months?.length) return (
    <p className="text-gold-muted/60 font-crimson italic text-sm">
      No monthly data yet for this account.
    </p>
  )

  const maxVal = useMemo(
    () => Math.max(...months.map((m) => Math.max(Number(m.spending), Number(m.gains))), 1),
    [months]
  )

  const n = months.length
  const W = PAD.left + n * GROUP_W + PAD.right

  const xGroup = (i) => PAD.left + i * GROUP_W
  const yOf = (v) => PAD.top + CHART_H - (Math.min(v, maxVal) / maxVal) * CHART_H
  const hOf = (v) => (Math.min(v, maxVal) / maxVal) * CHART_H

  const gridFracs = [0.25, 0.5, 0.75, 1]

  const showTooltip = (data, clientX, clientY) => {
    if (clearTimer.current) clearTimeout(clearTimer.current)
    setTooltip({ ...data, clientX, clientY })
  }

  const hideTooltip = (delay = 0) => {
    if (clearTimer.current) clearTimeout(clearTimer.current)
    if (delay > 0) {
      clearTimer.current = setTimeout(() => setTooltip(null), delay)
    } else {
      setTooltip(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs">
        <span className="text-gold-muted flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-danger/80" /> Spending
        </span>
        <span className="text-gold-muted flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-success/80" /> Gains
        </span>
      </div>
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: Math.min(W, 300), maxHeight: 220 }}
          aria-hidden="true"
          onMouseLeave={() => hideTooltip()}
          onTouchEnd={() => hideTooltip(1500)}
        >
          {/* Y-axis grid */}
          {gridFracs.map((frac) => {
            const y = PAD.top + CHART_H * (1 - frac)
            return (
              <g key={frac}>
                <line x1={PAD.left} y1={y} x2={PAD.left + n * GROUP_W} y2={y} stroke="rgba(212,175,55,0.1)" strokeWidth="1" />
                <text x={PAD.left - 4} y={y + 4} textAnchor="end" fill="#8b7355" fontSize="9">
                  {formatAmount(maxVal * frac)}
                </text>
              </g>
            )
          })}

          {/* Bars + hit targets */}
          {months.map((m, i) => {
            const gx = xGroup(i)
            const spending = Number(m.spending || 0)
            const gains = Number(m.gains || 0)
            const sh = hOf(spending)
            const gh = hOf(gains)
            const label = m.month?.slice(0, 7) || ''
            const groupCx = gx + BAR_W + BAR_GAP / 2

            return (
              <g key={m.month}>
                {spending > 0 && (
                  <rect x={gx} y={yOf(spending)} width={BAR_W} height={sh} fill="#cd5c5c" opacity="0.85" rx="2" />
                )}
                {gains > 0 && (
                  <rect x={gx + BAR_W + BAR_GAP} y={yOf(gains)} width={BAR_W} height={gh} fill="#4ade80" opacity="0.85" rx="2" />
                )}
                {/* invisible hit rect over the whole group */}
                <rect
                  x={gx} y={PAD.top}
                  width={BAR_W * 2 + BAR_GAP} height={CHART_H}
                  fill="transparent"
                  style={{ cursor: 'default' }}
                  onMouseEnter={(e) => showTooltip({ month: label, spending, gains }, e.clientX, e.clientY)}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    const t = e.touches[0]
                    showTooltip({ month: label, spending, gains }, t.clientX, t.clientY)
                  }}
                />
                <text x={groupCx} y={H - 4} textAnchor="middle" fill="#8b7355" fontSize="9">{label.slice(5)}</text>
                <text x={groupCx} y={H - 14} textAnchor="middle" fill="#8b7355" fontSize="8">{label.slice(0, 4)}</text>
              </g>
            )
          })}
        </svg>

        {/* DOM tooltip — readable at any viewport size */}
        {tooltip && (() => {
          const net = tooltip.gains - tooltip.spending
          const TOOLTIP_W = 170
          const left = Math.min(tooltip.clientX + 12, window.innerWidth - TOOLTIP_W - 8)
          const top = tooltip.clientY - 10
          return (
            <div
              className="fixed z-50 pointer-events-none bg-[#1a0f0a] border border-gold/30 rounded px-2 py-1.5 text-xs text-parchment shadow-lg space-y-0.5"
              style={{ left, top, minWidth: TOOLTIP_W }}
            >
              <div className="text-gold font-semibold">{tooltip.month}</div>
              <div className="flex justify-between gap-3">
                <span className="text-parchment/70">Spending</span>
                <span className="text-danger shrink-0">{formatAmount(tooltip.spending)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-parchment/70">Gains</span>
                <span className="text-success shrink-0">{formatAmount(tooltip.gains)}</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-gold/10 pt-0.5">
                <span className="text-parchment/70">Net</span>
                <span className={`shrink-0 ${net >= 0 ? 'text-success' : 'text-danger'}`}>
                  {net >= 0 ? '+' : ''}{formatAmount(net)}
                </span>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
