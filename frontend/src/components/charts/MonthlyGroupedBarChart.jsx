import { useMemo, useState } from 'react'
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
  const [tooltip, setTooltip] = useState(null) // { month, spending, gains, cx, side }

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

  // Tooltip: flip to left when group is in right half of chart
  const tipSide = (gx) => gx + GROUP_W / 2 > W / 2 ? 'right' : 'left'

  return (
    <div className="space-y-2 overflow-x-auto">
      <div className="flex items-center gap-4 text-xs">
        <span className="text-gold-muted flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-danger/80" /> Spending
        </span>
        <span className="text-gold-muted flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-success/80" /> Gains
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: Math.min(W, 300), maxHeight: 220 }}
        aria-hidden="true"
        onMouseLeave={() => setTooltip(null)}
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
                onMouseEnter={() => setTooltip({ month: label, spending, gains, cx: groupCx, side: tipSide(gx) })}
              />
              <text x={groupCx} y={H - 4} textAnchor="middle" fill="#8b7355" fontSize="9">{label.slice(5)}</text>
              <text x={groupCx} y={H - 14} textAnchor="middle" fill="#8b7355" fontSize="8">{label.slice(0, 4)}</text>
            </g>
          )
        })}

        {/* Tooltip */}
        {tooltip && (() => {
          const lines = [
            tooltip.month,
            `Spending: ${formatAmount(tooltip.spending)}`,
            `Gains: ${formatAmount(tooltip.gains)}`,
          ]
          const net = tooltip.gains - tooltip.spending
          lines.push(`Net: ${net >= 0 ? '+' : ''}${formatAmount(net)}`)
          const boxW = Math.max(...lines.map((l) => l.length)) * 6.4 + 16
          const boxH = lines.length * 14 + 8
          const bx = tooltip.side === 'right' ? tooltip.cx - boxW - 6 : tooltip.cx + 6
          const by = Math.max(PAD.top, PAD.top + CHART_H / 2 - boxH / 2)
          return (
            <g pointerEvents="none">
              <rect x={bx} y={by} width={boxW} height={boxH} rx="3" fill="rgba(26,15,10,0.95)" stroke="rgba(212,175,55,0.35)" strokeWidth="1" />
              {lines.map((line, idx) => (
                <text
                  key={idx}
                  x={bx + 8} y={by + 14 + idx * 14}
                  fill={idx === 1 ? '#cd5c5c' : idx === 2 ? '#4ade80' : idx === 3 ? (tooltip.gains >= tooltip.spending ? '#4ade80' : '#cd5c5c') : '#d4af37'}
                  fontSize="10"
                >
                  {line}
                </text>
              ))}
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
