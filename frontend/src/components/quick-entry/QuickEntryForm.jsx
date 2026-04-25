import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Copy, Check, AlertCircle } from 'lucide-react'
import { useCategories, CATEGORIES_KEY } from '../../hooks/useCategories'
import { usePaymentMethods } from '../../hooks/usePaymentMethods'
import { useSelectedAccount } from '../../contexts/AccountContext'
import { useSettings } from '../../hooks/useSettings'
import { categoriesApi } from '../../api/categories'
import { transactionsApi } from '../../api/transactions'
import { predictionsApi } from '../../api/predictions'
import { ApiError } from '../../api/client'
import {
  INSTANCES_KEY,
  FORECAST_KEY,
  LOWEST_KEY,
} from '../../hooks/usePredictions'
import { TRANSACTIONS_KEY, SUBCATEGORIES_KEY } from '../../hooks/useTransactions'
import ExpenseRow from './ExpenseRow'
import { createEmptyRow, canCollapseRow } from './rowUtils'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardBody } from '../ui/Card'

function errMessage(e, fallback) {
  if (e instanceof ApiError) return e.message || fallback
  return fallback
}

export default function QuickEntryForm({
  rows,
  setRows,
  scrollAnchorRef,
  defaultPaymentMethodId = '',
}) {
  const qc = useQueryClient()
  const { selectedId } = useSelectedAccount()
  const { data: categories } = useCategories()
  const { data: paymentMethods } = usePaymentMethods()
  const { data: settings } = useSettings()
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState(null)
  const [globalSuccess, setGlobalSuccess] = useState(false)
  const [successDeedCount, setSuccessDeedCount] = useState(0)

  function updateRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function deleteRow(id) {
    setRows((prev) => {
      if (prev.length <= 1) return [createEmptyRow(defaultPaymentMethodId)]
      return prev.filter((r) => r.id !== id)
    })
  }

  function focusAmountByRowId(rowId) {
    setTimeout(() => {
      document.getElementById(`qe-amount-${rowId}`)?.focus()
    }, 10)
  }

  function addEmptyRow() {
    const newRow = createEmptyRow(defaultPaymentMethodId)
    setRows((prev) => [...prev, newRow])
    focusAmountByRowId(newRow.id)
  }

  function duplicateLastPlain() {
    setRows((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].kind === 'plain') {
          const src = prev[i]
          const newRow = {
            ...createEmptyRow(defaultPaymentMethodId),
            deedType: src.deedType,
            date: src.date,
            parentCategoryId: src.parentCategoryId,
            subcategory: src.subcategory,
            paymentMethodId: src.paymentMethodId,
            description: src.description || '',
            amount: '',
            collapsed: false,
          }
          focusAmountByRowId(newRow.id)
          return [...prev, newRow]
        }
      }
      return prev
    })
  }

  const lastPlainIndex = [...rows].map((r, i) => (r.kind === 'plain' ? i : -1)).filter((i) => i >= 0).pop()
  const canDuplicate = lastPlainIndex !== undefined

  function handleRowBlur(rowId) {
    return (e) => {
      const next = e.relatedTarget
      if (e.currentTarget.contains(next)) return
      setTimeout(() => {
        setRows((prev) =>
          prev.map((r) => {
            if (r.id !== rowId) return r
            if (!canCollapseRow(r)) return r
            return { ...r, collapsed: true }
          })
        )
      }, 0)
    }
  }

  async function ensureSubcategories(plainRows) {
    for (const row of plainRows) {
      const trimmed = row.subcategory?.trim()
      if (!trimmed || !row.parentCategoryId) continue
      const parentId = parseInt(row.parentCategoryId, 10)
      const deedType = row.deedType
      let cats = qc.getQueryData(CATEGORIES_KEY) || categories || []
      const siblings = cats.filter((c) => c.parent_id === parentId)
      const exists = siblings.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())
      if (!exists) {
        await categoriesApi.create({
          name: trimmed,
          type: deedType,
          parent_id: parentId,
        })
        await qc.invalidateQueries({ queryKey: CATEGORIES_KEY })
        await qc.refetchQueries({ queryKey: CATEGORIES_KEY })
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setGlobalError(null)
    setGlobalSuccess(false)
    setSuccessDeedCount(0)

    if (!selectedId) {
      setGlobalError('Hark! No treasury is selected.')
      return
    }

    const withAmount = rows.filter((r) => r.amount.trim() !== '')
    if (withAmount.length === 0) {
      setGlobalError('Inscribe at least one amount, or add a row.')
      return
    }

    for (const r of withAmount) {
      if (r.kind === 'plain' && !r.parentCategoryId) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === r.id
              ? { ...row, submitError: 'Hark! A category is required for this deed.' }
              : row
          )
        )
        setGlobalError('Some deeds lack a category.')
        return
      }
    }

    for (const r of withAmount) {
      if (r.kind !== 'plain') continue
      if (settings?.require_payment_method && !String(r.paymentMethodId || '').trim()) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === r.id
              ? { ...row, submitError: 'Thy realm requires a payment method on this deed.' }
              : row
          )
        )
        setGlobalError('Some deeds lack a payment method (required by realm settings).')
        return
      }
      if (settings?.require_subcategory && !String(r.subcategory || '').trim()) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === r.id
              ? { ...row, submitError: 'Thy realm requires a subcategory on this deed.' }
              : row
          )
        )
        setGlobalError('Some deeds lack a subcategory (required by realm settings).')
        return
      }
    }

    const predictionRows = withAmount.filter((r) => r.kind === 'prediction')
    const plainRows = withAmount.filter((r) => r.kind === 'plain')

    setSubmitting(true)

    const predResults = []
    for (const row of predictionRows) {
      const payload = {
        create_transaction: true,
        confirmed_amount: parseFloat(row.amount),
        confirmed_date: row.date,
      }
      if (row.paymentMethodId) {
        payload.payment_method_id = parseInt(row.paymentMethodId, 10)
      }
      try {
        await predictionsApi.confirmInstance(row.predictionInstanceId, payload)
        predResults.push({ rowId: row.id, ok: true })
      } catch (e) {
        const msg =
          e instanceof ApiError && e.status === 409
            ? errMessage(e, 'Already settled elsewhere — remove this row or refresh.')
            : errMessage(e, 'Could not confirm this prophecy.')
        predResults.push({ rowId: row.id, ok: false, message: msg })
      }
    }

    let batchSuccess = true
    if (plainRows.length > 0) {
      try {
        await ensureSubcategories(plainRows)
        const items = plainRows.map((row) => ({
          account_id: selectedId,
          category_id: parseInt(row.parentCategoryId, 10),
          amount: parseFloat(row.amount),
          subcategory: row.subcategory?.trim() || null,
          description: row.description?.trim() || null,
          payment_method_id: row.paymentMethodId
            ? parseInt(row.paymentMethodId, 10)
            : null,
          transaction_date: row.date,
          type: row.deedType,
          confirmed: true,
        }))
        await transactionsApi.createBatch({ transactions: items })
      } catch (e) {
        batchSuccess = false
        setGlobalError(errMessage(e, 'Alas! The batch of deeds could not be inscribed.'))
      }
    }

    await qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
    await qc.invalidateQueries({ queryKey: SUBCATEGORIES_KEY })
    await qc.invalidateQueries({ queryKey: CATEGORIES_KEY })
    await qc.invalidateQueries({ queryKey: ['stats'] })
    await qc.invalidateQueries({ queryKey: ['accounts'] })
    await qc.invalidateQueries({ queryKey: FORECAST_KEY })
    await qc.invalidateQueries({ queryKey: LOWEST_KEY })
    await qc.invalidateQueries({ queryKey: INSTANCES_KEY })

    const hadWork = predictionRows.length + plainRows.length > 0
    const allPredOk = predResults.length === 0 || predResults.every((p) => p.ok)
    const completeSuccess = hadWork && allPredOk && batchSuccess

    setRows((prev) => {
      if (completeSuccess) return [createEmptyRow(defaultPaymentMethodId)]

      const removeIds = new Set()
      for (const pr of predResults) {
        if (pr.ok) removeIds.add(pr.rowId)
      }
      if (batchSuccess) {
        for (const r of plainRows) removeIds.add(r.id)
      }

      const next = prev
        .filter((r) => !removeIds.has(r.id))
        .map((r) => {
          const failed = predResults.find((pr) => pr.rowId === r.id && !pr.ok)
          if (failed) return { ...r, submitError: failed.message }
          return { ...r, submitError: null }
        })

      return next.length === 0 ? [createEmptyRow(defaultPaymentMethodId)] : next
    })

    setSubmitting(false)

    if (completeSuccess) {
      const n = predictionRows.length + plainRows.length
      setSuccessDeedCount(n)
      setGlobalSuccess(true)
      setTimeout(() => setGlobalSuccess(false), 3500)
    }
  }

  return (
    <Card shimmer>
      <CardHeader icon={<Plus size={20} />} title="Record Thy Deeds" />
      <CardBody className="pb-6">
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          {globalError && (
            <div className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-danger text-sm font-crimson">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              {globalError}
            </div>
          )}

          {globalSuccess && (
            <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-success text-sm font-crimson">
              <Check size={18} />
              {successDeedCount === 1
                ? 'Thy deed is inscribed!'
                : `Thy ${successDeedCount} deeds are inscribed!`}
            </div>
          )}

          <div className="space-y-3">
            {rows.map((row) => {
              const childCategories = (categories || []).filter(
                (c) => c.parent_id === parseInt(row.parentCategoryId, 10)
              )
              return (
                <ExpenseRow
                  key={row.id}
                  row={row}
                  categories={categories}
                  paymentMethods={paymentMethods}
                  childCategoriesForParent={childCategories}
                  onUpdate={updateRow}
                  onDelete={deleteRow}
                  onBlur={handleRowBlur(row.id)}
                  canDelete={rows.length > 1}
                  disabled={submitting}
                />
              )
            })}
            <div ref={scrollAnchorRef} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={addEmptyRow}
              className="btn btn-ghost flex-1 min-h-touch flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add another deed
            </button>
            <button
              type="button"
              disabled={submitting || !canDuplicate}
              onClick={duplicateLastPlain}
              title={
                canDuplicate
                  ? 'Duplicate the last plain row (change amount only)'
                  : 'Add a plain expense row first'
              }
              className="btn btn-ghost flex-1 min-h-touch flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Copy size={18} />
              Duplicate deed
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full min-h-touch flex items-center justify-center gap-2"
            disabled={submitting || !selectedId}
          >
            {submitting ? 'Inscribing…' : 'Record all deeds'}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
