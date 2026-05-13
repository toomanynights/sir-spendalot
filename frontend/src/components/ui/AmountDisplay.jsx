import { formatAmount } from '../../utils/format'

export function AmountDisplay({ amount, className = 'font-bold text-sm' }) {
  const num = parseFloat(amount)
  const colorClass = num < 0 ? 'text-success' : 'text-danger'
  const sign = num < 0 ? '+' : '−'
  return (
    <span className={[className, colorClass].filter(Boolean).join(' ')}>
      {sign}{formatAmount(num)}
    </span>
  )
}
