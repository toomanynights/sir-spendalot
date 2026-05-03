import { useCallback, useEffect, useMemo, useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { Portal } from './ui/Portal'
import { Button } from './ui/Button'
import Tooltip from './ui/Tooltip'
import { accountsApi } from '../api/accounts'
import { ApiError } from '../api/client'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import { useCreateCheckup } from '../hooks/useCheckups'
import { formatSigned } from '../utils/format'
import './checkup-modal.css'

const SUNDRY_KEY = 'sundry'

function parseAmount(raw) {
  if (raw === '' || raw == null) return 0
  const cleaned = String(raw).replace(',', '.').trim()
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function diffExplanation(diff) {
  if (diff === 0) {
    return "The ledger and reality agree. A clean reckoning — no correction needed."
  }
  if (diff > 0) {
    return "The ledger believes the realm hath more coin than reality showeth. Submitting will record an expense correction so the books match thy actual purse."
  }
  return "The ledger hath underestimated thy coin — perhaps untracked income or refunds. Submitting will record a gain correction so the books match thy actual purse."
}

export default function CheckupModal({ account, onClose, onSuccess }) {
  const [currentBalance, setCurrentBalance] = useState(
    account?.current_balance != null ? String(account.current_balance) : ''
  )
  const [amounts, setAmounts] = useState({})
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const { data: paymentMethods = [] } = usePaymentMethods()
  const createCheckup = useCreateCheckup()

  const refreshBalance = useCallback(async () => {
    if (!account?.id) return
    try {
      const fresh = await accountsApi.get(account.id)
      setCurrentBalance(String(fresh.current_balance))
    } catch {
      // keep last-known value
    }
  }, [account?.id])

  useEffect(() => {
    refreshBalance()
  }, [refreshBalance])

  const ledger = parseFloat(currentBalance || '0') || 0

  const reportedTotal = useMemo(() => {
    let sum = 0
    for (const pm of paymentMethods) {
      sum += parseAmount(amounts[String(pm.id)])
    }
    sum += parseAmount(amounts[SUNDRY_KEY])
    return Math.round(sum * 100) / 100
  }, [amounts, paymentMethods])

  const diff = useMemo(
    () => Math.round((ledger - reportedTotal) * 100) / 100,
    [ledger, reportedTotal]
  )

  const hasAnyEntry = Object.values(amounts).some(
    (v) => String(v ?? '').trim() !== ''
  )

  function setField(key, value) {
    setAmounts((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!hasAnyEntry) {
      setError('Hark! Enter at least one amount before reconciling.')
      return
    }
    try {
      const breakdowns = []
      for (const pm of paymentMethods) {
        const raw = amounts[String(pm.id)]
        if (raw === '' || raw == null) continue
        breakdowns.push({
          payment_method_id: pm.id,
          amount: parseAmount(raw),
        })
      }
      const sundryRaw = amounts[SUNDRY_KEY]
      if (sundryRaw !== '' && sundryRaw != null) {
        breakdowns.push({
          payment_method_id: null,
          amount: parseAmount(sundryRaw),
        })
      }

      await createCheckup.mutateAsync({
        accountId: account.id,
        breakdowns,
        note: note.trim() || undefined,
      })
      if (onSuccess) await onSuccess()
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Alas! The reckoning could not be recorded.'
      )
    }
  }

  const diffClass =
    diff === 0 ? 'checkup-diff-balanced' : diff > 0 ? 'checkup-diff-over' : 'checkup-diff-under'

  return (
    <Portal>
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-xl rounded-lg border border-gold/30 shadow-card bg-brown-dark max-h-[90vh] overflow-y-auto">
        <div className="card-header">
          <h3 className="card-title">Reconcile - {account?.name}</h3>
          <Button variant="ghost" className="ml-auto" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
        <form className="card-body space-y-5" onSubmit={handleSubmit}>
          <div className="checkup-summary">
            <div>
              <span className="input-label">Ledger balance</span>
              <p className="text-lg text-gold font-cinzel">{formatSigned(ledger)}</p>
              <Button
                type="button"
                variant="ghost"
                className="text-xs mt-1 px-0"
                onClick={() => refreshBalance()}
              >
                Refresh from ledger
              </Button>
            </div>
            <div className="checkup-summary-totals">
              <div>
                <span className="input-label">Reported total</span>
                <p className="text-lg font-cinzel text-parchment">
                  {formatSigned(reportedTotal)}
                </p>
              </div>
              <div>
                <span className="input-label flex items-center gap-1">
                  Difference
                  <Tooltip content={diffExplanation(diff)}>
                    <span className="text-gold-muted/70 cursor-help">
                      <HelpCircle size={12} />
                    </span>
                  </Tooltip>
                </span>
                <p className={`text-lg font-cinzel ${diffClass}`}>
                  {diff === 0 ? formatSigned(0) : formatSigned(diff)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="input-label">Per payment method</p>
            <div className="checkup-grid">
              {paymentMethods.map((pm) => (
                <label key={pm.id} className="checkup-row">
                  <span className="checkup-row-name">{pm.name}</span>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="input checkup-row-input"
                    value={amounts[String(pm.id)] ?? ''}
                    onChange={(e) => setField(String(pm.id), e.target.value)}
                  />
                </label>
              ))}
              <label className="checkup-row checkup-row-sundry">
                <span className="checkup-row-name flex items-center gap-1">
                  Sundry coin
                  <Tooltip content="Any sums that don't fit a named payment method — cash gifts, found coin, etc.">
                    <span className="text-gold-muted/70 cursor-help">
                      <HelpCircle size={12} />
                    </span>
                  </Tooltip>
                </span>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="input checkup-row-input"
                  value={amounts[SUNDRY_KEY] ?? ''}
                  onChange={(e) => setField(SUNDRY_KEY, e.target.value)}
                />
              </label>
            </div>
            <p className="text-xs text-gold-muted/70 font-crimson italic">
              Empty fields count as zero. Leave them blank if thou hast no coin in that purse.
            </p>
          </div>

          <label className="block">
            <span className="input-label">Note (optional)</span>
            <input
              className="input"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. End-of-month reckoning"
            />
          </label>

          {error ? <p className="text-sm text-danger font-crimson">{error}</p> : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={createCheckup.isPending || !hasAnyEntry}
            >
              {createCheckup.isPending ? 'Reconciling…' : 'Reconcile the books'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  )
}
