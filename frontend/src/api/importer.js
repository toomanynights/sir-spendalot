import { getToken } from './auth'
import { api } from './client'

async function upload(path, file) {
  const form = new FormData()
  form.append('file', file)
  const token = getToken()
  const response = await fetch(`/api/importer${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const msg = data.detail || data.error || data.message || `HTTP ${response.status}`
    throw new Error(msg)
  }
  return data
}

export const importerApi = {
  parseCsv: (file) => upload('/parse-csv', file),
  getMappings: () => api.get('/importer/mappings'),
  saveMappings: (mappings) => api.put('/importer/mappings', { mappings }),
  dryRun: (payload) => api.post('/importer/dry-run', payload),
  commit: (payload) => api.post('/importer/commit', payload),
  backup: () => api.get('/importer/backup'),
  restoreJsonFile: (file) => upload('/restore-file', file),
  nuke: () => api.post('/importer/nuke'),
}
