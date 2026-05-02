import { useState } from 'react'
import {
  AlertCircle,
  ArrowLeftRight,
  CalendarX2,
  ClipboardCheck,
  Scale,
  Sun,
} from 'lucide-react'
import { useTodayStats } from '../../hooks/useStats'
import { useAccounts } from '../../hooks/useAccounts'
import { useSelectedAccount } from '../../contexts/AccountContext'
import { useCreateExcludedDay } from '../../hooks/useSettings'
import { Card, CardHeader, CardBody } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoadingScreen } from '../ui/Spinner'
import BalanceCorrectionModal from '../BalanceCorrectionModal'
import TransferModal from '../TransferModal'
import CheckupModal from '../CheckupModal'
import { formatAmount, formatSigned } from '../../utils/format'
import '../checkup-modal.css'

export default function TodayFortune() {
  const { selectedAccount, selectedId } = useSelectedAccount()
  const { data: stats, isLoading, error } = useTodayStats(selectedId)
  const { data: accounts } = useAccounts()
  const createExcludedDay = useCreateExcludedDay()
  const isPrimary = selectedAccount?.is_primary

  const [showCorrection, setShowCorrection] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showCheckup, setShowCheckup] = useState(false)

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
  const overdueDebt = parseFloat(stats.overdue_pending_debt ?? 0)
  const flexibleDaily = parseFloat(stats.flexible_daily ?? 0)
  const todayPending = parseFloat(stats.today_pending_total ?? 0)
  const rollingAvg = parseFloat(stats.rolling_avg_daily_spend)
  const { daily, unplanned, predicted: predictedSpend } = stats.spending_today
  const totalOutgoings = parseFloat(daily) + parseFloat(unplanned) + parseFloat(predictedSpend)

  const highMult = (stats.daily_high_threshold ?? 110) / 100
  const lowMult = (stats.daily_low_threshold ?? 90) / 100
  const rollingWindowDays = stats.rolling_average_days ?? 30

  const actualClass = actual >= 0 ? 'stat-value-green' : 'stat-value-danger'
  const predictedClass = predicted >= 0 ? 'text-xl font-bold text-gold' : 'text-xl font-bold text-danger'

  const checkupThreshold = stats.checkup_notification_days ?? 30
  const daysSince = stats.days_since_last_checkup
  const checkupOverdue = daysSince === null || daysSince === undefined || daysSince > checkupThreshold
  const accountName = selectedAccount?.name || 'this account'
  const overdueText =
    daysSince === null || daysSince === undefined
      ? `${accountName} hath never been reconciled.`
      : `It hath been ${daysSince} days since ${accountName} was reconciled.`

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <>
      <Card shimmer>
        <CardHeader icon={<Sun size={20} />} title="This Day's Fortune" />

        <CardBody>
          <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="stat-label">Current Balance</p>
              <p className={actualClass}>{formatSigned(actual)}</p>
            </div>
            {selectedAccount ? (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-2"
                  title="Balance correction"
                  onClick={() => setShowCorrection(true)}
                >
                  <Scale size={18} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-2"
                  title="Transfer between accounts"
                  onClick={() => setShowTransfer(true)}
                >
                  <ArrowLeftRight size={18} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-2"
                  title="Reconcile (checkup)"
                  onClick={() => setShowCheckup(true)}
                >
                  <ClipboardCheck size={18} />
                </Button>
              </div>
            ) : null}
          </div>

          {isPrimary && (
            <div className="mb-5">
              <p className="stat-label">End-of-Day Forecast</p>
              <p className={predictedClass}>{formatSigned(predicted)}</p>
              <ForecastBreakdown
                balance={actual}
                overdueDebt={overdueDebt}
                flexibleDaily={flexibleDaily}
                todayPending={todayPending}
              />
            </div>
          )}

          {checkupOverdue && selectedAccount ? (
            <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <p className="text-sm font-semibold text-amber-400">
                {overdueText}
              </p>
              <button
                type="button"
                className="text-xs text-amber-400/80 hover:text-amber-300 mt-1 underline"
                onClick={() => setShowCheckup(true)}
              >
                Reconcile now
              </button>
            </div>
          ) : null}

          <div className="divider-gold" />

          <div className="flex items-baseline justify-between mb-3">
            <p className="stat-label mb-0">Today's Outgoings</p>
            <div className="flex items-center gap-2">
              {totalOutgoings > 0 && (
                <p className="text-sm font-bold text-danger">−{formatAmount(totalOutgoings)}</p>
              )}
              {stats.today_excluded ? (
                <span className="text-xs text-amber-400 font-crimson italic">Excluded day</span>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  className="!px-1.5 !py-0.5 text-xs text-gold-muted/50 hover:text-gold-muted"
                  title="Exclude today from daily average"
                  onClick={() => createExcludedDay.mutate({ excluded_date: todayStr })}
                  disabled={createExcludedDay.isPending}
                >
                  <CalendarX2 size={13} />
                </Button>
              )}
            </div>
          </div>

          <div className={isPrimary ? "grid grid-cols-3 gap-3" : "grid grid-cols-2 gap-3"}>
            {isPrimary && (
              <SpendingCell label="Daily" value={daily} rollingAvg={rollingAvg} highMult={highMult} lowMult={lowMult} />
            )}
            <SpendingCell label="Unplanned" value={unplanned} />
            <SpendingCell label="Scheduled" value={predictedSpend} />
          </div>

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

      {/* Modals rendered outside Card to avoid stacking-context z-index issues */}
      {showCorrection && selectedAccount ? (
        <BalanceCorrectionModal
          account={selectedAccount}
          onClose={() => setShowCorrection(false)}
        />
      ) : null}
      {showTransfer && selectedAccount ? (
        <TransferModal
          fromAccount={selectedAccount}
          accounts={accounts || []}
          onClose={() => setShowTransfer(false)}
        />
      ) : null}
      {showCheckup && selectedAccount ? (
        <CheckupModal
          account={selectedAccount}
          onClose={() => setShowCheckup(false)}
        />
      ) : null}
    </>
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

function ForecastBreakdown({ balance, overdueDebt, flexibleDaily, todayPending }) {
  const parts = []

  parts.push(
    <span key="balance" className="text-gold-muted/60">
      {formatAmount(Math.abs(balance))}
    </span>
  )

  if (overdueDebt > 0) {
    parts.push(
      <span key="sep-overdue" className="text-gold-muted/30 mx-0.5">−</span>,
      <span key="overdue" className="text-amber-400/70">{formatAmount(overdueDebt)} overdue</span>
    )
  }

  if (flexibleDaily > 0) {
    parts.push(
      <span key="sep-daily" className="text-gold-muted/30 mx-0.5">−</span>,
      <span key="daily" className="text-gold-muted/50">{formatAmount(flexibleDaily)} daily est.</span>
    )
  }

  if (todayPending > 0) {
    parts.push(
      <span key="sep-sched" className="text-gold-muted/30 mx-0.5">−</span>,
      <span key="sched" className="text-gold-muted/50">{formatAmount(todayPending)} scheduled</span>
    )
  }

  if (parts.length <= 1) return null

  return (
    <p className="mt-1 text-[10px] leading-tight tracking-wide font-crimson italic flex flex-wrap items-baseline gap-y-0.5">
      {parts}
    </p>
  )
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
