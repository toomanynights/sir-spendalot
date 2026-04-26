import { useEffect, useMemo, useState } from 'react'
import { Upload } from 'lucide-react'
import PageContextHeader from '../components/layout/PageContextHeader'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { importerApi } from '../api/importer'
import { categoriesApi } from '../api/categories'
import { useCategories } from '../hooks/useCategories'
import { useAccounts } from '../hooks/useAccounts'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import { usePredictionTemplates } from '../hooks/usePredictions'
import { useSelectedAccount } from '../contexts/AccountContext'

function sourceKind(category) {
  const c = category || ''
  if (c.includes('Daily')) return 'daily'
  if (c.includes('Big expense')) return 'big_expense'
  if (c.includes('Big earning')) return 'big_earning'
  if (c.includes('Prediction')) return 'prediction'
  return 'other'
}

function defaultMappingFor(kind) {
  if (kind === 'daily') return { kind: 'transaction', transaction_type: 'daily' }
  if (kind === 'big_expense') return { kind: 'transaction', transaction_type: 'unplanned' }
  if (kind === 'big_earning') return { kind: 'transaction', transaction_type: 'unplanned' }
  if (kind === 'prediction') return { kind: 'prediction' }
  return { kind: 'transaction', transaction_type: 'unplanned' }
}

