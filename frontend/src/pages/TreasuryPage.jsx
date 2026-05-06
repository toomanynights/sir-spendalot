import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
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
import BalanceCorrectionModal from '../components/BalanceCorrectionModal'
import TransferModal from '../components/TransferModal'
import CheckupModal from '../components/CheckupModal'
import AccountCheckupHistory from '../components/AccountCheckupHistory'
import { accountsApi } from '../api/accounts'
import { categoriesApi } from '../api/categories'
import { paymentMethodsApi } from '../api/paymentMethods'
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

// Modal wrapper shared by category modals
function CategoryModal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-lg border border-gold/30 shadow-card bg-brown-dark">
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
          <Button variant="ghost" className="ml-auto" onClick={onClose} aria-label="Close"><X size={18} /></Button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Edit a subcategory: rename and/or move to a different parent
function SubcategoryEditModal({ subcategory, allCategories, onClose, onAfterSave }) {
  const [name, setName] = useState(subcategory.name)
  const [parentId, setParentId] = useState(String(subcategory.parent_id))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const parentOptions = allCategories
    .filter((c) => !c.parent_id && c.type === subcategory.type)
    .sort((a, b) => a.name.localeCompare(b.name))

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const trimmed = name.trim()
      const newParentId = parseInt(parentId, 10)
      // If parent changed, use reassign-parent endpoint on the subcategory entity
      if (newParentId !== subcategory.parent_id) {
        await categoriesApi.update(subcategory.id, { parent_id: newParentId })
      }
      // If name changed, use rename endpoint (handles cascade)
      if (trimmed !== subcategory.name) {
        await categoriesApi.rename(subcategory.id, trimmed)
      }
      if (onAfterSave) await onAfterSave()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Hark! The subcategory could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CategoryModal title={`Edit subcategory — ${subcategory.name}`} onClose={onClose}>
      <form className="card-body space-y-4" onSubmit={handleSave}>
        <label className="block">
          <span className="input-label">Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
        </label>
        <label className="block">
          <span className="input-label">Parent category</span>
          <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            {parentOptions.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.name}</option>
            ))}
          </select>
        </label>
        {error ? <p className="text-sm text-danger font-crimson">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>Save</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </CategoryModal>
  )
}

