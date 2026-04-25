import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Pause, Play, TrendingDown, Trash2, X } from 'lucide-react'
import {
  useCreatePredictionTemplate,
  useConfirmInstance,
  useDeletePredictionTemplate,
  usePausePredictionTemplate,
  usePredictionInstances,
  usePredictionTemplates,
  useResumePredictionTemplate,
  useSkipInstance,
  useUpdatePredictionTemplate,
} from '../hooks/usePredictions'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import PageContextHeader from '../components/layout/PageContextHeader'
import { useSelectedAccount } from '../contexts/AccountContext'
import { formatAmount, formatDate } from '../utils/format'

const INSTANCE_PREVIEW_LIMIT = 5

const FREQUENCY_OPTIONS = [
  { value: 'every_n_days', label: 'Every N days' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'once', label: 'Once' },
]

function frequencyLabel(template) {
  if (template.frequency === 'every_n_days') return `Every ${template.interval || 1} days`
  if (template.frequency === 'monthly') return `Monthly (day ${template.day_of_month || '?'})`
  if (template.frequency === 'yearly') return 'Yearly'
  if (template.frequency === 'once') return 'Once'
  return template.frequency
}

function TemplateModal({ mode, template, accountName, onClose, onSave, isSaving, saveError }) {
  const isCreate = mode === 'create'
  const [form, setForm] = useState({
    name: template?.name || '',
    amount: Math.abs(Number(template?.amount || 0)).toString(),
    type: template?.type || 'expense',
    frequency: template?.frequency || 'monthly',
    interval: template?.interval ? String(template.interval) : '',
    day_of_month: template?.day_of_month ? String(template.day_of_month) : '',
    start_date: template?.start_date || new Date().toISOString().split('T')[0],
  })

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const basePayload = {
      name: form.name.trim(),
      amount: Number(form.amount),
      type: form.type,
      frequency: form.frequency,
      start_date: form.start_date,
      interval: form.frequency === 'every_n_days' ? Number(form.interval) : null,
      day_of_month: form.frequency === 'monthly' ? Number(form.day_of_month) : null,
    }
    const payload = isCreate
      ? basePayload
      : basePayload
    onSave(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-2xl rounded-lg border border-gold/30 shadow-card bg-brown-dark">
        <div className="card-header">
          <h3 className="card-title">
            {isCreate ? 'Create Prophecy Template' : `Edit Prophecy Template #${template?.id}`}
          </h3>
          <Button variant="ghost" className="ml-auto" onClick={onClose} aria-label="Close template modal">
            <X size={18} />
          </Button>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label>
              <span className="input-label">Name</span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                maxLength={100}
                required
              />
            </label>
            {isCreate && accountName && (
              <div className="md:col-span-2">
                <span className="input-label">Account</span>
                <p className="text-sm text-gold">{accountName}</p>
              </div>
            )}
            <label>
              <span className="input-label">Type</span>
              <select className="input" value={form.type} onChange={(e) => setField('type', e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label>
              <span className="input-label">Amount</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                value={form.amount}
                onChange={(e) => setField('amount', e.target.value)}
                required
              />
            </label>
            <label>
              <span className="input-label">Frequency</span>
              <select
                className="input"
                value={form.frequency}
                onChange={(e) => setField('frequency', e.target.value)}
              >
                {FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="input-label">Start date</span>
              <input
                type="date"
                className="input"
                value={form.start_date}
                onChange={(e) => setField('start_date', e.target.value)}
                required
              />
            </label>
            {form.frequency === 'every_n_days' && (
              <label>
                <span className="input-label">Interval (days)</span>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={form.interval}
                  onChange={(e) => setField('interval', e.target.value)}
                  required
                />
              </label>
            )}
            {form.frequency === 'monthly' && (
              <label>
                <span className="input-label">Day of month</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="input"
                  value={form.day_of_month}
                  onChange={(e) => setField('day_of_month', e.target.value)}
                  required
                />
              </label>
            )}
            {saveError && (
              <p className="md:col-span-2 text-danger text-sm font-crimson italic">{saveError}</p>
            )}
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isSaving}>
                {isSaving ? (isCreate ? 'Creating...' : 'Saving...') : (isCreate ? 'Create Template' : 'Save Template')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function PredictionsPage() {
  const { selectedId, selectedAccount } = useSelectedAccount()
  const { data: templates, isLoading, isError, error } = usePredictionTemplates(selectedId)
  const { data: pendingInstances } = usePredictionInstances(
    selectedId ? { status: 'pending', account_id: selectedId } : { status: 'pending' }
  )
  const createTemplate = useCreatePredictionTemplate()
  const pauseTemplate = usePausePredictionTemplate()
  const resumeTemplate = useResumePredictionTemplate()
  const updateTemplate = useUpdatePredictionTemplate()
  const deleteTemplate = useDeletePredictionTemplate()
  const confirmInstance = useConfirmInstance()
  const skipInstance = useSkipInstance()

  const [expandedTemplateIds, setExpandedTemplateIds] = useState(new Set())
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [titleFilter, setTitleFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [frequencyFilter, setFrequencyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const instancesByTemplate = useMemo(() => {
    const grouped = new Map()
    for (const instance of pendingInstances || []) {
      const list = grouped.get(instance.template_id) || []
      list.push(instance)
      grouped.set(instance.template_id, list)
    }
    for (const [, list] of grouped) {
      list.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    }
    return grouped
  }, [pendingInstances])

  const filteredTemplates = useMemo(() => {
    return (templates || []).filter((template) => {
      const matchesTitle = !titleFilter
        || template.name.toLowerCase().includes(titleFilter.trim().toLowerCase())
      const matchesType = !typeFilter || template.type === typeFilter
      const matchesFrequency = !frequencyFilter || template.frequency === frequencyFilter
      const matchesStatus = !statusFilter
        || (statusFilter === 'active' ? !template.paused : template.paused)
      return matchesTitle && matchesType && matchesFrequency && matchesStatus
    })
  }, [templates, titleFilter, typeFilter, frequencyFilter, statusFilter])

  function toggleExpanded(templateId) {
    setExpandedTemplateIds((prev) => {
      const next = new Set(prev)
      if (next.has(templateId)) next.delete(templateId)
      else next.add(templateId)
      return next
    })
  }

  async function handlePauseResume(template) {
    if (template.paused) {
      await resumeTemplate.mutateAsync(template.id)
      return
    }
    await pauseTemplate.mutateAsync(template.id)
  }

  async function handleDelete(template) {
    const ok = window.confirm(
      `Delete prophecy template "${template.name}"? Future pending instances will be removed; historical confirmed/skipped records remain.`
    )
    if (!ok) return
    await deleteTemplate.mutateAsync(template.id)
  }

  async function handleSaveTemplate(payload) {
    if (!editingTemplate) return
    setSaveError('')
    try {
      await updateTemplate.mutateAsync({ id: editingTemplate.id, ...payload })
      setEditingTemplate(null)
    } catch (e) {
      setSaveError(e?.message || 'Hark! Could not save this template.')
    }
  }

  async function handleCreateTemplate(payload) {
    if (!selectedId) {
      setSaveError('Hark! Select an account before creating a template.')
      return
    }
    setSaveError('')
    try {
      await createTemplate.mutateAsync({ ...payload, account_id: selectedId })
      setIsCreateOpen(false)
    } catch (e) {
      setSaveError(e?.message || 'Hark! Could not create this template.')
    }
  }

  async function handleConfirmInstance(instance) {
    await confirmInstance.mutateAsync({
      id: instance.id,
      create_transaction: true,
      confirmed_date: instance.scheduled_date,
      confirmed_amount: Math.abs(Number(instance.amount)),
    })
  }

  async function handleSkipInstance(instanceId) {
    await skipInstance.mutateAsync(instanceId)
  }

  return (
    <div className="page-shell">
      <PageContextHeader
        icon={TrendingDown}
        title="Prophecies"
        subtitle={
          selectedAccount
            ? `Manage templates and upcoming instances for ${selectedAccount.name}.`
            : 'Manage templates, pause/resume cycles, and settle upcoming prophecy instances.'
        }
        showAccountSwitcher
      />

      <div className="page-container">
        <div className="flex flex-col gap-8 max-w-3xl w-full">
          <Card shimmer>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="md:col-span-2">
                    <span className="input-label">Title contains</span>
                    <input
                      className="input"
                      value={titleFilter}
                      onChange={(e) => setTitleFilter(e.target.value)}
                      placeholder="Rent, salary, internet..."
                    />
                  </label>
                  <label>
                    <span className="input-label">Type</span>
                    <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                      <option value="">All</option>
                      <option value="expense">Expense</option>
                      <option value="income">Gain</option>
                    </select>
                  </label>
                  <label>
                    <span className="input-label">Frequency</span>
                    <select className="input" value={frequencyFilter} onChange={(e) => setFrequencyFilter(e.target.value)}>
                      <option value="">All</option>
                      {FREQUENCY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="input-label">Status</span>
                    <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="">All</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-gold-muted font-crimson italic">
                    Showing {filteredTemplates.length} of {(templates || []).length} templates.
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setTitleFilter('')
                      setTypeFilter('')
                      setFrequencyFilter('')
                      setStatusFilter('')
                    }}
                  >
                    Reset filters
                  </Button>
                </div>
              </CardBody>
            )}
          </Card>
          <Card shimmer>
            <CardHeader title="Prediction Templates">
              <Button
                variant="primary"
                className="ml-auto"
                disabled={!selectedId}
                onClick={() => {
                  setSaveError('')
                  setIsCreateOpen(true)
                }}
              >
                New Template
              </Button>
            </CardHeader>
            <CardBody>
            {isLoading && (
              <p className="text-gold-muted font-crimson italic">Consulting the oracle...</p>
            )}
            {isError && (
              <p className="text-danger font-crimson italic">
                Hark! The prophecy templates could not be loaded. {error?.message || ''}
              </p>
            )}
            {!isLoading && !isError && (templates || []).length === 0 && (
              <p className="text-gold-muted font-crimson italic">No prophecy templates yet.</p>
            )}

            {!isLoading && !isError && (templates || []).length > 0 && filteredTemplates.length === 0 && (
              <p className="text-gold-muted font-crimson italic">No templates match these filters.</p>
            )}

            {!isLoading && !isError && filteredTemplates.length > 0 && (
              <div className="space-y-3">
                {filteredTemplates.map((template) => {
                const upcoming = instancesByTemplate.get(template.id) || []
                const nextScheduled = upcoming[0]?.scheduled_date || null
                const isExpanded = expandedTemplateIds.has(template.id)

                return (
                  <div
                    key={template.id}
                    className={`rounded-lg border border-gold/20 bg-black/20 ${template.paused ? 'opacity-60' : ''}`}
                  >
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-gold leading-tight">
                            {template.name}
                            {template.paused && (
                              <span className="ml-2 align-middle">
                                <Badge variant="muted">Paused</Badge>
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gold-muted mt-1">
                            {selectedAccount ? selectedAccount.name : `Account #${template.account_id}`} · {frequencyLabel(template)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-semibold ${Number(template.amount) < 0 ? 'text-success' : 'text-danger'}`}>
                            {Number(template.amount) < 0 ? '+' : '-'}{formatAmount(template.amount)}
                          </p>
                          <p className="text-xs text-gold-muted mt-1">
                            Next: {nextScheduled ? formatDate(nextScheduled) : '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gold/10 pt-3">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(template.id)}
                          className="inline-flex items-center gap-1 text-sm text-gold-muted hover:text-gold"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          Upcoming instances ({upcoming.length})
                        </button>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button
                            variant="ghost"
                            onClick={() => handlePauseResume(template)}
                            disabled={pauseTemplate.isPending || resumeTemplate.isPending}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gold/20 bg-black/20 text-xs leading-none ${
                              template.paused ? 'text-success' : 'text-gold'
                            }`}
                          >
                            {template.paused ? <Play size={14} /> : <Pause size={14} />}
                            <span>{template.paused ? 'Resume' : 'Pause'}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gold/20 bg-black/20 text-gold text-xs leading-none"
                            onClick={() => setEditingTemplate(template)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-danger/40 bg-black/20 text-danger text-xs leading-none"
                            onClick={() => handleDelete(template)}
                            disabled={deleteTemplate.isPending}
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gold/10 pt-3 space-y-2">
                          {upcoming.length === 0 && (
                            <p className="text-xs text-gold-muted font-crimson italic">
                              No upcoming pending instances for this template.
                            </p>
                          )}
                          {upcoming.slice(0, INSTANCE_PREVIEW_LIMIT).map((instance) => (
                            <div
                              key={instance.id}
                              className="rounded-md border border-gold/10 bg-black/20 px-3 py-2 flex items-center justify-between gap-3"
                            >
                              <div>
                                <p className="text-sm">{formatDate(instance.scheduled_date)}</p>
                                <p className={`text-xs ${Number(instance.amount) < 0 ? 'text-success' : 'text-danger'}`}>
                                  {Number(instance.amount) < 0 ? '+' : '-'}{formatAmount(instance.amount)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  className="text-success"
                                  onClick={() => handleConfirmInstance(instance)}
                                  disabled={confirmInstance.isPending}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="text-danger"
                                  onClick={() => handleSkipInstance(instance.id)}
                                  disabled={skipInstance.isPending}
                                >
                                  Skip
                                </Button>
                              </div>
                            </div>
                          ))}
                          {upcoming.length > INSTANCE_PREVIEW_LIMIT && (
                            <p className="text-xs text-gold-muted">
                              Showing first {INSTANCE_PREVIEW_LIMIT} upcoming instances.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
                })}
              </div>
            )}
            </CardBody>
          </Card>
        </div>
      </div>

      {isCreateOpen && (
        <TemplateModal
          mode="create"
          template={null}
          accountName={selectedAccount?.name}
          onClose={() => {
            setIsCreateOpen(false)
            setSaveError('')
          }}
          onSave={handleCreateTemplate}
          isSaving={createTemplate.isPending}
          saveError={saveError}
        />
      )}

      {editingTemplate && (
        <TemplateModal
          mode="edit"
          template={editingTemplate}
          accountName={selectedAccount?.name}
          onClose={() => {
            setEditingTemplate(null)
            setSaveError('')
          }}
          onSave={handleSaveTemplate}
          isSaving={updateTemplate.isPending}
          saveError={saveError}
        />
      )}
    </div>
  )
}
