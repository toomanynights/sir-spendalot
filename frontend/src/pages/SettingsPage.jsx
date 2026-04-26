import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarX2, ChevronLeft, ChevronRight, Settings, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageContextHeader from '../components/layout/PageContextHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import {
  useCreateExcludedDay,
  useDeleteExcludedDay,
  useExcludedDays,
  useSettings,
  useUpdateSettings,
} from '../hooks/useSettings'
import { formatDate } from '../utils/format'
import { importerApi } from '../api/importer'

const todayStr = () => new Date().toISOString().split('T')[0]

const NUMERIC_DEFAULTS = {
  prediction_horizon_days: 90,
  rolling_average_days: 30,
  daily_high_threshold: 110,
  daily_low_threshold: 90,
}

const LIMITS = {
  prediction_horizon_days: { min: 7, max: 365 },
  rolling_average_days: { min: 3, max: 180 },
  daily_high_threshold: { min: 80, max: 300 },
  daily_low_threshold: { min: 50, max: 150 },
}

function coerceNumericField(raw, key) {
  const def = NUMERIC_DEFAULTS[key]
  const { min, max } = LIMITS[key]
  const trimmed = String(raw ?? '').trim()
  if (trimmed === '') return def
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return def
  return Math.min(max, Math.max(min, Math.round(n)))
}

const EXCLUDED_PAGE_SIZE = 5

