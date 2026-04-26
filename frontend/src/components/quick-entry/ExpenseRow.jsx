import { useState } from 'react'
import { Trash2, ChevronDown, ChevronRight, ChevronUp, Calendar } from 'lucide-react'
import { Input, Select, Textarea } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { formatDate, formatRelativeDate, formatSigned } from '../../utils/format'
import { todayStr, canCollapseRow } from './rowUtils'

/** Match Recent Chronicles transaction type pills */
const TYPE_LABELS = {
  daily: 'Daily',
  unplanned: 'Unplanned',
  predicted: 'Scheduled',
}

const TYPE_BADGE_VARIANT = {
  daily: 'muted',
  unplanned: 'primary',
  predicted: 'muted',
}

const DEED_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'unplanned', label: 'Unplanned' },
]

const FLOW_TYPES = [
  { value: 'expense', label: 'Expense' },
  { value: 'gain', label: 'Gain' },
]

function categoryLabel(categories, parentCategoryId) {
  if (!parentCategoryId || !categories) return '—'
  const c = categories.find((x) => x.id === parseInt(parentCategoryId, 10))
  return c?.name || '—'
}

function paymentLabel(paymentMethods, paymentMethodId) {
  if (!paymentMethodId || !paymentMethods) return null
  const pm = paymentMethods.find((x) => x.id === parseInt(paymentMethodId, 10))
  return pm?.name || null
}

/** Closed-state label for the plain-row “More details” toggle */
function moreDetailsClosedLabel(row) {
  const hasNote = Boolean(row.description?.trim())
  const hasPm = Boolean(row.paymentMethodId)
  if (hasNote && hasPm) return 'More details · note & payment'
  if (hasNote) return 'More details · note'
  if (hasPm) return 'More details · payment'
  return 'More details'
}

