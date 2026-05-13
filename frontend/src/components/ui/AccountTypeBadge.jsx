import { Badge } from './Badge'

export function AccountTypeBadge({ type, className = '' }) {
  if (type === 'savings') {
    return <Badge variant="muted" className={className}>Savings</Badge>
  }
  return null
}
