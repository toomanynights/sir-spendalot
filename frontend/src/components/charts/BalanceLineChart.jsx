import { useMemo, useRef, useState } from 'react'
import { formatAmount } from '../../utils/format'

const W = 600
const H = 160
const PAD = { top: 12, right: 12, bottom: 28, left: 64 }
const CHART_W = W - PAD.left - PAD.right
const CHART_H = H - PAD.top - PAD.bottom
const DOT_R = 4
const HIT_R = 11

export default function BalanceLineChart({ points }) {
  const [tooltip, setTooltip] = useState(null)
  const clearTimer = useRef(null)

  const filtered = useMemo(() => (points || []).filter(Boolean), [points])

  if (!filtered.length) return (
    <p className="text-gold-muted/60 font-crimson italic text-sm">
      No balance history available for this period.
    </p>
  )

  const values = filtered.map((p) => Number(p.balance))
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1
  const paddedMin = minVal - range * 0.08
  const paddedMax = maxVal + range * 0.08
  const paddedRange = paddedMax - paddedMin

  const n = filtered.length
  const xOf = (i) => PAD.left + (n === 1 ? CHART_W / 2 : (i / (n - 1)) * CHART_W)
  const yOf = (v) => PAD.top + CHART_H - ((v - paddedMin) / paddedRange) * CHART_H

  const zeroY = yOf(0)
  const showZeroLine = paddedMin < 0 && paddedMax > 0
  const polylinePoints = filtered.map((p, i) => `${xOf(i)},${yOf(Number(p.balance))}`).join(' ')

  const labelIdxs = useMemo(() => {
    if (n <= 5) return filtered.map((_, i) => i)
    const step = Math.floor(n / 4)
    const idxs = [0]
    for (let i = step; i < n - 1; i += step) idxs.push(i)
    idxs.push(n - 1)
    return [...new Set(idxs)]
  }, [n, filtered])

  const gridTicks = useMemo(() => {
    const ticks = []
    for (let i = 0; i <= 3; i++) ticks.push(paddedMin + (paddedRange * i) / 3)
    return ticks
  }, [paddedMin, paddedRange])

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
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 180 }}
        aria-hidden="true"
        onMouseLeave={() => hideTooltip()}
        onTouchEnd={() => hideTooltip(1500)}
      >
        {/* Y-axis grid */}
        {gridTicks.map((v, idx) => {
          const y = yOf(v)
          return (
            <g key={idx}>
              <line x1={PAD.left} y1={y} x2={PAD.left + CHART_W} y2={y} stroke="rgba(212,175,55,0.1)" strokeWidth="1" />
              <text x={PAD.left - 4} y={y + 4} textAnchor="end" fill="#8b7355" fontSize="9">
                {formatAmount(v)}
              </text>
            </g>
          )
        })}

        {/* Zero line */}
        {showZeroLine && (
          <line x1={PAD.left} y1={zeroY} x2={PAD.left + CHART_W} y2={zeroY} stroke="#cd5c5c" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
        )}

        {/* Balance polyline */}
        <polyline points={polylinePoints} fill="none" stroke="#d4af37" strokeWidth="2" strokeLinejoin="round" />

        {/* Dots + invisible hit targets */}
        {filtered.map((p, i) => {
          const cx = xOf(i)
          const cy = yOf(Number(p.balance))
          const isNeg = Number(p.balance) < 0
          return (
            <g key={p.date}>
              <circle cx={cx} cy={cy} r={DOT_R} fill={isNeg ? '#cd5c5c' : '#d4af37'} opacity="0.7" />
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
        const TOOLTIP_W = 160
        const left = Math.min(tooltip.clientX + 12, window.innerWidth - TOOLTIP_W - 8)
        const top = tooltip.clientY - 10
        const bal = Number(tooltip.point.balance)
        return (
          <div
            className="fixed z-50 pointer-events-none bg-[#1a0f0a] border border-gold/30 rounded px-2 py-1.5 text-xs shadow-lg"
            style={{ left, top, minWidth: TOOLTIP_W }}
          >
            <span className="text-gold">{tooltip.point.date}</span>
            <span className={`ml-2 font-semibold ${bal < 0 ? 'text-danger' : 'text-parchment'}`}>
              {formatAmount(bal)}
            </span>
          </div>
        )
      })()}
    </div>
  )
}
