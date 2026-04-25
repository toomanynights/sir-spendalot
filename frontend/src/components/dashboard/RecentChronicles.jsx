import { useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useTransactions, useUpdateTransaction } from '../../hooks/useTransactions'
import { useSelectedAccount } from '../../contexts/AccountContext'
import { Card, CardHeader, CardBody } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { formatAmount, formatRelativeDate } from '../../utils/format'

const PAGE_SIZE = 5

const TYPE_LABELS = {
  daily:      'Daily',
  unplanned:  'Unplanned',
  predicted:  'Scheduled',
  transfer:   'Transfer',
  correction: 'Correction',
}

const TYPE_BADGE_VARIANT = {
  daily:      'muted',
  unplanned:  'danger',
  predicted:  'primary',
  transfer:   'muted',
  correction: 'muted',
}

function rowBorderClass(tx) {
  if (tx.type === 'transfer' || tx.type === 'correction') return 'border-l-4 border-gold/60'
  return parseFloat(tx.amount) < 0 ? 'tx-row-income' : 'tx-row-expense'
}

function AmountDisplay({ amount }) {
  const num = parseFloat(amount)
  if (num < 0) {
    return <span className="font-bold text-sm text-success">+{formatAmount(num)}</span>
  }
  return <span className="font-bold text-sm text-danger">−{formatAmount(num)}</span>
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-md bg-black/20 animate-pulse">
      <div className="flex-1 space-y-1.5 pr-4">
        <div className="h-2.5 bg-gold/10 rounded w-1/3" />
        <div className="h-2 bg-gold/10 rounded w-1/2" />
      </div>
      <div className="h-3 bg-gold/10 rounded w-12" />
    </div>
  )
}

function DateGroupLabel({ dateStr }) {
  const label = formatRelativeDate(dateStr + 'T12:00:00')
  return (
    <p className="text-xs tracking-widest uppercase text-gold-muted/50 font-cinzel pt-2 pb-0.5 first:pt-0">
      {label}
    </p>
  )
}

function TransactionRow({ tx }) {
  const updateTx = useUpdateTransaction()
  const isUnconfirmed = !tx.confirmed

  const primaryLabel =
    tx.type === 'transfer' || tx.type === 'correction'
      ? TYPE_LABELS[tx.type]
      : (tx.top_category_name ?? tx.category_name ?? tx.description ?? '—')

  const metaParts = [
    tx.subcategory,
    tx.payment_method_name,
  ].filter(Boolean)

  function handleConfirm(e) {
    e.stopPropagation()
    updateTx.mutate({ id: tx.id, confirmed: true })
  }

  return (
    <div
      className={[
        'flex items-center justify-between px-3 py-2 rounded-md bg-black/20',
        rowBorderClass(tx),
        isUnconfirmed ? 'opacity-60' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Left: category + meta */}
      <div className="flex-1 min-w-0 pr-3">
        <p className="text-sm font-semibold truncate leading-tight">{primaryLabel}</p>
        {metaParts.length > 0 && (
          <p className="text-xs text-gold-muted truncate leading-tight mt-0.5">
            {metaParts.join(' · ')}
          </p>
        )}
      </div>

      {/* Right: amount + badges */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <AmountDisplay amount={tx.amount} />
        <div className="flex items-center gap-1 flex-wrap justify-end">
          <Badge variant={TYPE_BADGE_VARIANT[tx.type] ?? 'muted'}>
            {TYPE_LABELS[tx.type] ?? tx.type}
          </Badge>
          {isUnconfirmed && (
            <button
              onClick={handleConfirm}
              disabled={updateTx.isPending}
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/40 transition-colors disabled:opacity-50"
              title="Confirm this transaction"
            >
              <Check size={10} />
              Confirm
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RecentChronicles() {
  const { selectedId } = useSelectedAccount()
  const [page, setPage] = useState(0)

  const { data: transactions, isLoading, error } = useTransactions(
    selectedId
      ? { account_id: selectedId, limit: PAGE_SIZE, offset: page * PAGE_SIZE }
      : null
  )

  const hasNext = transactions?.length === PAGE_SIZE
  const hasPrev = page > 0

  // Group transactions by date
  const groups = []
  if (transactions) {
    let currentDate = null
    for (const tx of transactions) {
      if (tx.transaction_date !== currentDate) {
        currentDate = tx.transaction_date
        groups.push({ date: currentDate, items: [] })
      }
      groups[groups.length - 1].items.push(tx)
    }
  }

  return (
    <Card shimmer>
      <CardHeader icon={<BookOpen size={20} />} title="Recent Chronicles">
        {/* Show page number only when navigating past page 1 */}
        {page > 0 && (
          <span className="ml-auto text-xs text-gold-muted/60 font-crimson italic">
            Page {page + 1}
          </span>
        )}
      </CardHeader>

      <CardBody className="pb-4">
        {error && (
          <p className="text-danger font-crimson italic text-sm">
            Hark! The chronicles could not be retrieved.
          </p>
        )}

        {isLoading && (
          <div className="space-y-2">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {!isLoading && !error && transactions?.length === 0 && (
          <p className="text-gold-muted/60 font-crimson italic text-sm text-center py-4">
            Thy treasury holds no chronicles yet.
          </p>
        )}

        {!isLoading && !error && groups.length > 0 && (
          <div className="space-y-1">
            {groups.map(({ date, items }) => (
              <div key={date}>
                <DateGroupLabel dateStr={date} />
                <div className="space-y-1">
                  {items.map(tx => (
                    <TransactionRow key={tx.id} tx={tx} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {(hasPrev || hasNext) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gold/10">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={!hasPrev}
              className="flex items-center gap-1 btn btn-ghost text-sm disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNext}
              className="flex items-center gap-1 btn btn-ghost text-sm disabled:opacity-30"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