export default function ExpenseRow({
  row,
  categories,
  paymentMethods,
  childCategoriesForParent,
  onUpdate,
  onDelete,
  onBlur,
  canDelete,
  disabled,
}) {
  const [showDetails, setShowDetails] = useState(false)
  const isPrediction = row.kind === 'prediction'
  const topLevelCategories = (categories || []).filter(
    (c) => !c.parent_id && c.type === row.deedType
  )
  const childCategories = childCategoriesForParent || []

  const primarySummary = isPrediction
    ? row.templateName || 'Prediction'
    : [
        categoryLabel(categories, row.parentCategoryId),
        row.subcategory?.trim() ? row.subcategory.trim() : null,
      ]
        .filter(Boolean)
        .join(' · ')

  const numericAmount = Math.abs(parseFloat(row.amount) || 0)
  const signedAmount = isPrediction
    ? -numericAmount
    : (row.direction === 'gain' ? numericAmount : -numericAmount)
  const summaryRight = formatSigned(signedAmount)
  const summaryRightClass = signedAmount > 0 ? 'text-success' : 'text-danger'
  const pm = paymentLabel(paymentMethods, row.paymentMethodId)

  const deedTypeKey = isPrediction ? 'predicted' : row.deedType

  if (row.collapsed && canCollapseRow(row)) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onUpdate(row.id, { collapsed: false })}
        className="qe-row qe-row-summary w-full text-left rounded-md border border-gold/15 bg-black/25 px-3 py-3 min-h-touch flex items-start justify-between gap-3"
      >
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-sm font-semibold truncate text-parchment leading-tight">{primarySummary}</p>
          <p className="text-xs text-gold-muted font-crimson mt-0.5 truncate">
            {formatDate(row.date)}
            {isPrediction && row.scheduledDate
              ? ` · due ${formatRelativeDate(row.scheduledDate + 'T12:00:00')}`
              : ''}
            {pm ? ` · ${pm}` : ''}
          </p>
          {!isPrediction && row.description?.trim() && (
            <p className="text-xs text-gold-muted/90 font-crimson italic mt-0.5 line-clamp-2">
              {row.description.trim()}
            </p>
          )}
        </div>
        <div className="flex items-start gap-2 shrink-0">
          <div className="flex flex-col items-end gap-1">
            <span className={`text-sm font-bold tabular-nums ${summaryRightClass}`}>{summaryRight}</span>
            <Badge variant={TYPE_BADGE_VARIANT[deedTypeKey] ?? 'muted'}>
              {TYPE_LABELS[deedTypeKey] ?? row.deedType}
            </Badge>
          </div>
          <ChevronRight size={18} className="text-gold-muted/60 mt-0.5 shrink-0" />
        </div>
      </button>
    )
  }

  return (
    <div
      className={[
        'qe-row rounded-md border bg-black/20 px-3 py-3 space-y-3',
        isPrediction ? 'border-l-4 border-gold/50 border-t border-r border-b border-gold/15' : 'border-gold/15',
        row.submitError ? 'border-danger/60 ring-1 ring-danger/30' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onBlur={onBlur}
    >
      {isPrediction ? (
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="inline-flex items-center rounded px-2 py-1 text-xs font-bold bg-gold/20 text-gold border border-gold/30">
              Predicted · {row.templateName}
            </span>
            <span className="text-xs text-gold-muted font-crimson">
              Due {formatRelativeDate(row.scheduledDate + 'T12:00:00')}
            </span>
          </div>
          {canDelete && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onDelete(row.id)}
              className="btn btn-ghost p-2 min-h-touch min-w-touch text-danger/70 hover:text-danger shrink-0"
              title="Remove row"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="input-label m-0">Nature of deed</p>
            {canDelete && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onDelete(row.id)}
                className="btn btn-ghost p-2 min-h-touch min-w-touch text-danger/70 hover:text-danger shrink-0"
                title="Remove row"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <div className="segmented-toggle">
            {DEED_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onUpdate(row.id, { deedType: value, parentCategoryId: '', subcategory: '' })
                }
                className={[
                  'segmented-toggle-button min-h-touch',
                  row.deedType === value ? 'segmented-toggle-button-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
          <Input
            label="Date"
            type="date"
            max={todayStr()}
            value={row.date}
            disabled={disabled}
            onChange={(e) => onUpdate(row.id, { date: e.target.value })}
          />
        </div>
      )}

      {!isPrediction && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Category"
            value={row.parentCategoryId}
            disabled={disabled}
            onChange={(e) => onUpdate(row.id, { parentCategoryId: e.target.value, subcategory: '' })}
          >
            <option value="">Select category</option>
            {topLevelCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
          <div>
            <Input
              label="Subcategory"
              list={`sub-${row.id}`}
              placeholder={row.parentCategoryId ? 'Select or type new…' : 'Pick a category first'}
              value={row.subcategory}
              disabled={disabled || !row.parentCategoryId}
              onChange={(e) => onUpdate(row.id, { subcategory: e.target.value })}
            />
            <datalist id={`sub-${row.id}`}>
              {childCategories.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>
        </div>
      )}

      {!isPrediction && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Input
              id={`qe-amount-${row.id}`}
              label="Amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={row.amount}
              disabled={disabled}
              onChange={(e) => onUpdate(row.id, { amount: e.target.value, submitError: null })}
            />
            <div className="mt-1 inline-flex rounded-md border border-gold/20 bg-black/20 p-0.5">
              {FLOW_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => onUpdate(row.id, { direction: value })}
                  className={[
                    'px-1.5 py-0.5 text-[11px] font-semibold rounded transition-colors border border-transparent',
                    row.direction === value
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
            label="Payment method"
            value={row.paymentMethodId}
            disabled={disabled}
            onChange={(e) => onUpdate(row.id, { paymentMethodId: e.target.value })}
          >
            <option value="">— None —</option>
            {(paymentMethods ?? []).map((pm) => (
              <option key={pm.id} value={String(pm.id)}>
                {pm.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {isPrediction && (
        <Input
          label="Date"
          type="date"
          max={todayStr()}
          value={row.date}
          disabled={disabled}
          onChange={(e) => onUpdate(row.id, { date: e.target.value })}
        />
      )}

      {isPrediction && (
        <Select
          label="Payment method"
          value={row.paymentMethodId}
          disabled={disabled}
          onChange={(e) => onUpdate(row.id, { paymentMethodId: e.target.value })}
        >
          <option value="">— None —</option>
          {(paymentMethods ?? []).map((pm) => (
            <option key={pm.id} value={String(pm.id)}>
              {pm.name}
            </option>
          ))}
        </Select>
      )}

      {!isPrediction && (
        <div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowDetails((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-black/20 border border-gold/10 text-gold-muted hover:text-gold hover:border-gold/30 transition-colors text-sm min-h-touch"
          >
            <span className="flex items-center gap-2">
              <Calendar size={14} />
              {showDetails ? 'Hide details' : moreDetailsClosedLabel(row)}
            </span>
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showDetails && (
            <div className="mt-3 space-y-4">
              <Textarea
                label="Description"
                placeholder="Thy notes on this deed..."
                value={row.description ?? ''}
                disabled={disabled}
                onChange={(e) => onUpdate(row.id, { description: e.target.value })}
                rows={3}
              />
            </div>
          )}
        </div>
      )}

      {canCollapseRow(row) && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onUpdate(row.id, { collapsed: true })}
          className="w-full flex items-center justify-center gap-1 text-xs text-gold-muted hover:text-gold py-2 border border-gold/10 rounded-md min-h-touch"
        >
          <ChevronDown size={14} />
          Collapse row
        </button>
      )}

      {row.submitError && (
        <p className="text-danger text-sm font-crimson italic">{row.submitError}</p>
      )}
    </div>
  )
}
