import { AlertCircle, TrendingDown, Calendar } from 'lucide-react'
import { useForecast, useLowestPoints } from '../../hooks/usePredictions'
import { useSettings } from '../../hooks/useSettings'
import { useSelectedAccount } from '../../contexts/AccountContext'
import { Card, CardHeader, CardBody } from '../ui/Card'
import { LoadingScreen } from '../ui/Spinner'
import { formatSigned, formatRelativeDate } from '../../utils/format'

export default function LowestFortune() {
  const { selectedAccount, selectedId } = useSelectedAccount()
  const { data: settings } = useSettings()
  const horizonDays = settings?.prediction_horizon_days ?? 90
  const { data: lowestPoints, isLoading, error } = useLowestPoints(2, selectedId)
  const { data: forecast } = useForecast(horizonDays, selectedId)

  // Only show "Lowest Fortunes" (perils) on primary accounts by default.
  // Savings/Non-primary accounts often have low churn, making these predictions
  // less meaningful and often confusing.
  if (selectedAccount && !selectedAccount.is_primary) {
    return null
  }

  if (isLoading) {
    return (
      <Card shimmer>
        <CardHeader icon={<TrendingDown size={20} />} title="Thy Lowest Fortunes" />
        <CardBody>
          <LoadingScreen message="Consulting the stars…" />
        </CardBody>
      </Card>
    )
  }

  if (error) {
    return (
      <Card danger shimmer>
        <CardHeader icon={<AlertCircle size={20} />} title="Thy Lowest Fortunes" />
        <CardBody>
          <p className="text-danger font-crimson italic text-sm">
            Hark! The future is clouded in darkness.
          </p>
        </CardBody>
      </Card>
    )
  }

  // FIX: The backend returns { account_id, perils: [...] }
  const points = lowestPoints?.perils || []
  const isAlreadySubZero = Number.parseFloat(forecast?.actual_balance) < 0
  const firstBelowZero = forecast?.forecast?.find(
    (row) => Number.parseFloat(row.predicted_balance) < 0
  )

  return (
    <Card shimmer>
      <CardHeader icon={<TrendingDown size={20} />} title="Thy Lowest Fortunes" />
      <CardBody>
        {isAlreadySubZero ? (
          <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2">
            <p className="text-sm font-semibold text-danger">
              The treasury is sub-zero, m&apos;lord.
            </p>
          </div>
        ) : firstBelowZero ? (
          <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-danger/80">
              Falls below zero
            </p>
            <p className="text-sm font-semibold text-danger">
              {formatRelativeDate(firstBelowZero.date)}
            </p>
          </div>
        ) : null}

        {points.length === 0 ? (
          <p className="text-gold-muted/50 text-sm font-crimson italic py-4 text-center">
            No perils detected in the coming {horizonDays} days.
          </p>
        ) : (
          <div className="space-y-4">
            {points.map((point, idx) => (
              <div key={point.date} className="flex items-center justify-between p-3 rounded-md bg-black/20 border border-gold/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold shrink-0">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-gold-muted tracking-wide uppercase mb-0.5">
                      {idx === 0 ? 'Next Peril' : 'Following Peril'}
                    </p>
                    <p className="font-bold text-gold leading-tight">
                      {formatRelativeDate(point.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col justify-center">
                  <p className={`font-bold text-xl ${parseFloat(point.predicted_balance) < 0 ? 'text-danger' : 'text-gold'}`}>
                    {formatSigned(point.predicted_balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-gold/10">
          <p className="text-[10px] text-gold-muted/40 uppercase tracking-[0.2em] text-center">
            Forecasted over the next {horizonDays} days
          </p>
        </div>
      </CardBody>
    </Card>
  )
}
