import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  Crown,
  Landmark,
  Pencil,
  Plus,
  Scale,
  Trash2,
  X,
} from 'lucide-react'
import PageContextHeader from '../components/layout/PageContextHeader'
import { Button } from '../components/ui/Button'
import { accountsApi } from '../api/accounts'
import { categoriesApi } from '../api/categories'
import { paymentMethodsApi } from '../api/paymentMethods'
import { transfersApi } from '../api/transfers'
import { ApiError } from '../api/client'
import { formatSigned } from '../utils/format'
import './treasury.css'

function sortAccountsForDisplay(accounts) {
  return [...accounts].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    return (a.name || '').localeCompare(b.name || '')
  })
}

function AccountFormModal({ mode, account, paymentMethods, onClose, onAfterSave }) {
  const isCreate = mode === 'create'
  const [name, setName] = useState(account?.name || '')
  const [accountType, setAccountType] = useState(account?.account_type || 'current')
  const [initialBalance, setInitialBalance] = useState(
    isCreate ? (account?.initial_balance != null ? String(account.initial_balance) : '0') : ''
  )
  const [isPrimary, setIsPrimary] = useState(!!account?.is_primary)
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState(
    account?.default_payment_method_id ? String(account.default_payment_method_id) : ''
  )
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSaveAccount(e) {
    e.preventDefault()
    setSaveError('')
    setSaving(true)
    try {
      if (isCreate) {
        await accountsApi.create({
          name: name.trim(),
          account_type: accountType,
          is_primary: isPrimary,
          initial_balance: Number(initialBalance || 0),
          default_payment_method_id: defaultPaymentMethodId
            ? Number(defaultPaymentMethodId)
            : null,
        })
      } else {
        await accountsApi.update(account.id, {
          name: name.trim(),
          account_type: accountType,
          is_primary: isPrimary ? true : undefined,
          default_payment_method_id: defaultPaymentMethodId
            ? Number(defaultPaymentMethodId)
            : null,
        })
      }
      await onAfterSave()
      onClose()
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Hark! Could not save account.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-lg border border-gold/30 shadow-card bg-brown-dark max-h-[90vh] overflow-y-auto">
        <div className="card-header">
          <h3 className="card-title">{isCreate ? 'New account' : `Edit account - ${account?.name}`}</h3>
          <Button variant="ghost" className="ml-auto" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
        <div className="card-body">
          <form onSubmit={handleSaveAccount} className="space-y-4">
            <label className="block">
              <span className="input-label">Name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
            </label>

            <label className="block">
              <span className="input-label">Account type</span>
              <select className="input" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                <option value="current">Current</option>
                <option value="savings">Savings</option>
              </select>
            </label>

            <label className="block">
              <span className="input-label">Default payment method</span>
              <select
                className="input"
                value={defaultPaymentMethodId}
                onChange={(e) => setDefaultPaymentMethodId(e.target.value)}
              >
                <option value="">- None -</option>
                {(paymentMethods || []).map((pm) => (
                  <option key={pm.id} value={String(pm.id)}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </label>

            {isCreate ? (
              <>
                <label className="block">
                  <span className="input-label">Opening balance</span>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                  />
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
                  <span className="text-sm text-parchment font-crimson">Make this the primary account</span>
                </label>
              </>
            ) : (
              <>
                {!account?.is_primary ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
                    <span className="text-sm text-parchment font-crimson">Make this the primary account</span>
                  </label>
                ) : null}
              </>
            )}

            {saveError ? <p className="text-sm text-danger font-crimson">{saveError}</p> : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {isCreate ? 'Create account' : 'Save account'}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function BalanceCorrectionModal({ account, onClose, onSuccess }) {
  const [currentBalance, setCurrentBalance] = useState(account?.current_balance != null ? String(account.current_balance) : '')
  const [targetBalance, setTargetBalance] = useState('')
  const [correctionDate, setCorrectionDate] = useState(() => new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const refreshBalance = useCallback(async () => {
    if (!account?.id) return
    try {
      const fresh = await accountsApi.get(account.id)
      setCurrentBalance(String(fresh.current_balance))
    } catch {
      // keep previous
    }
  }, [account?.id])

  useEffect(() => {
    refreshBalance()
  }, [refreshBalance])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await accountsApi.balanceCorrection(account.id, {
        target_balance: Number(targetBalance),
        correction_date: correctionDate,
        note: note.trim() || undefined,
      })
      await onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Correction failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-lg border border-gold/30 shadow-card bg-brown-dark">
        <div className="card-header">
          <h3 className="card-title">Balance correction - {account.name}</h3>
          <Button variant="ghost" className="ml-auto" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="card-body space-y-4">
          <div>
            <span className="input-label">Current balance</span>
            <p className="text-lg text-gold font-cinzel">{formatSigned(currentBalance)}</p>
            <Button type="button" variant="ghost" className="text-xs mt-1" onClick={() => refreshBalance()}>
              Refresh from ledger
            </Button>
          </div>
          <label className="block">
            <span className="input-label">Target balance</span>
            <input
              type="number"
              step="0.01"
              className="input"
              value={targetBalance}
              onChange={(e) => setTargetBalance(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="input-label">Correction date</span>
            <input
              type="date"
              className="input"
              value={correctionDate}
              onChange={(e) => setCorrectionDate(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="input-label">Note (optional)</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} />
          </label>
          {error ? <p className="text-sm text-danger font-crimson">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              Apply correction
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TransferModal({ fromAccount, accounts, onClose, onSuccess }) {
  const others = useMemo(() => accounts.filter((a) => a.id !== fromAccount.id), [accounts, fromAccount.id])
  const [toId, setToId] = useState(others[0]?.id ? String(others[0].id) : '')
  const [amount, setAmount] = useState('')
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await transfersApi.create({
        from_account_id: fromAccount.id,
        to_account_id: Number(toId),
        amount: Number(amount),
        transfer_date: transferDate,
        description: description.trim() || undefined,
      })
      await onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Transfer failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!others.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div className="w-full max-w-md rounded-lg border border-gold/30 shadow-card bg-brown-dark p-6">
          <p className="text-parchment font-crimson mb-4">Thou needest at least two accounts to transfer coin.</p>
          <Button variant="primary" onClick={onClose}>
            Understood
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-lg border border-gold/30 shadow-card bg-brown-dark">
        <div className="card-header">
          <h3 className="card-title">Transfer from {fromAccount.name}</h3>
          <Button variant="ghost" className="ml-auto" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
        <form className="card-body space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="input-label">To account</span>
            <select className="input" value={toId} onChange={(e) => setToId(e.target.value)} required>
              {others.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="input-label">Amount</span>
            <input type="number" step="0.01" min="0.01" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label className="block">
            <span className="input-label">Transfer date</span>
            <input type="date" className="input" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} required />
          </label>
          <label className="block">
            <span className="input-label">Description (optional)</span>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} />
          </label>
          {error ? <p className="text-sm text-danger font-crimson">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              Record transfer
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function NamePromptModal({ title, initialName, onClose, onSave, noun, onAfterSave }) {
  const [value, setValue] = useState(initialName || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(initialName || '')
    setError('')
  }, [initialName, title])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave(value.trim())
      if (onAfterSave) await onAfterSave()
      onClose()
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? typeof err.message === 'string'
            ? err.message
            : JSON.stringify(err.message)
          : `Could not save ${noun}.`
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-lg border border-gold/30 shadow-card bg-brown-dark">
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
          <Button variant="ghost" className="ml-auto" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
        <form className="card-body space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="input-label">Name</span>
            <input
              className="input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={noun === 'payment method' ? 50 : 100}
              required
            />
          </label>
          {error ? <p className="text-sm text-danger font-crimson">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={saving}>
              Save
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TreasuryPage() {
  const queryClient = useQueryClient()
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [subcatUsage, setSubcatUsage] = useState({})
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  const [categoryType, setCategoryType] = useState('daily')
  const [expandedCats, setExpandedCats] = useState(() => new Set())

  const [accountModal, setAccountModal] = useState(null)
  const [correctionAccount, setCorrectionAccount] = useState(null)
  const [transferFrom, setTransferFrom] = useState(null)
  const [categoryModal, setCategoryModal] = useState(null)
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [pmModal, setPmModal] = useState(null)
  const [newPmOpen, setNewPmOpen] = useState(false)

  const loadAll = useCallback(async () => {
    setLoadError('')
    try {
      const [acc, cat, pm, usage] = await Promise.all([
        accountsApi.list(),
        categoriesApi.list(),
        paymentMethodsApi.list(),
        categoriesApi.subcategoryUsage(),
      ])
      setAccounts(acc)
      setCategories(cat)
      setPaymentMethods(pm)
      setSubcatUsage(usage && typeof usage === 'object' ? usage : {})
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load Treasury.')
    } finally {
      setLoading(false)
    }
  }, [])

  const invalidateSharedCaches = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['subcategories'] }),
      queryClient.invalidateQueries({ queryKey: ['stats'] }),
      queryClient.invalidateQueries({ queryKey: ['forecast'] }),
      queryClient.invalidateQueries({ queryKey: ['lowest-points'] }),
      queryClient.invalidateQueries({ queryKey: ['prediction-templates'] }),
      queryClient.invalidateQueries({ queryKey: ['prediction-instances'] }),
    ])
  }, [queryClient])

  const refreshAfterMutation = useCallback(async () => {
    await invalidateSharedCaches()
    await loadAll()
  }, [invalidateSharedCaches, loadAll])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const parentCategories = useMemo(
    () =>
      categories
        .filter((c) => !c.parent_id && c.type === categoryType)
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [categories, categoryType]
  )

  const sortedAccounts = useMemo(() => sortAccountsForDisplay(accounts), [accounts])

  function toggleCatExpand(id) {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleDeleteAccount(acc) {
    if (acc.is_primary) return
    if (!window.confirm(`Delete account "${acc.name}"? This cannot be undone.`)) return
    try {
      await accountsApi.delete(acc.id)
      await refreshAfterMutation()
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Delete failed.')
    }
  }

  async function handleDeleteCategory(cat) {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return
    try {
      await categoriesApi.delete(cat.id)
      await refreshAfterMutation()
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Delete failed.')
    }
  }

  async function handleDeletePm(pm) {
    if (!window.confirm(`Delete payment method "${pm.name}"?`)) return
    try {
      await paymentMethodsApi.delete(pm.id)
      await refreshAfterMutation()
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Delete failed.')
    }
  }

  return (
    <div className="page-shell">
      <PageContextHeader
        icon={Landmark}
        title="Treasury"
        subtitle="Accounts, ledgers, categories, and payment methods - the crown's ledger room."
        showAccountSwitcher={false}
      />
      <div className="page-container treasury-layout">
        {loading ? <p className="text-gold-muted font-crimson col-span-full">Summoning ledgers...</p> : null}
        {loadError ? <p className="text-danger font-crimson col-span-full">{loadError}</p> : null}

        <section className="card treasury-accounts shimmer-top">
          <div className="card-header">
            <h2 className="treasury-block-title">Accounts</h2>
            <Button variant="primary" className="ml-auto text-sm py-2 px-4" onClick={() => setAccountModal({ mode: 'create' })}>
              <Plus size={16} className="inline mr-1" strokeWidth={2} />
              New account
            </Button>
          </div>
          <div className="card-body space-y-3">
            {sortedAccounts.length === 0 ? (
              <p className="text-gold-muted font-crimson text-sm">No accounts yet - create thy first coffer.</p>
            ) : (
              sortedAccounts.map((acc) => (
                <div key={acc.id} className="treasury-row">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {acc.is_primary ? <Crown size={16} className="text-gold shrink-0" aria-label="Primary" /> : null}
                      <span className="text-parchment font-semibold font-cinzel">{acc.name}</span>
                      <span className="treasury-row-meta">({acc.account_type})</span>
                    </div>
                    <p className="text-gold mt-1 font-cinzel">Balance {formatSigned(acc.current_balance)}</p>
                  </div>
                  <div className="treasury-actions">
                    <Button type="button" variant="ghost" className="!px-2" title="Edit" onClick={() => setAccountModal({ mode: 'edit', account: acc })}>
                      <Pencil size={18} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-2"
                      title="Balance correction"
                      onClick={() => setCorrectionAccount(acc)}
                    >
                      <Scale size={18} />
                    </Button>
                    <Button type="button" variant="ghost" className="!px-2" title="Transfer" onClick={() => setTransferFrom(acc)}>
                      <ArrowLeftRight size={18} />
                    </Button>
                    {!acc.is_primary ? (
                      <Button type="button" variant="ghost" className="!px-2 text-danger/80 hover:text-danger" title="Delete" onClick={() => handleDeleteAccount(acc)}>
                        <Trash2 size={18} />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card treasury-categories shimmer-top">
          <div className="card-header">
            <h2 className="treasury-block-title">Categories</h2>
            <Button variant="primary" className="ml-auto text-sm py-2 px-4" onClick={() => setNewCategoryOpen(true)}>
              <Plus size={16} className="inline mr-1" strokeWidth={2} />
              New
            </Button>
          </div>
          <div className="card-body">
            <div className="segmented-toggle mb-4" role="group" aria-label="Category type">
              <button
                type="button"
                className={[
                  'segmented-toggle-button',
                  categoryType === 'daily' ? 'segmented-toggle-button-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setCategoryType('daily')}
              >
                Daily
              </button>
              <button
                type="button"
                className={[
                  'segmented-toggle-button',
                  categoryType === 'unplanned' ? 'segmented-toggle-button-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setCategoryType('unplanned')}
              >
                Unplanned
              </button>
            </div>
            <div className="space-y-3">
              {parentCategories.map((cat) => {
                const subs = subcatUsage[String(cat.id)] || []
                const open = expandedCats.has(cat.id)
                return (
                  <div key={cat.id} className="treasury-row items-start">
                    <div className="min-w-0 flex-1">
                      <p className="text-parchment font-semibold font-cinzel truncate">{cat.name}</p>
                      {subs.length > 0 ? (
                        <div className="treasury-subcats">
                          <button type="button" className="flex items-center gap-1 text-left w-full" onClick={() => toggleCatExpand(cat.id)}>
                            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>Subcategories in use ({subs.length})</span>
                          </button>
                          {open ? (
                            <ul className="mt-2 list-disc pl-4 space-y-0.5">
                              {subs.map((s) => (
                                <li key={s}>{s}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : (
                        <p className="treasury-subcats border-0 pl-0 mt-1">No subcategories recorded yet.</p>
                      )}
                    </div>
                    <div className="treasury-actions">
                      <Button type="button" variant="ghost" className="!px-2" title="Rename" onClick={() => setCategoryModal(cat)}>
                        <Pencil size={18} />
                      </Button>
                      <Button type="button" variant="ghost" className="!px-2 text-danger/80" title="Delete" onClick={() => handleDeleteCategory(cat)}>
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="card treasury-payment shimmer-top">
          <div className="card-header">
            <h2 className="treasury-block-title">Payment methods</h2>
            <Button variant="primary" className="ml-auto text-sm py-2 px-4" onClick={() => setNewPmOpen(true)}>
              <Plus size={16} className="inline mr-1" strokeWidth={2} />
              Add
            </Button>
          </div>
          <div className="card-body space-y-3">
            {paymentMethods.map((pm) => (
              <div key={pm.id} className="treasury-row">
                <div>
                  <p className="text-parchment font-semibold font-cinzel">{pm.name}</p>
                  <p className="treasury-row-meta">{pm.transaction_count ?? 0} chronicles</p>
                </div>
                <div className="treasury-actions">
                  <Button type="button" variant="ghost" className="!px-2" onClick={() => setPmModal(pm)}>
                    <Pencil size={18} />
                  </Button>
                  <Button type="button" variant="ghost" className="!px-2 text-danger/80" onClick={() => handleDeletePm(pm)}>
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {accountModal?.mode === 'create' ? (
        <AccountFormModal
          mode="create"
          account={null}
          paymentMethods={paymentMethods}
          onClose={() => setAccountModal(null)}
          onAfterSave={refreshAfterMutation}
        />
      ) : null}
      {accountModal?.mode === 'edit' && accountModal.account ? (
        <AccountFormModal
          mode="edit"
          account={accountModal.account}
          paymentMethods={paymentMethods}
          onClose={() => setAccountModal(null)}
          onAfterSave={refreshAfterMutation}
        />
      ) : null}

      {correctionAccount ? (
        <BalanceCorrectionModal account={correctionAccount} onClose={() => setCorrectionAccount(null)} onSuccess={refreshAfterMutation} />
      ) : null}

      {transferFrom ? (
        <TransferModal fromAccount={transferFrom} accounts={accounts} onClose={() => setTransferFrom(null)} onSuccess={refreshAfterMutation} />
      ) : null}

      {categoryModal ? (
        <NamePromptModal
          key={`edit-cat-${categoryModal.id}`}
          title={`Rename - ${categoryModal.name}`}
          initialName={categoryModal.name}
          noun="category"
          onClose={() => setCategoryModal(null)}
          onSave={(name) => categoriesApi.update(categoryModal.id, { name })}
          onAfterSave={refreshAfterMutation}
        />
      ) : null}

      {newCategoryOpen ? (
        <NamePromptModal
          key="new-cat"
          title={`New ${categoryType} category`}
          initialName=""
          noun="category"
          onClose={() => setNewCategoryOpen(false)}
          onSave={(name) => categoriesApi.create({ name, type: categoryType, parent_id: null })}
          onAfterSave={refreshAfterMutation}
        />
      ) : null}

      {pmModal ? (
        <NamePromptModal
          key={`edit-pm-${pmModal.id}`}
          title="Rename payment method"
          initialName={pmModal.name}
          noun="payment method"
          onClose={() => setPmModal(null)}
          onSave={(name) => paymentMethodsApi.update(pmModal.id, { name })}
          onAfterSave={refreshAfterMutation}
        />
      ) : null}

      {newPmOpen ? (
        <NamePromptModal
          key="new-pm"
          title="New payment method"
          initialName=""
          noun="payment method"
          onClose={() => setNewPmOpen(false)}
          onSave={(name) => paymentMethodsApi.create({ name })}
          onAfterSave={refreshAfterMutation}
        />
      ) : null}
    </div>
  )
}