export default function ImporterPage() {
  const { selectedId } = useSelectedAccount()
  const { data: categories = [], refetch: refetchCategories } = useCategories()
  const { data: accounts = [] } = useAccounts()
  const { data: paymentMethods = [] } = usePaymentMethods()
  const { data: templates = [] } = usePredictionTemplates()
  const [csvFile, setCsvFile] = useState(null)
  const [parsedRows, setParsedRows] = useState([])
  const [pairs, setPairs] = useState([])
  const [mappings, setMappings] = useState({})
  const [dryRun, setDryRun] = useState(null)
  const [commitResult, setCommitResult] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const parentDaily = useMemo(
    () => categories.filter((c) => !c.parent_id && c.type === 'daily'),
    [categories],
  )
  const parentUnplanned = useMemo(
    () => categories.filter((c) => !c.parent_id && c.type === 'unplanned'),
    [categories],
  )

  useEffect(() => {
    let mounted = true
    importerApi.getMappings().then((res) => {
      if (!mounted) return
      const next = {}
      for (const m of res.mappings || []) {
        next[`${m.source_category}||${m.source_subcategory}`] = m.mapping
      }
      setMappings(next)
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  function setPairMapping(pair, patch) {
    const key = `${pair.source_category}||${pair.source_subcategory}`
    setMappings((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || defaultMappingFor(sourceKind(pair.source_category))), ...patch },
    }))
  }

  async function handleParse() {
    if (!csvFile) return
    setBusy('parse')
    setError('')
    setCommitResult(null)
    try {
      const res = await importerApi.parseCsv(csvFile)
      setParsedRows(res.rows || [])
      setPairs(res.source_pairs || [])
      setDryRun(null)
    } catch (e) {
      setError(e.message || 'Failed to parse CSV.')
    } finally {
      setBusy('')
    }
  }

  const mappingList = pairs.map((pair) => {
    const key = `${pair.source_category}||${pair.source_subcategory}`
    return {
      source_category: pair.source_category,
      source_subcategory: pair.source_subcategory,
      mapping: mappings[key] || defaultMappingFor(sourceKind(pair.source_category)),
    }
  })

  async function handleSaveMappings() {
    setBusy('save-mappings')
    setError('')
    try {
      await importerApi.saveMappings(mappingList)
    } catch (e) {
      setError(e.message || 'Failed to save mappings.')
    } finally {
      setBusy('')
    }
  }

  async function handleDryRun() {
    setBusy('dry-run')
    setError('')
    try {
      const res = await importerApi.dryRun({
        account_id: selectedId,
        rows: parsedRows,
        mappings: mappingList,
      })
      setDryRun(res)
    } catch (e) {
      setError(e.message || 'Dry run failed.')
    } finally {
      setBusy('')
    }
  }

  async function handleCommit() {
    setBusy('commit')
    setError('')
    try {
      const res = await importerApi.commit({
        account_id: selectedId,
        rows: parsedRows,
        mappings: mappingList,
      })
      setCommitResult(res)
    } catch (e) {
      setError(e.message || 'Import failed.')
    } finally {
      setBusy('')
    }
  }

  async function createParent(type, pair) {
    const name = window.prompt(`Create ${type} parent category name`)
    if (!name) return
    await categoriesApi.create({ name: name.trim(), type })
    await refetchCategories()
    setPairMapping(pair, { category_name: name.trim() })
  }

  async function createSubcategory(type, pair, parentId) {
    const name = window.prompt('Create subcategory name')
    if (!name || !parentId) return
    await categoriesApi.create({ name: name.trim(), type, parent_id: Number(parentId) })
    await refetchCategories()
    setPairMapping(pair, { subcategory: name.trim() })
  }

  const parseErrorCount = parsedRows.filter((r) => Boolean(r.parse_error)).length
  const deletedCount = parsedRows.filter((r) => r.skip_deleted).length
  const parseIssueRows = parsedRows.filter((r) => Boolean(r.parse_error))
  const pairGroups = useMemo(() => {
    const needsAttention = []
    const configured = []

    for (const pair of pairs) {
      const key = `${pair.source_category}||${pair.source_subcategory}`
      const raw = mappings[key]
      const isEmptySavedMapping = Boolean(raw) && Object.keys(raw).length === 0
      const hasSavedMapping = Boolean(raw) && !isEmptySavedMapping
      const item = { pair, hasSavedMapping }

      if (!hasSavedMapping) {
        needsAttention.push(item)
      } else {
        configured.push(item)
      }
    }

    return { needsAttention, configured }
  }, [pairs, mappings])

  return (
    <div className="page-shell">
      <PageContextHeader
        icon={Upload}
        title="Import Historical Data"
        subtitle="Upload CSV, map categories, dry-run balances, then commit."
      />
      <div className="page-container">
        <div className="flex flex-col gap-6 max-w-5xl w-full">
          <Card shimmer>
            <CardHeader title="CSV Import" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-end">
                <label>
                  <span className="input-label">CSV file</span>
                  <input
                    className="input"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  />
                </label>
                <Button onClick={handleParse} disabled={!csvFile || !!busy}>
                  Parse CSV
                </Button>
              </div>

              {parsedRows.length > 0 && (
                <div className="rounded-md border border-gold/20 bg-black/20 px-3 py-2 text-sm text-gold-muted">
                  Parsed rows: {parsedRows.length} | Deleted rows: {deletedCount} | Parse errors: {parseErrorCount}
                </div>
              )}
              {parseIssueRows.length > 0 && (
                <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2">
                  <p className="text-sm text-danger font-semibold">Parse issues ({parseIssueRows.length})</p>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                    {parseIssueRows.slice(0, 50).map((row) => (
                      <p key={`parse-issue-${row.row_index}`} className="text-xs text-danger">
                        Row {row.row_index}: {row.parse_error}
                      </p>
                    ))}
                  </div>
                  {parseIssueRows.length > 50 ? (
                    <p className="mt-2 text-xs text-gold-muted">Showing first 50 issues.</p>
                  ) : null}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={handleSaveMappings} disabled={!pairs.length || !!busy}>
                  Save mappings
                </Button>
                <Button variant="ghost" onClick={handleDryRun} disabled={!parsedRows.length || !selectedId || !!busy}>
                  Dry run
                </Button>
                <Button variant="primary" onClick={handleCommit} disabled={!parsedRows.length || !selectedId || !!busy}>
                  Commit import
                </Button>
              </div>
              {error ? <p className="text-sm text-danger font-crimson">{error}</p> : null}
              {!selectedId ? (
                <p className="text-sm text-danger font-crimson">
                  Select an account first (top account switcher) before dry run/commit.
                </p>
              ) : null}
            </CardBody>
          </Card>

          {pairs.length > 0 && (
            <Card shimmer>
              <CardHeader title="Mapping Matrix" />
              <CardBody className="space-y-3">
                {pairGroups.needsAttention.map(({ pair, hasSavedMapping }) => {
                  const kind = sourceKind(pair.source_category)
                  const mapping = mappings[`${pair.source_category}||${pair.source_subcategory}`] || defaultMappingFor(kind)
                  const isPrediction = kind === 'prediction'
                  const isDaily = kind === 'daily'
                  const categoryOptions = isDaily ? parentDaily : parentUnplanned

                  return (
                    <div key={`${pair.source_category}||${pair.source_subcategory}`} className="rounded-md border border-gold/20 p-3 space-y-2">
                      <p className="text-sm text-gold">
                        <strong>{pair.source_category}</strong> / {pair.source_subcategory || '—'}
                        <span className="ml-2 text-xs text-gold-muted">[{hasSavedMapping ? 'saved' : 'new/empty'}]</span>
                      </p>
                      {!isPrediction && (
                        <label>
                          <span className="input-label">Mapping kind</span>
                          <select
                            className="input"
                            value={mapping.kind || 'transaction'}
                            onChange={(e) => setPairMapping(pair, { kind: e.target.value })}
                          >
                            <option value="transaction">Transaction</option>
                            {!isDaily && <option value="transfer">Transfer</option>}
                            {!isDaily && <option value="correction">Correction</option>}
                          </select>
                        </label>
                      )}
                      {isPrediction && (
                        <label>
                          <span className="input-label">Prediction template</span>
                          <select
                            className="input"
                            value={mapping.template_id || ''}
                            onChange={(e) => setPairMapping(pair, { kind: 'prediction', template_id: Number(e.target.value) })}
                          >
                            <option value="">Select template</option>
                            {templates.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      {!isPrediction && mapping.kind === 'transaction' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label>
                            <span className="input-label">Transaction type</span>
                            <select
                              className="input"
                              value={mapping.transaction_type || (isDaily ? 'daily' : 'unplanned')}
                              onChange={(e) => setPairMapping(pair, { transaction_type: e.target.value })}
                            >
                              <option value={isDaily ? 'daily' : 'unplanned'}>{isDaily ? 'daily' : 'unplanned'}</option>
                            </select>
                          </label>
                          <label>
                            <span className="input-label">Parent category</span>
                            <select
                              className="input"
                              value={mapping.category_id || ''}
                              onChange={(e) => {
                                const id = Number(e.target.value)
                                const selected = categoryOptions.find((c) => c.id === id)
                                setPairMapping(pair, { category_id: id, category_name: selected?.name || '' })
                              }}
                            >
                              <option value="">Select category</option>
                              {categoryOptions.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span className="input-label">Fixed subcategory (optional)</span>
                            <input
                              className="input"
                              value={mapping.subcategory || ''}
                              onChange={(e) => setPairMapping(pair, { subcategory: e.target.value })}
                            />
                          </label>
                          <label>
                            <span className="input-label">Payment method (optional)</span>
                            <select
                              className="input"
                              value={mapping.payment_method_id || ''}
                              onChange={(e) => setPairMapping(pair, { payment_method_id: e.target.value ? Number(e.target.value) : null })}
                            >
                              <option value="">None</option>
                              {paymentMethods.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </label>
                          <div className="flex gap-2 md:col-span-2">
                            <Button variant="ghost" onClick={() => createParent(isDaily ? 'daily' : 'unplanned', pair)}>
                              Create parent category
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={!mapping.category_id}
                              onClick={() => createSubcategory(isDaily ? 'daily' : 'unplanned', pair, mapping.category_id)}
                            >
                              Create subcategory
                            </Button>
                          </div>
                        </div>
                      )}
                      {!isPrediction && mapping.kind === 'transfer' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label>
                            <span className="input-label">From account</span>
                            <select className="input" value={mapping.from_account_id || ''} onChange={(e) => setPairMapping(pair, { from_account_id: Number(e.target.value) })}>
                              <option value="">Select account</option>
                              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          </label>
                          <label>
                            <span className="input-label">To account</span>
                            <select className="input" value={mapping.to_account_id || ''} onChange={(e) => setPairMapping(pair, { to_account_id: Number(e.target.value) })}>
                              <option value="">Select account</option>
                              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          </label>
                        </div>
                      )}
                      {!isPrediction && mapping.kind === 'correction' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label>
                            <span className="input-label">Account</span>
                            <select className="input" value={mapping.account_id || selectedId || ''} onChange={(e) => setPairMapping(pair, { account_id: Number(e.target.value) })}>
                              <option value="">Selected account</option>
                              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          </label>
                          <label>
                            <span className="input-label">Direction</span>
                            <select className="input" value={mapping.direction || (kind === 'big_earning' ? 'increase' : 'decrease')} onChange={(e) => setPairMapping(pair, { direction: e.target.value })}>
                              <option value="decrease">Decrease</option>
                              <option value="increase">Increase</option>
                            </select>
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
                {pairGroups.needsAttention.length > 0 && pairGroups.configured.length > 0 && (
                  <div className="border-t border-gold/20 pt-3">
                    <p className="text-xs uppercase tracking-wide text-gold-muted">
                      Already configured mappings
                    </p>
                  </div>
                )}
                {pairGroups.configured.map(({ pair, hasSavedMapping }) => {
                  const kind = sourceKind(pair.source_category)
                  const mapping = mappings[`${pair.source_category}||${pair.source_subcategory}`] || defaultMappingFor(kind)
                  const isPrediction = kind === 'prediction'
                  const isDaily = kind === 'daily'
                  const categoryOptions = isDaily ? parentDaily : parentUnplanned

                  return (
                    <div key={`${pair.source_category}||${pair.source_subcategory}`} className="rounded-md border border-gold/20 p-3 space-y-2">
                      <p className="text-sm text-gold">
                        <strong>{pair.source_category}</strong> / {pair.source_subcategory || '—'}
                        <span className="ml-2 text-xs text-gold-muted">[{hasSavedMapping ? 'saved' : 'new/empty'}]</span>
                      </p>
                      {!isPrediction && (
                        <label>
                          <span className="input-label">Mapping kind</span>
                          <select
                            className="input"
                            value={mapping.kind || 'transaction'}
                            onChange={(e) => setPairMapping(pair, { kind: e.target.value })}
                          >
                            <option value="transaction">Transaction</option>
                            {!isDaily && <option value="transfer">Transfer</option>}
                            {!isDaily && <option value="correction">Correction</option>}
                          </select>
                        </label>
                      )}
                      {isPrediction && (
                        <label>
                          <span className="input-label">Prediction template</span>
                          <select
                            className="input"
                            value={mapping.template_id || ''}
                            onChange={(e) => setPairMapping(pair, { kind: 'prediction', template_id: Number(e.target.value) })}
                          >
                            <option value="">Select template</option>
                            {templates.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      {!isPrediction && mapping.kind === 'transaction' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label>
                            <span className="input-label">Transaction type</span>
                            <select
                              className="input"
                              value={mapping.transaction_type || (isDaily ? 'daily' : 'unplanned')}
                              onChange={(e) => setPairMapping(pair, { transaction_type: e.target.value })}
                            >
                              <option value={isDaily ? 'daily' : 'unplanned'}>{isDaily ? 'daily' : 'unplanned'}</option>
                            </select>
                          </label>
                          <label>
                            <span className="input-label">Parent category</span>
                            <select
                              className="input"
                              value={mapping.category_id || ''}
                              onChange={(e) => {
                                const id = Number(e.target.value)
                                const selected = categoryOptions.find((c) => c.id === id)
                                setPairMapping(pair, { category_id: id, category_name: selected?.name || '' })
                              }}
                            >
                              <option value="">Select category</option>
                              {categoryOptions.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span className="input-label">Fixed subcategory (optional)</span>
                            <input
                              className="input"
                              value={mapping.subcategory || ''}
                              onChange={(e) => setPairMapping(pair, { subcategory: e.target.value })}
                            />
                          </label>
                          <label>
                            <span className="input-label">Payment method (optional)</span>
                            <select
                              className="input"
                              value={mapping.payment_method_id || ''}
                              onChange={(e) => setPairMapping(pair, { payment_method_id: e.target.value ? Number(e.target.value) : null })}
                            >
                              <option value="">None</option>
                              {paymentMethods.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </label>
                          <div className="flex gap-2 md:col-span-2">
                            <Button variant="ghost" onClick={() => createParent(isDaily ? 'daily' : 'unplanned', pair)}>
                              Create parent category
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={!mapping.category_id}
                              onClick={() => createSubcategory(isDaily ? 'daily' : 'unplanned', pair, mapping.category_id)}
                            >
                              Create subcategory
                            </Button>
                          </div>
                        </div>
                      )}
                      {!isPrediction && mapping.kind === 'transfer' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label>
                            <span className="input-label">From account</span>
                            <select className="input" value={mapping.from_account_id || ''} onChange={(e) => setPairMapping(pair, { from_account_id: Number(e.target.value) })}>
                              <option value="">Select account</option>
                              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          </label>
                          <label>
                            <span className="input-label">To account</span>
                            <select className="input" value={mapping.to_account_id || ''} onChange={(e) => setPairMapping(pair, { to_account_id: Number(e.target.value) })}>
                              <option value="">Select account</option>
                              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          </label>
                        </div>
                      )}
                      {!isPrediction && mapping.kind === 'correction' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label>
                            <span className="input-label">Account</span>
                            <select className="input" value={mapping.account_id || selectedId || ''} onChange={(e) => setPairMapping(pair, { account_id: Number(e.target.value) })}>
                              <option value="">Selected account</option>
                              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                          </label>
                          <label>
                            <span className="input-label">Direction</span>
                            <select className="input" value={mapping.direction || (kind === 'big_earning' ? 'increase' : 'decrease')} onChange={(e) => setPairMapping(pair, { direction: e.target.value })}>
                              <option value="decrease">Decrease</option>
                              <option value="increase">Increase</option>
                            </select>
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          )}

          {dryRun && (
            <Card shimmer>
              <CardHeader title="Dry run projection" />
              <CardBody className="space-y-2">
                <p className="text-sm text-gold-muted">
                  Ready rows: {dryRun.ready_rows}, skipped deleted: {dryRun.skipped_deleted_rows}, parse errors: {dryRun.parse_error_rows}
                </p>
                {dryRun.unmapped_pairs?.length > 0 && (
                  <p className="text-sm text-danger">Unmapped pairs: {dryRun.unmapped_pairs.length}</p>
                )}
                {dryRun.projections?.map((p) => (
                  <div key={p.account_id} className="text-sm text-gold-muted">
                    {p.account_name}: {p.current_balance.toFixed(2)} + ({p.delta.toFixed(2)}) =&gt; {p.projected_balance.toFixed(2)}
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {commitResult && (
            <Card shimmer>
              <CardHeader title="Import results" />
              <CardBody className="space-y-2">
                <p className="text-sm text-success">Success: {commitResult.success_count}</p>
                <p className="text-sm text-danger">Failures: {commitResult.failure_count}</p>
                {commitResult.results?.slice(0, 25).map((r) => (
                  <p key={`${r.row_index}-${r.action}`} className={`text-xs ${r.ok ? 'text-gold-muted' : 'text-danger'}`}>
                    Row {r.row_index}: {r.ok ? 'OK' : 'Failed'} ({r.action}) {r.message ? `- ${r.message}` : ''}
                  </p>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
