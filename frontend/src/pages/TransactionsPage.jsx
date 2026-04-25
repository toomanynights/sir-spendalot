import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, Pencil, ScrollText, Trash2, X } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '../api/categories'
import { useCategories } from '../hooks/useCategories'
import {
  TRANSACTIONS_KEY,
  useDeleteTransaction,
  useRestoreTransaction,
  useTransactions,
  useUpdateTransaction,
} from '../hooks/useTransactions'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import PageContextHeader from '../components/layout/PageContextHeader'
import { useSelectedAccount } from '../contexts/AccountContext'
import { formatAmount, formatDate } from '../utils/format'

const PAGE_SIZE = 20

const TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'daily', label: 'Daily' },
  { value: 'unplanned', label: 'Unplanned' },
  { value: 'predicted', label: 'Predicted' },
  { value: 'transfer', label: 'Transfer' },
]

function toNumberOrNull(value) {
  if (!value) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function txSignClass(amount) {
  return Number(amount) < 0 ? 'text-success' : 'text-danger'
}

function filterCategoriesForTxType(categories, txType) {
  if (!txType || txType === 'predicted' || txType === 'transfer') return categories
  return categories.filter((c) => c.type === txType)
}

function pickParentCategories(categories, txType) {
  return filterCategoriesForTxType(categories, txType).filter((c) => !c.parent_id)
}

function parentIdForCategoryId(categories, categoryId) {
  if (!categoryId) return ''
  const category = (categories || []).find((c) => c.id === Number(categoryId))
  if (!category) return String(categoryId)
  return String(category.parent_id || category.id)
}

function usedSubcategoriesForParent(subcategoryUsage, parentCategoryId) {
  if (!parentCategoryId) return []
  const values = subcategoryUsage?.[String(parentCategoryId)] || []
  return Array.isArray(values) ? values : []
}

function EditModal({
  tx,
  onClose,
  onSave,
  categories,
  subcategoryUsage,
  isSaving,
  saveError,
}) {
  const [form, setForm] = useState({
    amount: tx.amount ?? '',
    transaction_date: tx.transaction_date ?? '',
    parent_category_id: parentIdForCategoryId(categories, tx.category_id),
    description: tx.description ?? '',
    subcategory_mode: 'listed',
    subcategory_listed: tx.subcategory ?? '',
    subcategory_custom: '',
  })

  const categoryOptions = useMemo(
    () => pickParentCategories(categories || [], tx.type),
    [categories, tx.type]
  )
  const listedSubcategoryOptions = useMemo(
    () => usedSubcategoriesForParent(subcategoryUsage, form.parent_category_id),
    [subcategoryUsage, form.parent_category_id]
  )

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const pickedSubcategory =
      form.subcategory_mode === 'custom'
        ? form.subcategory_custom
        : form.subcategory_listed
    const payload = {
      amount: Number(form.amount),
      transaction_date: form.transaction_date,
      category_id: form.parent_category_id ? Number(form.parent_category_id) : null,
      subcategory: pickedSubcategory.trim() || null,
      description: form.description.trim() || null,
    }
    onSave(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-2xl rounded-lg border border-gold/30 shadow-card bg-brown-dark">
        <div className="card-header">
          <h3 className="card-title">Edit Chronicle #{tx.id}</h3>
          <Button
            variant="ghost"
            className="ml-auto"
            onClick={onClose}
            aria-label="Close edit modal"
          >
            <X size={18} />
          </Button>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>
              <span className="input-label">Amount</span>
              <input
                type="number"
                step="0.01"
                className="input"
                value={form.amount}
                onChange={(e) => updateField('amount', e.target.value)}
                required
              />
            </label>

            <label>
              <span className="input-label">Date</span>
              <input
                type="date"
                className="input"
                value={form.transaction_date}
                onChange={(e) => updateField('transaction_date', e.target.value)}
                required
              />
            </label>

            <label>
              <span className="input-label">Category</span>
              <select
                className="input"
                value={form.parent_category_id}
                onChange={(e) => {
                  const nextParent = e.target.value
                  setForm((prev) => ({
                    ...prev,
                    parent_category_id: nextParent,
                    subcategory: '',
                    subcategory_mode: 'listed',
                    subcategory_listed: '',
                    subcategory_custom: '',
                  }))
                }}
              >
                <option value="">None</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            {form.parent_category_id && (
              <>
                <label>
                  <span className="input-label">Subcategory mode</span>
                  <select
                    className="input"
                    value={form.subcategory_mode}
                    onChange={(e) => updateField('subcategory_mode', e.target.value)}
                  >
                    <option value="listed">From used list</option>
                    <option value="custom">Type custom</option>
                  </select>
                </label>
                {form.subcategory_mode === 'listed' ? (
                  <label>
                    <span className="input-label">Subcategory</span>
                    <select
                      className="input"
                      value={form.subcategory_listed}
                      onChange={(e) => updateField('subcategory_listed', e.target.value)}
                    >
                      <option value="">Any / none</option>
                      {listedSubcategoryOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    <span className="input-label">Subcategory</span>
                    <input
                      className="input"
                      value={form.subcategory_custom}
                      onChange={(e) => updateField('subcategory_custom', e.target.value)}
                      maxLength={100}
                      placeholder="Type custom subcategory"
                    />
                  </label>
                )}
              </>
            )}

            <label className="md:col-span-2">
              <span className="input-label">Description</span>
              <input
                className="input"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                maxLength={500}
              />
            </label>

            {saveError && (
              <p className="md:col-span-2 text-danger text-sm font-crimson italic">{saveError}</p>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Chronicle'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()
  const { selectedId, selectedAccount } = useSelectedAccount()

  const page = Math.max(Number(searchParams.get('page') || '1') || 1, 1)
  const dateFrom = searchParams.get('date_from') || ''
  const dateTo = searchParams.get('date_to') || ''
  const categoryId = searchParams.get('category_id') || ''
  const subcategory = searchParams.get('subcategory') || ''
  const transactionType = searchParams.get('transaction_type') || ''
  const includeDeleted = searchParams.get('include_deleted') === 'true'

  const filters = {
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    account_id: selectedId ?? undefined,
    category_id: toNumberOrNull(categoryId) ?? undefined,
    subcategory: subcategory || undefined,
    transaction_type: transactionType || undefined,
    include_deleted: includeDeleted ? true : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }

  const { data: transactions, isLoading, isError, error } = useTransactions(filters)
  const { data: categories } = useCategories()
  const { data: subcategoryUsage } = useQuery({
    queryKey: ['category-subcategory-usage'],
    queryFn: categoriesApi.subcategoryUsage,
    staleTime: 2 * 60_000,
  })
  const updateTx = useUpdateTransaction()
  const deleteTx = useDeleteTransaction()
  const restoreTx = useRestoreTransaction()

  const [editingTx, setEditingTx] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const hasPrev = page > 1
  const hasNext = (transactions || []).length === PAGE_SIZE
  const categoryOptions = useMemo(
    () => pickParentCategories(categories || [], transactionType),
    [categories, transactionType]
  )
  const filterSubcategoryOptions = useMemo(
    () => usedSubcategoriesForParent(subcategoryUsage, categoryId),
    [subcategoryUsage, categoryId]
  )
  const [subcategoryMode, setSubcategoryMode] = useState('listed')
  const [subcategoryCustom, setSubcategoryCustom] = useState('')

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (!value) next.delete(key)
    else next.set(key, value)
    next.delete('page')
    setSearchParams(next)
  }

  function setCategoryParam(value) {
    const next = new URLSearchParams(searchParams)
    if (!value) next.delete('category_id')
    else next.set('category_id', value)
    next.delete('subcategory')
    next.delete('page')
    setSearchParams(next)
    setSubcategoryCustom('')
    setSubcategoryMode('listed')
  }

  function changePage(nextPage) {
    const next = new URLSearchParams(searchParams)
    if (nextPage <= 1) next.delete('page')
    else next.set('page', String(nextPage))
    setSearchParams(next)
  }

  async function handleDelete(tx) {
    const confirmed = window.confirm(
      `Soft-delete chronicle #${tx.id} from ${tx.transaction_date}? This hides it from the default list.`
    )
    if (!confirmed) return
    await deleteTx.mutateAsync(tx.id)
  }

  async function handleRestore(tx) {
    await restoreTx.mutateAsync(tx.id)
  }

  async function handleSave(payload) {
    if (!editingTx) return
    setSaveError('')
    try {
      await updateTx.mutateAsync({ id: editingTx.id, ...payload })
      setEditingTx(null)
    } catch (e) {
      setSaveError(e?.message || 'Hark! Could not save this chronicle.')
    }
  }

  async function clearAllFilters() {
    setSearchParams(new URLSearchParams())
    setSubcategoryCustom('')
    setSubcategoryMode('listed')
    await qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
  }

  return (
    <div className="page-shell">
      <PageContextHeader
        icon={ScrollText}
        title="Chronicles"
        subtitle={
          selectedAccount
            ? `Full ledger of deeds for ${selectedAccount.name}, with filters and inline corrections.`
            : 'Full ledger of thy deeds, with filters and inline corrections.'
        }
        showAccountSwitcher
      />

      <div className="page-container">
        <Card shimmer className="mb-6">
          <CardHeader>
            <button
              type="button"
              onClick={() => setFiltersExpanded((v) => !v)}
              className="flex flex-1 min-w-0 items-center justify-between gap-2 text-left min-h-touch py-1 rounded-md hover:bg-black/10"
            >
              <span className="card-title">Filters</span>
              {filtersExpanded ? <ChevronUp size={18} className="text-gold" /> : <ChevronDown size={18} className="text-gold" />}
            </button>
          </CardHeader>
          {filtersExpanded && (
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <label>
              <span className="input-label">From</span>
              <input
                type="date"
                className="input"
                value={dateFrom}
                onChange={(e) => setParam('date_from', e.target.value)}
              />
            </label>

            <label>
              <span className="input-label">To</span>
              <input
                type="date"
                className="input"
                value={dateTo}
                onChange={(e) => setParam('date_to', e.target.value)}
              />
            </label>

            <label>
              <span className="input-label">Transaction type</span>
              <select
                className="input"
                value={transactionType}
                onChange={(e) => setParam('transaction_type', e.target.value)}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="input-label">Category</span>
              <select
                className="input"
                value={categoryId}
                onChange={(e) => setCategoryParam(e.target.value)}
              >
                <option value="">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            {categoryId && (
              <>
                <label>
                  <span className="input-label">Subcategory mode</span>
                  <select
                    className="input"
                    value={subcategoryMode}
                    onChange={(e) => {
                      const mode = e.target.value
                      setSubcategoryMode(mode)
                      setParam('subcategory', mode === 'listed' ? '' : subcategoryCustom)
                    }}
                  >
                    <option value="listed">From used list</option>
                    <option value="custom">Type custom</option>
                  </select>
                </label>
                {subcategoryMode === 'listed' ? (
                  <label>
                    <span className="input-label">Subcategory</span>
                    <select
                      className="input"
                      value={subcategory}
                      onChange={(e) => setParam('subcategory', e.target.value)}
                    >
                      <option value="">All used subcategories</option>
                      {filterSubcategoryOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    <span className="input-label">Subcategory contains</span>
                    <input
                      className="input"
                      value={subcategoryCustom}
                      onChange={(e) => {
                        const value = e.target.value
                        setSubcategoryCustom(value)
                        setParam('subcategory', value)
                      }}
                      placeholder="Groceries, rent, etc."
                    />
                  </label>
                )}
              </>
            )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gold-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-gold"
                    checked={includeDeleted}
                    onChange={(e) => setParam('include_deleted', e.target.checked ? 'true' : '')}
                  />
                  Show deleted items
                </label>
                <Button variant="ghost" onClick={clearAllFilters}>
                  Reset filters
                </Button>
              </div>
            </CardBody>
          )}
        </Card>

        <Card shimmer>
          <CardHeader title="Chronicles List" />
          <CardBody>
          {isLoading && (
            <p className="text-gold-muted font-crimson italic">Loading thy chronicles...</p>
          )}

          {isError && (
            <p className="text-danger font-crimson italic">
              Hark! Failed to load chronicles. {error?.message || ''}
            </p>
          )}

          {!isLoading && !isError && (transactions || []).length === 0 && (
            <p className="text-gold-muted font-crimson italic">No chronicles match these filters.</p>
          )}

          {!isLoading && !isError && (transactions || []).length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gold/20 text-gold-muted">
                    <th className="text-left py-2 pr-3">Date</th>
                    <th className="text-left py-2 pr-3">Account</th>
                    <th className="text-left py-2 pr-3">Category</th>
                    <th className="text-left py-2 pr-3">Subcategory</th>
                    <th className="text-left py-2 pr-3">Type</th>
                    <th className="text-left py-2 pr-3">Description</th>
                    <th className="text-right py-2 pr-3">Amount</th>
                    <th className="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    return (
                      <tr
                        key={tx.id}
                        className={`border-b border-gold/10 ${tx.deleted_at ? 'opacity-60' : ''}`}
                      >
                        <td className="py-2 pr-3">{formatDate(tx.transaction_date)}</td>
                        <td className="py-2 pr-3">{selectedAccount?.name || tx.account_id}</td>
                        <td className="py-2 pr-3">{tx.category_name || '—'}</td>
                        <td className="py-2 pr-3">{tx.subcategory || '—'}</td>
                        <td className="py-2 pr-3 capitalize">{tx.type}</td>
                        <td className="py-2 pr-3">
                          {tx.description || '—'}
                          {tx.deleted_at && (
                            <span className="ml-2 text-xs text-gold-muted">(deleted)</span>
                          )}
                        </td>
                        <td className={`py-2 pr-3 text-right font-semibold ${txSignClass(tx.amount)}`}>
                          {Number(tx.amount) < 0 ? '+' : '-'}{formatAmount(tx.amount)}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-2">
                            {!tx.deleted_at ? (
                              <>
                                <Button
                                  variant="ghost"
                                  className="text-gold"
                                  onClick={() => setEditingTx(tx)}
                                  title="Edit chronicle"
                                >
                                  <Pencil size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="text-danger"
                                  onClick={() => handleDelete(tx)}
                                  disabled={deleteTx.isPending}
                                  title="Soft-delete chronicle"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                className="text-success"
                                onClick={() => handleRestore(tx)}
                                disabled={restoreTx.isPending}
                                title="Restore chronicle"
                              >
                                Restore
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && !isError && (hasPrev || hasNext) && (
            <div className="mt-5 flex items-center justify-between border-t border-gold/20 pt-4">
              <Button onClick={() => changePage(page - 1)} disabled={!hasPrev}>
                Previous
              </Button>
              <span className="text-sm text-gold-muted">Page {page}</span>
              <Button onClick={() => changePage(page + 1)} disabled={!hasNext}>
                Next
              </Button>
            </div>
          )}
          </CardBody>
        </Card>

        {editingTx && (
          <EditModal
            tx={editingTx}
            onClose={() => {
              setEditingTx(null)
              setSaveError('')
            }}
            onSave={handleSave}
            categories={categories}
            subcategoryUsage={subcategoryUsage}
            isSaving={updateTx.isPending}
            saveError={saveError}
          />
        )}
      </div>
    </div>
  )
}