export default function SettingsPage() {
  const { data: settings, isLoading: settingsLoading } = useSettings()
  const { data: excludedDays, isLoading: excludedLoading } = useExcludedDays()
  const updateSettings = useUpdateSettings()
  const createExcludedDay = useCreateExcludedDay()
  const deleteExcludedDay = useDeleteExcludedDay()

  const [form, setForm] = useState({
    prediction_horizon_days: String(NUMERIC_DEFAULTS.prediction_horizon_days),
    rolling_average_days: String(NUMERIC_DEFAULTS.rolling_average_days),
    daily_high_threshold: String(NUMERIC_DEFAULTS.daily_high_threshold),
    daily_low_threshold: String(NUMERIC_DEFAULTS.daily_low_threshold),
    show_decimals: true,
    show_predictive_non_primary: false,
    require_payment_method: false,
    require_subcategory: false,
  })
  const [settingsError, setSettingsError] = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState(false)

  const [excludedDate, setExcludedDate] = useState(todayStr())
  const [excludedReason, setExcludedReason] = useState('')
  const [excludedError, setExcludedError] = useState('')
  const [excludedPage, setExcludedPage] = useState(0)
  const [backupFile, setBackupFile] = useState(null)
  const [opsBusy, setOpsBusy] = useState('')
  const [opsError, setOpsError] = useState('')
  const [opsSuccess, setOpsSuccess] = useState('')
  const restoreInputRef = useRef(null)

  useEffect(() => {
    if (!settings) return
    setForm({
      prediction_horizon_days: String(settings.prediction_horizon_days),
      rolling_average_days: String(settings.rolling_average_days),
      daily_high_threshold: String(settings.daily_high_threshold),
      daily_low_threshold: String(settings.daily_low_threshold),
      show_decimals: settings.show_decimals,
      show_predictive_non_primary: settings.show_predictive_non_primary,
      require_payment_method: settings.require_payment_method,
      require_subcategory: settings.require_subcategory,
    })
  }, [settings])

  const sortedExcluded = useMemo(() => {
    const list = excludedDays ?? []
    return [...list].sort((a, b) => String(b.excluded_date).localeCompare(String(a.excluded_date)))
  }, [excludedDays])

  const excludedTotalPages = Math.max(1, Math.ceil(sortedExcluded.length / EXCLUDED_PAGE_SIZE))

  useEffect(() => {
    setExcludedPage((p) => Math.min(p, excludedTotalPages - 1))
  }, [excludedTotalPages])

  const excludedSlice = sortedExcluded.slice(
    excludedPage * EXCLUDED_PAGE_SIZE,
    excludedPage * EXCLUDED_PAGE_SIZE + EXCLUDED_PAGE_SIZE,
  )
  const excludedHasPrev = excludedPage > 0
  const excludedHasNext = excludedPage < excludedTotalPages - 1

  const todayExcluded = useMemo(
    () => sortedExcluded.some((row) => row.excluded_date === todayStr()),
    [sortedExcluded],
  )

  const thresholdWarning = useMemo(() => {
    const high = coerceNumericField(form.daily_high_threshold, 'daily_high_threshold')
    const low = coerceNumericField(form.daily_low_threshold, 'daily_low_threshold')
    return low >= high ? 'Low threshold must be lower than high threshold.' : ''
  }, [form.daily_low_threshold, form.daily_high_threshold])

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSaveSettings(e) {
    e.preventDefault()
    setSettingsError('')
    setSettingsSuccess(false)

    const prediction_horizon_days = coerceNumericField(form.prediction_horizon_days, 'prediction_horizon_days')
    const rolling_average_days = coerceNumericField(form.rolling_average_days, 'rolling_average_days')
    const daily_high_threshold = coerceNumericField(form.daily_high_threshold, 'daily_high_threshold')
    const daily_low_threshold = coerceNumericField(form.daily_low_threshold, 'daily_low_threshold')

    if (daily_low_threshold >= daily_high_threshold) {
      setSettingsError('Low threshold must be lower than high threshold.')
      return
    }
    try {
      await updateSettings.mutateAsync({
        prediction_horizon_days,
        rolling_average_days,
        daily_high_threshold,
        daily_low_threshold,
        show_decimals: form.show_decimals,
        show_predictive_non_primary: form.show_predictive_non_primary,
        require_payment_method: form.require_payment_method,
        require_subcategory: form.require_subcategory,
      })
      setForm((prev) => ({
        ...prev,
        prediction_horizon_days: String(prediction_horizon_days),
        rolling_average_days: String(rolling_average_days),
        daily_high_threshold: String(daily_high_threshold),
        daily_low_threshold: String(daily_low_threshold),
      }))
      setSettingsSuccess(true)
      setTimeout(() => setSettingsSuccess(false), 2500)
    } catch (err) {
      setSettingsError(err?.message || 'Hark! Settings could not be saved.')
    }
  }

  async function handleExcludeToday() {
    setExcludedError('')
    try {
      await createExcludedDay.mutateAsync({ excluded_date: todayStr() })
    } catch (err) {
      setExcludedError(err?.message || 'Could not exclude today.')
    }
  }

  async function handleAddExcludedDay(e) {
    e.preventDefault()
    setExcludedError('')
    try {
      await createExcludedDay.mutateAsync({
        excluded_date: excludedDate,
        reason: excludedReason.trim() || undefined,
      })
      setExcludedReason('')
    } catch (err) {
      setExcludedError(err?.message || 'Could not add excluded day.')
    }
  }

  async function handleRemoveExcludedDay(dateStr) {
    try {
      await deleteExcludedDay.mutateAsync(dateStr)
    } catch (err) {
      setExcludedError(err?.message || 'Could not remove excluded day.')
    }
  }

  async function handleBackupDownload() {
    setOpsBusy('backup')
    setOpsError('')
    setOpsSuccess('')
    try {
      const res = await importerApi.backup()
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `spendalot-user-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      a.click()
      URL.revokeObjectURL(url)
      setOpsSuccess('Backup downloaded.')
    } catch (e) {
      setOpsError(e?.message || 'Backup failed.')
    } finally {
      setOpsBusy('')
    }
  }

  async function handleRestore(fileToRestore) {
    if (!fileToRestore) return
    setOpsBusy('restore')
    setOpsError('')
    setOpsSuccess('')
    try {
      await importerApi.restoreJsonFile(fileToRestore)
      setOpsSuccess('Restore completed.')
    } catch (e) {
      setOpsError(e?.message || 'Restore failed.')
    } finally {
      setOpsBusy('')
    }
  }

  function handleRestoreClick() {
    restoreInputRef.current?.click()
  }

  async function handleRestoreFileChange(e) {
    const file = e.target.files?.[0] || null
    setBackupFile(file)
    if (file) {
      await handleRestore(file)
    }
    e.target.value = ''
  }

  async function handleNuke() {
    const ok = window.prompt('Type NUKE to confirm data wipe')
    if (ok !== 'NUKE') return
    setOpsBusy('nuke')
    setOpsError('')
    setOpsSuccess('')
    try {
      await importerApi.nuke()
      setOpsSuccess('All user data wiped.')
    } catch (e) {
      setOpsError(e?.message || 'Nuke failed.')
    } finally {
      setOpsBusy('')
    }
  }

  return (
    <div className="page-shell">
      <PageContextHeader
        icon={Settings}
        title="Settings"
        subtitle="Configure forecast, thresholds, and excluded days for the realm."
        showAccountSwitcher={false}
      />
      <div className="page-container">
        <div className="flex flex-col gap-6 max-w-3xl w-full">
          <Card shimmer>
            <CardHeader title="Forecast & Stats" />
            <CardBody>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    id="settings-prediction-horizon"
                    label="Prediction horizon days"
                    type="number"
                    min="7"
                    max="365"
                    placeholder={String(NUMERIC_DEFAULTS.prediction_horizon_days)}
                    value={form.prediction_horizon_days}
                    onChange={(e) => setField('prediction_horizon_days', e.target.value)}
                  />
                  <Input
                    id="settings-rolling-average"
                    label="Rolling average days"
                    type="number"
                    min="3"
                    max="180"
                    placeholder={String(NUMERIC_DEFAULTS.rolling_average_days)}
                    value={form.rolling_average_days}
                    onChange={(e) => setField('rolling_average_days', e.target.value)}
                  />
                  <Input
                    id="settings-daily-high"
                    label="Daily high threshold (%)"
                    type="number"
                    min="80"
                    max="300"
                    placeholder={String(NUMERIC_DEFAULTS.daily_high_threshold)}
                    value={form.daily_high_threshold}
                    onChange={(e) => setField('daily_high_threshold', e.target.value)}
                  />
                  <Input
                    id="settings-daily-low"
                    label="Daily low threshold (%)"
                    type="number"
                    min="50"
                    max="150"
                    placeholder={String(NUMERIC_DEFAULTS.daily_low_threshold)}
                    value={form.daily_low_threshold}
                    onChange={(e) => setField('daily_low_threshold', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gold-muted cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-gold"
                      checked={form.show_decimals}
                      onChange={(e) => setField('show_decimals', e.target.checked)}
                    />
                    Show decimals in amount displays
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gold-muted cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-gold"
                      checked={form.show_predictive_non_primary}
                      onChange={(e) => setField('show_predictive_non_primary', e.target.checked)}
                    />
                    Show predictive features on non-primary accounts
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gold-muted cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-gold"
                      checked={form.require_payment_method}
                      onChange={(e) => setField('require_payment_method', e.target.checked)}
                    />
                    Require payment method on transactions
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gold-muted cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-gold"
                      checked={form.require_subcategory}
                      onChange={(e) => setField('require_subcategory', e.target.checked)}
                    />
                    Require subcategory on transactions
                  </label>
                </div>

                {thresholdWarning ? <p className="text-sm text-danger font-crimson">{thresholdWarning}</p> : null}
                {settingsError ? <p className="text-sm text-danger font-crimson">{settingsError}</p> : null}
                {settingsSuccess ? <p className="text-sm text-success font-crimson">Thy settings are recorded!</p> : null}

                <div className="flex items-center gap-3">
                  <Button type="submit" variant="primary" disabled={updateSettings.isPending || settingsLoading}>
                    {updateSettings.isPending ? 'Saving...' : 'Save settings'}
                  </Button>
                  {settingsLoading ? <span className="text-sm text-gold-muted font-crimson">Loading current values...</span> : null}
                </div>
              </form>
            </CardBody>
          </Card>

          <Card shimmer>
            <CardHeader icon={<CalendarX2 size={18} />} title="Excluded Days">
              {todayExcluded ? (
                <span className="ml-auto text-sm text-gold-muted font-crimson italic select-none shrink-0">
                  Today excluded
                </span>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  className="ml-auto text-sm py-2 px-4 shrink-0"
                  onClick={handleExcludeToday}
                  disabled={createExcludedDay.isPending}
                >
                  Exclude today
                </Button>
              )}
            </CardHeader>
            <CardBody className="space-y-4">
              <form onSubmit={handleAddExcludedDay} className="grid grid-cols-1 md:grid-cols-[auto,1fr,auto] gap-3 items-end">
                <Input
                  label="Date"
                  type="date"
                  value={excludedDate}
                  onChange={(e) => setExcludedDate(e.target.value)}
                  required
                />
                <Input
                  label="Reason (optional)"
                  value={excludedReason}
                  onChange={(e) => setExcludedReason(e.target.value)}
                  maxLength={255}
                  placeholder="Holiday, anomaly, missing records..."
                />
                <Button type="submit" disabled={createExcludedDay.isPending}>
                  Add excluded day
                </Button>
              </form>

              {excludedError ? <p className="text-sm text-danger font-crimson">{excludedError}</p> : null}

              {excludedLoading ? (
                <p className="text-sm text-gold-muted font-crimson">Loading excluded days...</p>
              ) : (
                <div className="space-y-2">
                  {sortedExcluded.length === 0 ? (
                    <p className="text-sm text-gold-muted font-crimson">No excluded days recorded.</p>
                  ) : (
                    excludedSlice.map((row) => (
                      <div key={row.excluded_date} className="treasury-row">
                        <div>
                          <p className="text-parchment font-semibold font-cinzel">{formatDate(row.excluded_date)}</p>
                          <p className="treasury-row-meta">{row.reason || 'No reason provided'}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="!px-2 text-danger/80 hover:text-danger"
                          onClick={() => handleRemoveExcludedDay(row.excluded_date)}
                          disabled={deleteExcludedDay.isPending}
                          title="Remove excluded day"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {(excludedHasPrev || excludedHasNext) && sortedExcluded.length > 0 ? (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gold/10">
                  <button
                    type="button"
                    onClick={() => setExcludedPage((p) => p - 1)}
                    disabled={!excludedHasPrev}
                    className="flex items-center gap-1 btn btn-ghost text-sm disabled:opacity-30"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcludedPage((p) => p + 1)}
                    disabled={!excludedHasNext}
                    className="flex items-center gap-1 btn btn-ghost text-sm disabled:opacity-30"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card shimmer>
            <CardHeader title="Historical Import" />
            <CardBody className="space-y-3">
              <p className="card-subtitle">
                Upload CSV exports, map legacy categories, run dry preview, and commit import.
              </p>
              <div className="flex flex-wrap gap-2 md:flex-nowrap">
                <Link to="/settings/import">
                  <Button variant="primary">Open importer</Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card shimmer>
            <CardHeader title="Data Operations" />
            <CardBody className="space-y-4">
              <p className="card-subtitle">
                Backup, restore, or nuke user data (including importer mappings).
              </p>
              <div className="flex flex-wrap gap-2 md:flex-nowrap">
                <Button onClick={handleBackupDownload} disabled={!!opsBusy}>
                  Backup user data
                </Button>
                <Button variant="ghost" onClick={handleRestoreClick} disabled={!!opsBusy}>
                  Restore
                </Button>
                <Button variant="danger" onClick={handleNuke} disabled={!!opsBusy}>
                  Nuke user data
                </Button>
              </div>
              <input
                ref={restoreInputRef}
                className="hidden"
                type="file"
                accept=".json,application/json"
                onChange={handleRestoreFileChange}
              />
              {backupFile ? (
                <p className="text-xs text-gold-muted font-crimson">Selected restore file: {backupFile.name}</p>
              ) : null}
              {opsError ? <p className="text-sm text-danger font-crimson">{opsError}</p> : null}
              {opsSuccess ? <p className="text-sm text-success font-crimson">{opsSuccess}</p> : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
