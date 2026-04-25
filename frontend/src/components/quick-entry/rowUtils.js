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
  if (!row.amount?.trim()) return false
  if (row.kind === 'prediction') return true
  return Boolean(row.parentCategoryId)
}

/** @param {object} instance — prediction instance from GET /api/predictions/instances */
export function createPredictionRow(instance, fallbackPaymentMethodId = '') {
  const raw = parseFloat(instance.amount)
  const abs = Number.isFinite(raw) ? Math.abs(raw) : ''
  return {
    id: crypto.randomUUID(),
    kind: 'prediction',
    predictionInstanceId: instance.id,
    templateName: instance.template_name || 'Prediction',
    scheduledDate: instance.scheduled_date,
    deedType: 'predicted',
    amount: abs === '' ? '' : String(abs),
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
