import { useMemo, useRef, useState } from 'react'
import { formatAmount } from '../../utils/format'

const W = 600
const H = 160
const PAD = { top: 12, right: 12, bottom: 28, left: 56 }
const CHART_W = W - PAD.left - PAD.right
const CHART_H = H - PAD.top - PAD.bottom
const DOT_R = 5
const HIT_R = 12

export default function SpendingLineChart({ points, highThreshold = 110, lowThreshold = 90 }) {
  const [tooltip, setTooltip] = useState(null) // { clientX, clientY, point }
  const clearTimer = useRef(null)
  const svgRef = useRef(null)

  const filtered = useMemo(
    () => (points || []).filter((p) => Number(p.spending) > 0 || Number(p.rolling_average) > 0),
    [points]
  )

  if (!filtered.length) return (
    <p className="text-gold-muted/60 font-crimson italic text-sm">
      No daily spending data in this period.
    </p>
  )

  const maxY = useMemo(
    () => Math.max(
      ...filtered.map((p) => Number(p.spending)),
      ...filtered.map((p) => Number(p.rolling_average) * (highThreshold / 100)),
      1
    ),
    [filtered, highThreshold]
  )

  const n = filtered.length
  const xOf = (i) => PAD.left + (n === 1 ? CHART_W / 2 : (i / (n - 1)) * CHART_W)
  const yOf = (v) => PAD.top + CHART_H - (Math.min(v, maxY) / maxY) * CHART_H

  const baseline = Number(filtered[0]?.rolling_average || 0)
  const baselineY = yOf(baseline)
  const polylinePoints = filtered.map((p, i) => `${xOf(i)},${yOf(Number(p.spending))}`).join(' ')

  const dotColor = (status) => {
    if (status === 'high') return '#cd5c5c'
    if (status === 'low') return '#4ade80'
    return '#d4af37'
  }

  const labelIdxs = useMemo(() => {
    if (n <= 5) return filtered.map((_, i) => i)
    const step = Math.floor(n / 4)
    const idxs = [0]
    for (let i = step; i < n - 1; i += step) idxs.push(i)
    idxs.push(n - 1)
    return [...new Set(idxs)]
  }, [n, filtered])

  const showTooltip = (point, clientX, clientY) => {
    if (clearTimer.current) clearTimeout(clearTimer.current)
    setTooltip({ point, clientX, clientY })
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
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="text-gold-muted flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-danger/80" />
          Above {highThreshold}%
        </span>
        <span className="text-gold-muted flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-success/80" />
          Below {lowThreshold}%
        </span>
        <span className="text-gold-muted flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-gold/70" />
          Within range
        </span>
        {baseline > 0 && (
          <span className="text-gold-muted flex items-center gap-1">
            <svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#d4af37" strokeWidth="1.5" strokeDasharray="4 2" /></svg>
            Avg {formatAmount(baseline)}/day
          </span>
        )}
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxHeight: 180 }}
          aria-hidden="true"
          onMouseLeave={() => hideTooltip()}
          onTouchEnd={() => hideTooltip(1500)}
        >
          {/* Y-axis grid lines */}
          {[0.25, 0.5, 0.75, 1].map((frac) => {
            const y = PAD.top + CHART_H * (1 - frac)
            return (
              <g key={frac}>
                <line x1={PAD.left} y1={y} x2={PAD.left + CHART_W} y2={y} stroke="rgba(212,175,55,0.1)" strokeWidth="1" />
                <text x={PAD.left - 4} y={y + 4} textAnchor="end" fill="#8b7355" fontSize="9">
                  {formatAmount(maxY * frac)}
                </text>
              </g>
            )
          })}

          {/* Baseline dashed line */}
          {baseline > 0 && (
            <line
              x1={PAD.left} y1={baselineY}
              x2={PAD.left + CHART_W} y2={baselineY}
              stroke="#d4af37" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.6"
            />
          )}

          {/* Spending polyline */}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#d4af37"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Dots + invisible hit targets */}
          {filtered.map((p, i) => {
            const cx = xOf(i)
            const cy = yOf(Number(p.spending))
            return (
              <g key={p.date}>
                <circle cx={cx} cy={cy} r={DOT_R} fill={dotColor(p.status)} stroke="rgba(26,15,10,0.8)" strokeWidth="1.5" />
                <circle
                  cx={cx} cy={cy} r={HIT_R}
                  fill="transparent"
                  style={{ cursor: 'default' }}
                  onMouseEnter={(e) => showTooltip(p, e.clientX, e.clientY)}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    const t = e.touches[0]
                    showTooltip(p, t.clientX, t.clientY)
                  }}
                />
              </g>
            )
          })}

          {/* X-axis labels */}
          {labelIdxs.map((i) => (
            <text key={filtered[i].date} x={xOf(i)} y={H - 4} textAnchor="middle" fill="#8b7355" fontSize="9">
              {filtered[i].date.slice(5)}
            </text>
          ))}
        </svg>

        {/* DOM tooltip — readable at any viewport size */}
        {tooltip && (() => {
          const cats = tooltip.point.categories || []
          const TOOLTIP_W = 160
          const left = Math.min(tooltip.clientX + 12, window.innerWidth - TOOLTIP_W - 8)
          const top = tooltip.clientY - 10
          return (
            <div
              className="fixed z-50 pointer-events-none bg-[#1a0f0a] border border-gold/30 rounded px-2 py-1.5 text-xs text-parchment shadow-lg"
              style={{ left, top, minWidth: TOOLTIP_W }}
            >
              <div className="text-gold font-semibold">{tooltip.point.date}&nbsp;&nbsp;{formatAmount(Number(tooltip.point.spending))}</div>
              {cats.map((c) => (
                <div key={c.category_name} className="flex justify-between gap-3 mt-0.5 text-parchment/80">
                  <span>{c.category_name}</span>
                  <span className="shrink-0">{formatAmount(Number(c.total))}</span>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
