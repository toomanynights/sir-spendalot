import { AlertCircle, Sun } from 'lucide-react'
import { useTodayStats } from '../../hooks/useStats'
import { useSelectedAccount } from '../../contexts/AccountContext'
import { Card, CardHeader, CardBody } from '../ui/Card'
import { LoadingScreen } from '../ui/Spinner'
import { formatAmount, formatSigned } from '../../utils/format'

export default function TodayFortune() {
  const { selectedAccount, selectedId } = useSelectedAccount()
  const { data: stats, isLoading, error } = useTodayStats(selectedId)
  const isPrimary = selectedAccount?.is_primary

  if (isLoading) {
    return (
      <Card shimmer>
        <CardHeader icon={<Sun size={20} />} title="This Day's Fortune" />
        <CardBody>
          <LoadingScreen message="Reading the omens…" />
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Card danger shimmer>
        <CardHeader icon={<AlertCircle size={20} />} title="This Day's Fortune" />
        <CardBody>
          <p className="text-danger font-crimson italic text-sm">
            Hark! The oracle hath failed to respond.
          </p>
        </CardBody>
      </Card>
    )
  }

  const actual = parseFloat(stats.actual_balance)
  const predicted = parseFloat(stats.predicted_balance)
  const rollingAvg = parseFloat(stats.rolling_avg_daily_spend)
  const { daily, unplanned, predicted: predictedSpend } = stats.spending_today
  const totalOutgoings = parseFloat(daily) + parseFloat(unplanned) + parseFloat(predictedSpend)

  const highMult = (stats.daily_high_threshold ?? 110) / 100
  const lowMult = (stats.daily_low_threshold ?? 90) / 100
  const rollingWindowDays = stats.rolling_average_days ?? 30

  const actualClass = actual >= 0 ? 'stat-value-green' : 'stat-value-danger'
  const predictedClass = predicted >= 0 ? 'text-xl font-bold text-gold' : 'text-xl font-bold text-danger'

  return (
    <Card shimmer>
      <CardHeader icon={<Sun size={20} />} title="This Day's Fortune" />

      <CardBody>
        {/* Actual balance — hero number */}
        <div className="mb-4">
          <p className="stat-label">Current Balance</p>
          <p className={actualClass}>{formatSigned(actual)}</p>
        </div>

        {/* Predicted end-of-day balance (Primary only) */}
        {isPrimary && (
          <div className="mb-5">
            <p className="stat-label">End-of-Day Forecast</p>
            <p className={predictedClass}>{formatSigned(predicted)}</p>
          </div>
        )}

        <div className="divider-gold" />

        {/* Today's spending breakdown */}
        <div className="flex items-baseline justify-between mb-3">
          <p className="stat-label mb-0">Today's Outgoings</p>
          {totalOutgoings > 0 && (
            <p className="text-sm font-bold text-danger">−{formatAmount(totalOutgoings)}</p>
          )}
        </div>
        {stats.today_excluded && (
          <p className="text-xs text-amber-400 font-crimson italic mt-[-0.35rem] mb-2">
            Excluded day
          </p>
        )}
        <div className={isPrimary ? "grid grid-cols-3 gap-3" : "grid grid-cols-2 gap-3"}>
          {isPrimary && (
            <SpendingCell label="Daily" value={daily} rollingAvg={rollingAvg} highMult={highMult} lowMult={lowMult} />
          )}
          <SpendingCell label="Unplanned" value={unplanned} />
          <SpendingCell label="Scheduled" value={predictedSpend} />
        </div>

        {/* Rolling average (Primary only) */}
        {isPrimary && rollingAvg > 0 && (
          <div className="mt-4 pt-3 border-t border-gold/10 flex items-center justify-between">
            <p className="text-xs text-gold-muted/60 uppercase tracking-wide">
              Daily average ({rollingWindowDays} days)
            </p>
            <p className="text-sm font-bold text-gold-muted">{formatAmount(rollingAvg)} / day</p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

/** @returns {string} Tailwind colour classes for the amount line */
function expenseAmountClass(num, rollingAvg, highMult, lowMult) {
  if (!(num > 0)) return 'text-gold-muted'
  if (rollingAvg && rollingAvg > 0) {
    if (num >= rollingAvg * highMult) return 'text-danger'
    if (num <= rollingAvg * lowMult) return 'text-success'
    return 'text-gold'
  }
  return 'text-danger'
}

function SpendingCell({ label, value, rollingAvg, highMult, lowMult }) {
  const num = parseFloat(value)
  const isExpense = num > 0
  const isRefund = num < 0

  let valueClass = 'font-bold text-sm text-gold-muted/40'
  if (isRefund) {
    valueClass = 'font-bold text-sm text-success'
  } else if (isExpense) {
    if (rollingAvg != null && rollingAvg > 0 && highMult != null && lowMult != null) {
      valueClass = `font-bold text-sm ${expenseAmountClass(num, rollingAvg, highMult, lowMult)}`
    } else {
      valueClass = 'font-bold text-sm text-danger'
    }
  }

  return (
    <div className="text-center p-3 rounded-md bg-black/20">
      <p className="text-xs text-gold-muted tracking-wide mb-1">{label}</p>
      <p className={valueClass}>
        {isExpense ? formatAmount(num)
         : isRefund ? `+${formatAmount(num)}`
         : '—'}
      </p>
    </div>
  )
}
