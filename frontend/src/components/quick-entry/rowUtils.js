export function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export function createEmptyRow(defaultPaymentMethodId = '') {
  return {
    id: crypto.randomUUID(),
    kind: 'plain',
    predictionInstanceId: null,
    templateName: null,
    scheduledDate: null,
    deedType: 'daily',
    direction: 'expense',
    amount: '',
    date: todayStr(),
    parentCategoryId: '',
    subcategory: '',
    paymentMethodId: defaultPaymentMethodId ? String(defaultPaymentMethodId) : '',
    description: '',
    collapsed: false,
    submitError: null,
  }
}

export function canCollapseRow(row) {
  if (!row.amount?.trim()) {
    if (
      row.kind === 'prediction' &&
      row.predictionInstanceId &&
      row.scheduledPredictionAmount != null
    ) {
      return true
    }
    return false
  }
  if (row.kind === 'prediction') return true
  return Boolean(row.parentCategoryId)
}

/** @param {object} instance — prediction instance from GET /api/predictions/instances */
export function createPredictionRow(instance, fallbackPaymentMethodId = '') {
  const scheduledNum = Number(instance.amount)
  const hasScheduled = Number.isFinite(scheduledNum)
  const absNum = hasScheduled ? Math.abs(scheduledNum) : NaN
  const amountStr = Number.isFinite(absNum) ? String(absNum) : ''
  return {
    id: crypto.randomUUID(),
    kind: 'prediction',
    predictionInstanceId: instance.id,
    templateName: instance.template_name || 'Prediction',
    scheduledDate: instance.scheduled_date,
    /** Signed prophecy amount from server; used for placeholder + summary when amount is blank. */
    scheduledPredictionAmount: hasScheduled ? scheduledNum : null,
    deedType: 'predicted',
    direction: 'expense',
    amount: amountStr,
    date: todayStr(),
    parentCategoryId: '',
    subcategory: '',
    paymentMethodId: instance.template_payment_method_id
      ? String(instance.template_payment_method_id)
      : (fallbackPaymentMethodId ? String(fallbackPaymentMethodId) : ''),
    description: '',
    collapsed: false,
    submitError: null,
  }
}
