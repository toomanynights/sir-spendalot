import { useEffect, useMemo, useState } from 'react'
import { Crown, PiggyBank, Wallet } from 'lucide-react'
import { accountsApi } from '../api/accounts'
import { useSelectedAccount } from '../contexts/AccountContext'
import { usePredictionInstances } from '../hooks/usePredictions'
import { useSettings } from '../hooks/useSettings'
import { Badge } from './ui/Badge'
import { Spinner } from './ui/Spinner'

/**
 * Renders a row of clickable account tabs.
 *
 * - Primary account always listed first, with a crown icon.
 * - Savings-type accounts get a "Savings" badge.
 * - The active account uses the .btn-active visual state.
 * - Selection is persisted in AccountContext (→ localStorage).
 */
export default function AccountSwitcher() {
  const { accounts, selectedId, setAccount } = useSelectedAccount()
  const { data: settings } = useSettings()
  const { data: pendingInstances = [] } = usePredictionInstances({ status: 'pending' })
  const [checkupDueByAccount, setCheckupDueByAccount] = useState({})
  const safeAccounts = accounts || []

  // Primary first, then sorted by id for stable order.
  const sorted = useMemo(() => {
    return [...safeAccounts].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1
      if (!a.is_primary && b.is_primary) return 1
      return a.id - b.id
    })
  }, [safeAccounts])

  const topbarDotEnabled = settings?.topbar_attention_dot_enabled ?? true
  const todayIso = useMemo(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`
  }, [])

  const pendingByAccount = useMemo(() => {
    const byAccount = {}
    for (const instance of pendingInstances) {
      if (instance.scheduled_date > todayIso) continue
      const accountId = Number(instance.account_id)
      byAccount[accountId] = true
    }
    return byAccount
  }, [pendingInstances, todayIso])

  useEffect(() => {
    let cancelled = false
    const threshold = Number(settings?.checkup_notification_days ?? 30)

    function diffDays(fromDateStr) {
      const last = new Date(fromDateStr)
      if (Number.isNaN(last.getTime())) return null
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfLast = new Date(last.getFullYear(), last.getMonth(), last.getDate())
      return Math.max(0, Math.round((startOfToday - startOfLast) / 86_400_000))
    }

    async function loadCheckupAttention() {
      const result = {}
      await Promise.all(
        safeAccounts.map(async (account) => {
          try {
            const rows = await accountsApi.listCheckups(account.id)
            const lastDate = rows?.[0]?.checkup_date ?? null
            if (lastDate == null) {
              result[account.id] = true
              return
            }
            const days = diffDays(lastDate)
            result[account.id] = days != null && days > threshold
          } catch {
            result[account.id] = false
          }
        })
      )
      if (!cancelled) {
        setCheckupDueByAccount(result)
      }
    }

    loadCheckupAttention()
    return () => {
      cancelled = true
    }
  }, [safeAccounts, settings?.checkup_notification_days])

  if (!accounts) {
    return <Spinner size="sm" className="mb-6" />
  }

  if (accounts.length === 0) return null

  return (
    <div className="account-switcher-scroll" role="tablist" aria-label="Account switcher">
      {sorted.map((account) => {
        const isActive = account.id === selectedId
        const isSavings = account.account_type === 'savings'
        const showAttentionDot =
          topbarDotEnabled &&
          (Boolean(checkupDueByAccount[account.id]) || Boolean(pendingByAccount[account.id]))

        return (
          <button
            key={account.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => setAccount(account.id)}
            className={['btn flex items-center gap-2', isActive ? 'btn-active' : ''].filter(Boolean).join(' ')}
          >
            {account.is_primary
              ? <Crown size={14} className="text-gold shrink-0" aria-label="Primary account" />
              : isSavings
                ? <PiggyBank size={14} className="text-gold-muted shrink-0" />
                : <Wallet size={14} className="text-gold-muted shrink-0" />
            }
            <span>{account.name}</span>
            {showAttentionDot ? (
              <span
                className="topbar-attention-dot"
                aria-hidden="true"
                title="Attention needed: pending prophecy or checkup due."
              />
            ) : null}
            {isSavings && (
              <Badge variant="muted" className="ml-1 hidden sm:inline-block">Savings</Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}