// Delete a subcategory that has linked transactions: reassign first
function SubcategoryDeleteModal({ subcategory, siblings, onClose, onAfterSave }) {
  const [targetId, setTargetId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const replacements = siblings.filter((s) => s.id !== subcategory.id)

  async function handleConfirm() {
    setError('')
    setSaving(true)
    try {
      await categoriesApi.reassignTransactions(subcategory.id, targetId ? parseInt(targetId, 10) : null)
      await categoriesApi.delete(subcategory.id)
      if (onAfterSave) await onAfterSave()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Hark! The subcategory could not be struck from the ledger.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CategoryModal title={`Delete subcategory — ${subcategory.name}`} onClose={onClose}>
      <div className="card-body space-y-4 font-crimson">
        <p className="text-parchment text-sm">
          <span className="text-danger font-semibold">{subcategory.tx_count}</span> chronicle(s) bear this subcategory. Reassign them ere it may be struck.
        </p>
        <label className="block">
          <span className="input-label">Reassign to</span>
          <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">— Remove subcategory from chronicles —</option>
            {replacements.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="button" variant="danger" disabled={saving} onClick={handleConfirm}>
            {saving ? 'Working…' : 'Reassign & strike'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </CategoryModal>
  )
}

// Edit a parent category: rename and/or demote to subcategory
function ParentCategoryEditModal({ category, allCategories, onClose, onAfterSave }) {
  const [name, setName] = useState(category.name)
  const [parentId, setParentId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const children = allCategories.filter((c) => c.parent_id === category.id)
  const emptyChildren = children.filter((c) => c.tx_count === 0)
  const hasNonEmptyChildren = children.some((c) => c.tx_count > 0)

  const parentOptions = allCategories
    .filter((c) => !c.parent_id && c.type === category.type && c.id !== category.id)
    .sort((a, b) => a.name.localeCompare(b.name))

  const willDemote = parentId !== ''

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (willDemote && hasNonEmptyChildren) {
      setError('Cannot demote: some subcategories still hold chronicles. Reassign or strike them first.')
      return
    }
    if (willDemote && emptyChildren.length > 0) {
      if (!window.confirm(`Demoting will strike ${emptyChildren.length} empty subcategorie(s): ${emptyChildren.map((c) => c.name).join(', ')}. Dost thou wish to proceed?`)) return
    }
    setSaving(true)
    try {
      const trimmed = name.trim()
      if (willDemote) {
        // Delete empty children first so backend allows the demotion
        for (const child of emptyChildren) {
          await categoriesApi.delete(child.id)
        }
        await categoriesApi.update(category.id, { parent_id: parseInt(parentId, 10), name: trimmed })
      } else if (trimmed !== category.name) {
        await categoriesApi.update(category.id, { name: trimmed })
      }
      if (onAfterSave) await onAfterSave()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Hark! The category could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CategoryModal title={`Edit category — ${category.name}`} onClose={onClose}>
      <form className="card-body space-y-4" onSubmit={handleSave}>
        <label className="block">
          <span className="input-label">Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
        </label>
        {parentOptions.length > 0 ? (
          <label className="block">
            <span className="input-label">Make subcategory of</span>
            <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">— Remains a sovereign category —</option>
              {parentOptions.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
            {willDemote && hasNonEmptyChildren ? (
              <p className="text-xs text-danger mt-1 font-crimson">Cannot demote: subcategories still hold chronicles.</p>
            ) : willDemote && emptyChildren.length > 0 ? (
              <p className="text-xs text-gold-muted mt-1 font-crimson">{emptyChildren.length} empty subcategorie(s) shall be struck upon demoting.</p>
            ) : null}
          </label>
        ) : null}
        {error ? <p className="text-sm text-danger font-crimson">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving || (willDemote && hasNonEmptyChildren)}>Save</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </CategoryModal>
  )
}

// Delete a parent category that has linked transactions: reassign first
function ParentCategoryDeleteModal({ category, allCategories, onClose, onAfterSave }) {
  const [targetId, setTargetId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const replacements = allCategories.filter(
    (c) => !c.parent_id && c.type === category.type && c.id !== category.id
  ).sort((a, b) => a.name.localeCompare(b.name))

  async function handleConfirm() {
    setError('')
    setSaving(true)
    try {
      await categoriesApi.reassignParentTransactions(category.id, targetId ? parseInt(targetId, 10) : null)
      await categoriesApi.delete(category.id)
      if (onAfterSave) await onAfterSave()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Hark! The category could not be struck from the ledger.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CategoryModal title={`Delete category — ${category.name}`} onClose={onClose}>
      <div className="card-body space-y-4 font-crimson">
        <p className="text-parchment text-sm">
          <span className="text-danger font-semibold">{category.tx_count}</span> chronicle(s) are filed under this category. Reassign them ere it may be struck.
        </p>
        <label className="block">
          <span className="input-label">Reassign chronicles to</span>
          <select className="input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">— Remove category from chronicles —</option>
            {replacements.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="button" variant="danger" disabled={saving} onClick={handleConfirm}>
            {saving ? 'Working…' : 'Reassign & strike'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </CategoryModal>
  )
}

export default function TreasuryPage() {
  const queryClient = useQueryClient()
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)

  const [categoryType, setCategoryType] = useState('daily')
  const [expandedCats, setExpandedCats] = useState(() => new Set())
  const [expandedAccounts, setExpandedAccounts] = useState(() => new Set())

  const [accountModal, setAccountModal] = useState(null)
  const [correctionAccount, setCorrectionAccount] = useState(null)
  const [transferFrom, setTransferFrom] = useState(null)
  const [checkupAccount, setCheckupAccount] = useState(null)
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [parentEditModal, setParentEditModal] = useState(null)
  const [parentDeleteModal, setParentDeleteModal] = useState(null)
  const [subcategoryEditModal, setSubcategoryEditModal] = useState(null)
  const [subcategoryDeleteModal, setSubcategoryDeleteModal] = useState(null)
  const [pmModal, setPmModal] = useState(null)
  const [newPmOpen, setNewPmOpen] = useState(false)

  const loadAll = useCallback(async () => {
    setLoadError('')
    try {
      const [acc, cat, pm] = await Promise.all([
        accountsApi.list(),
        categoriesApi.list(),
        paymentMethodsApi.list(),
      ])
      setAccounts(acc)
      setCategories(cat)
      setPaymentMethods(pm)
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

  function toggleAccountExpand(id) {
    setExpandedAccounts((prev) => {
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
          <div className="card-body">
            {sortedAccounts.length === 0 ? (
              <p className="text-gold-muted font-crimson text-sm">No accounts yet - create thy first coffer.</p>
            ) : (
              <div className="treasury-scroll-list space-y-3">
                {sortedAccounts.map((acc) => {
                  const open = expandedAccounts.has(acc.id)
                  return (
                    <div key={acc.id} className="treasury-row treasury-account-row">
                      {/* Left: account info */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {acc.is_primary ? <Crown size={16} className="text-gold shrink-0" aria-label="Primary" /> : null}
                          <span className="text-parchment font-semibold font-cinzel">{acc.name}</span>
                          <span className="treasury-row-meta">({acc.account_type})</span>
                        </div>
                        <p className="text-gold mt-1 font-cinzel">Balance {formatSigned(acc.current_balance)}</p>
                        <button
                          type="button"
                          className="treasury-account-expand"
                          onClick={() => toggleAccountExpand(acc.id)}
                          aria-expanded={open}
                        >
                          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          {open ? 'Hide reckonings' : 'Show reckonings'}
                        </button>
                      </div>
                      {/* Right: action buttons */}
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
                        <Button
                          type="button"
                          variant="ghost"
                          className="!px-2"
                          title="Reconcile (checkup)"
                          onClick={() => setCheckupAccount(acc)}
                        >
                          <ClipboardCheck size={18} />
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
                      {/* History — full-width row when expanded (flex-wrap kicks it below) */}
                      {open ? <AccountCheckupHistory accountId={acc.id} expanded /> : null}
                    </div>
                  )
                })}
              </div>
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
            <div className="treasury-scroll-list space-y-3">
              {parentCategories.map((cat) => {
                const childCats = categories.filter((c) => c.parent_id === cat.id).sort((a, b) => a.name.localeCompare(b.name))
                const open = expandedCats.has(cat.id)
                return (
                  <div key={cat.id} className="treasury-row items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-parchment font-semibold font-cinzel truncate flex-1">{cat.name}</p>
                        <Button type="button" variant="ghost" className="!px-1.5 !py-0.5 shrink-0" title="Edit" onClick={() => setParentEditModal(cat)}>
                          <Pencil size={15} />
                        </Button>
                        <Button type="button" variant="ghost" className="!px-1.5 !py-0.5 shrink-0 text-danger/80" title="Delete" onClick={() => {
                          if (cat.tx_count > 0) {
                            setParentDeleteModal(cat)
                          } else {
                            handleDeleteCategory(cat)
                          }
                        }}>
                          <Trash2 size={15} />
                        </Button>
                      </div>
                      {childCats.length > 0 ? (
                        <div className="treasury-subcats">
                          <button type="button" className="flex items-center gap-1 text-left w-full" onClick={() => toggleCatExpand(cat.id)}>
                            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>Subcategories ({childCats.length})</span>
                          </button>
                          {open ? (
                            <ul className="mt-2 space-y-1">
                              {childCats.map((sub) => (
                                <li key={sub.id} className="flex items-center justify-between gap-2">
                                  <span className="text-parchment/90 text-sm font-crimson truncate">
                                    {sub.name}
                                    {sub.tx_count > 0 ? <span className="text-gold-muted ml-1">({sub.tx_count})</span> : null}
                                  </span>
                                  <span className="flex gap-1 shrink-0">
                                    <Button type="button" variant="ghost" className="!px-1 !py-0.5" title="Edit" onClick={() => setSubcategoryEditModal(sub)}>
                                      <Pencil size={14} />
                                    </Button>
                                    <Button type="button" variant="ghost" className="!px-1 !py-0.5 text-danger/80" title="Delete" onClick={() => {
                                      if (sub.tx_count > 0) {
                                        setSubcategoryDeleteModal({ sub, siblings: childCats })
                                      } else {
                                        handleDeleteCategory(sub)
                                      }
                                    }}>
                                      <Trash2 size={14} />
                                    </Button>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : (
                        <p className="treasury-subcats border-0 pl-0 mt-1">No subcategories recorded.</p>
                      )}
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
            <div className="treasury-scroll-list space-y-3">
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

      {checkupAccount ? (
        <CheckupModal
          account={checkupAccount}
          onClose={() => setCheckupAccount(null)}
          onSuccess={refreshAfterMutation}
        />
      ) : null}

      {parentEditModal ? (
        <ParentCategoryEditModal
          key={`edit-parent-${parentEditModal.id}`}
          category={parentEditModal}
          allCategories={categories}
          onClose={() => setParentEditModal(null)}
          onAfterSave={refreshAfterMutation}
        />
      ) : null}

      {parentDeleteModal ? (
        <ParentCategoryDeleteModal
          key={`delete-parent-${parentDeleteModal.id}`}
          category={parentDeleteModal}
          allCategories={categories}
          onClose={() => setParentDeleteModal(null)}
          onAfterSave={refreshAfterMutation}
        />
      ) : null}

      {subcategoryEditModal ? (
        <SubcategoryEditModal
          key={`edit-sub-${subcategoryEditModal.id}`}
          subcategory={subcategoryEditModal}
          allCategories={categories}
          onClose={() => setSubcategoryEditModal(null)}
          onAfterSave={refreshAfterMutation}
        />
      ) : null}

      {subcategoryDeleteModal ? (
        <SubcategoryDeleteModal
          subcategory={subcategoryDeleteModal.sub}
          siblings={subcategoryDeleteModal.siblings}
          onClose={() => setSubcategoryDeleteModal(null)}
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
