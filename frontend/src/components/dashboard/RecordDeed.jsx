import { useEffect, useState } from 'react'
import { ScrollText, Plus, Check, AlertCircle, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateTransaction, useSubcategories } from '../../hooks/useTransactions'
import { useCategories, CATEGORIES_KEY } from '../../hooks/useCategories'
import { usePaymentMethods } from '../../hooks/usePaymentMethods'
import { useSettings } from '../../hooks/useSettings'
import { ApiError } from '../../api/client'
import { categoriesApi } from '../../api/categories'
import { useSelectedAccount } from '../../contexts/AccountContext'
import { Card, CardHeader, CardBody } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input, Select } from '../ui/Input'
import SubcategorySuggestions from '../ui/SubcategorySuggestions'

const DEED_TYPES = [
  { value: 'daily',     label: 'Daily' },
  { value: 'unplanned', label: 'Unplanned' },
]

const FLOW_TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'gain', label: 'Gain' },
]

const today = () => new Date().toISOString().split('T')[0]

export default function RecordDeed() {
  const qc = useQueryClient()
  const { selectedId, selectedAccount } = useSelectedAccount()
  const { data: categories } = useCategories()
  const { data: paymentMethods } = usePaymentMethods()
  const { data: settings } = useSettings()
  const createTransaction = useCreateTransaction()

  const [deedType, setDeedType]               = useState('daily')
  const [flowType, setFlowType]               = useState('expense')
  const [amount, setAmount]                   = useState('')
  const [parentCategoryId, setParentCategoryId] = useState('')
  const [subcategory, setSubcategory]         = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  useEffect(() => {
    if (!selectedAccount) return
    setPaymentMethodId(
      selectedAccount.default_payment_method_id
        ? String(selectedAccount.default_payment_method_id)
        : ''
    )
  }, [selectedAccount?.id, selectedAccount?.default_payment_method_id])


  const [showDetails, setShowDetails]         = useState(false)
  const [date, setDate]                       = useState(today())
  const [description, setDescription]         = useState('')

  const [isSuccess, setIsSuccess]             = useState(false)
  const [error, setError]                     = useState(null)

  // Top-level categories matching the current deed type
  const topLevelCategories = (categories || []).filter(
    c => !c.parent_id && c.type === deedType
  )

  // Children of the currently selected parent category
  const childCategories = (categories || []).filter(
    c => c.parent_id === parseInt(parentCategoryId)
  )

  const handleTypeChange = (type) => {
    setDeedType(type)
    setParentCategoryId('')
    setSubcategory('')
  }

  const handleParentChange = (e) => {
    setParentCategoryId(e.target.value)
    setSubcategory('') // reset subcategory when parent changes
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSuccess(false)

    if (!amount || !parentCategoryId || !selectedId) {
      setError('Hark! Thou must provide an amount and a category.')
      return
    }
    const parsedAmount = parseFloat(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Hark! Use a positive amount greater than zero.')
      return
    }

    if (deedType === 'daily' || deedType === 'unplanned') {
      if (settings?.require_payment_method && !paymentMethodId) {
        setError('Hark! Thy realm requires a payment method on this deed.')
        return
      }
      if (settings?.require_subcategory && !subcategory.trim()) {
        setError('Hark! Thy realm requires a subcategory on this deed.')
        return
      }
    }

    try {
      const categoryId = parseInt(parentCategoryId)

      if (subcategory.trim()) {
        const trimmed = subcategory.trim()
        const alreadyExists = childCategories.some(
          c => c.name.toLowerCase() === trimmed.toLowerCase()
        )
        if (!alreadyExists) {
          // Register as a child category so it appears in autocomplete next time
          await categoriesApi.create({
            name: trimmed,
            type: deedType,
            parent_id: categoryId,
          })
          qc.invalidateQueries({ queryKey: CATEGORIES_KEY })
        }
      }

      await createTransaction.mutateAsync({
        account_id: selectedId,
        category_id: categoryId,
        amount: flowType === 'gain' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
        subcategory: subcategory.trim() || null,
        payment_method_id: paymentMethodId ? parseInt(paymentMethodId) : null,
        description: description || null,
        transaction_date: date,
        type: deedType,
        confirmed: true,
      })

      setAmount('')
      setFlowType('expense')
      setParentCategoryId('')
      setSubcategory('')
      setPaymentMethodId(
        selectedAccount?.default_payment_method_id
          ? String(selectedAccount.default_payment_method_id)
          : ''
      )
      setDate(today())
      setDescription('')
      setIsSuccess(true)
      setTimeout(() => setIsSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Alas! The record could not be inscribed.')
    }
  }

  return (
    <Card shimmer>
      <CardHeader icon={<ScrollText size={20} />} title="Record Thy Deed" />
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nature of Deed toggle */}
          <div className="space-y-1">
            <p className="input-label">Nature of Deed</p>
            <div className="segmented-toggle">
              {DEED_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleTypeChange(value)}
                  className={[
                    'segmented-toggle-button',
                    deedType === value ? 'segmented-toggle-button-active' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={parentCategoryId}
              onChange={handleParentChange}
              required
            >
              <option value="">Select Category</option>
              {topLevelCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </Select>

            <div>
              <SubcategorySuggestions
                label="Subcategory"
                placeholder={parentCategoryId ? 'Select or type new…' : 'Pick a category first'}
                value={subcategory}
                onChange={(val) => setSubcategory(val)}
                suggestions={childCategories.map((c) => c.name)}
                disabled={!parentCategoryId}
              />
            </div>
          </div>

          {/* Amount & Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <div className="mt-1 inline-flex rounded-md border border-gold/20 bg-black/20 p-0.5">
                {FLOW_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFlowType(value)}
                    className={[
                      'px-1.5 py-0.5 text-[11px] font-semibold rounded transition-colors border border-transparent',
                      flowType === value
                        ? 'bg-gold/20 text-gold border-gold/30'
                        : 'text-gold-muted hover:text-gold hover:border-gold/20',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Select
              label="Payment Method"
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
            >
              <option value="">Select Method</option>
              {paymentMethods?.map((pm) => (
                <option key={pm.id} value={pm.id}>{pm.name}</option>
              ))}
            </Select>
          </div>

          {/* Collapsible: Date & Description */}
          <div>
            <button
              type="button"
              onClick={() => setShowDetails(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-black/20 border border-gold/10 text-gold-muted hover:text-gold hover:border-gold/30 transition-colors text-sm"
            >
              <span className="flex items-center gap-2">
                <Calendar size={14} />
                {showDetails ? 'Hide details' : (
                  date !== today() ? `${date} · More details` : 'More details'
                )}
              </span>
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showDetails && (
              <div className="mt-3 space-y-4">
                <Input
                  label="Date"
                  type="date"
                  value={date}
                  max={today()}
                  onChange={(e) => setDate(e.target.value)}
                />
                <Input
                  label="Description"
                  placeholder="Thy notes on this deed..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            className="w-full flex items-center justify-center gap-2"
            disabled={createTransaction.isPending}
          >
            {createTransaction.isPending ? (
              'Inscribing...'
            ) : isSuccess ? (
              <><Check size={18} /> Inscribed!</>
            ) : (
              <><Plus size={18} /> Record Deed</>
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 text-danger text-sm font-crimson italic">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

        </form>
      </CardBody>
    </Card>
  )
}
