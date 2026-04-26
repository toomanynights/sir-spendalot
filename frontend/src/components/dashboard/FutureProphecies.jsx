import { useState } from 'react'
import { Scroll, Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePredictionInstances, useConfirmInstance, useSkipInstance } from '../../hooks/usePredictions'
import { usePaymentMethods } from '../../hooks/usePaymentMethods'
import { useSelectedAccount } from '../../contexts/AccountContext'
import { Card, CardHeader, CardBody } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Input, Select } from '../ui/Input'
import { formatAmount, formatRelativeDate } from '../../utils/format'

const PAGE_SIZE = 5

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-md bg-black/20 animate-pulse">
      <div className="flex-1 space-y-1.5 pr-4">
        <div className="h-2.5 bg-gold/10 rounded w-2/5" />
        <div className="h-2 bg-gold/10 rounded w-1/3" />
      </div>
      <div className="h-3 bg-gold/10 rounded w-16" />
    </div>
  )
}

function ProphecyRow({ instance }) {
  const today = todayStr()
  const isOverdue = instance.scheduled_date < today

  const [expanded, setExpanded] = useState(false)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [paymentMethodId, setPaymentMethodId] = useState(
    instance.template_payment_method_id ? String(instance.template_payment_method_id) : ''
  )

  const { data: paymentMethods } = usePaymentMethods()
  const confirm = useConfirmInstance()
  const skip = useSkipInstance()

  const isBusy = confirm.isPending || skip.isPending

  function handleQuickConfirm() {
    confirm.mutate({ id: instance.id, create_transaction: true })
  }

  function handleExpandedConfirm() {
    const payload = { id: instance.id, create_transaction: true }
    if (amount) payload.confirmed_amount = Math.abs(parseFloat(amount))
    if (date) payload.confirmed_date = date
    if (paymentMethodId) payload.payment_method_id = parseInt(paymentMethodId, 10)
    confirm.mutate(payload, { onSuccess: () => setExpanded(false) })
  }

  function handleSkip() {
    skip.mutate(instance.id)
  }

  return (
    <div className="rounded-md bg-black/20 border-l-4 border-gold/40">
      {/* Main row */}
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate leading-tight">
            {instance.template_name}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gold-muted">
              {formatRelativeDate(instance.scheduled_date + 'T12:00:00')}
              {' · '}
              {formatAmount(instance.amount)}
            </span>
            {isOverdue && <Badge variant="danger">Overdue</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <button
            onClick={handleSkip}
            disabled={isBusy}
            className="btn btn-ghost text-xs px-2 py-1 disabled:opacity-40"
          >
            Skip
          </button>
          <button
            onClick={handleQuickConfirm}
            disabled={isBusy}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded font-bold bg-gold/20 text-gold hover:bg-gold/30 transition-colors disabled:opacity-40"
          >
            <Check size={11} />
            Confirm
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            disabled={isBusy}
            className="btn btn-ghost p-1 text-gold-muted/60 hover:text-gold disabled:opacity-40"
            title="Adjust before confirming"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expandable adjust-and-confirm form */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gold/10 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={formatAmount(instance.amount)}
            />
            <Input
              label="Date"
              type="date"
              value={date}
              max={todayStr()}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <Select
            label="Payment Method"
            value={paymentMethodId}
            onChange={e => setPaymentMethodId(e.target.value)}
          >
            <option value="">— None —</option>
            {(paymentMethods ?? []).map(pm => (
              <option key={pm.id} value={String(pm.id)}>
                {pm.name}
              </option>
            ))}
          </Select>
          <button
            onClick={handleExpandedConfirm}
            disabled={confirm.isPending}
            className="btn btn-primary w-full text-sm disabled:opacity-40"
          >
            Record & Confirm
          </button>
        </div>
      )}
    </div>
  )
}

export default function FutureProphecies() {
  const { selectedId } = useSelectedAccount()
  const [page, setPage] = useState(0)

  const { data: instances, isLoading, error } = usePredictionInstances(
    selectedId
      ? { account_id: selectedId, status: 'pending', next_per_template: true }
      : null
  )

  const all = instances ?? []
  const paginated = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const hasPrev = page > 0
  const hasNext = (page + 1) * PAGE_SIZE < all.length

  return (
    <Card shimmer>
      <CardHeader icon={<Scroll size={20} />} title="Future Prophecies">
        {page > 0 && (
          <span className="ml-auto text-xs text-gold-muted/60 font-crimson italic">
            Page {page + 1}
          </span>
        )}
      </CardHeader>

      <CardBody className="pb-4">
        {error && (
          <p className="text-danger font-crimson italic text-sm">
            Hark! The prophecies could not be retrieved.
          </p>
        )}

        {isLoading && (
          <div className="space-y-2">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {!isLoading && !error && all.length === 0 && (
          <p className="text-gold-muted/60 font-crimson italic text-sm text-center py-4">
            Thy future holds no prophesied deeds.
          </p>
        )}

        {!isLoading && !error && paginated.length > 0 && (
          <div className="space-y-2">
            {paginated.map(instance => (
              <ProphecyRow key={instance.id} instance={instance} />
            ))}
          </div>
        )}

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
