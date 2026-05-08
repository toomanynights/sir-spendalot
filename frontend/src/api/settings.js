import { api } from './client'

export const settingsApi = {
  get: () =>
    api.get('/settings'),

  update: (data) =>
    api.patch('/settings', data),

  getVapidPublicKey: () =>
    api.get('/settings/vapid-public-key'),
}

export const notificationsApi = {
  subscribe: (endpoint, p256dh, auth) =>
    api.post('/notifications/subscribe', { endpoint, p256dh, auth }),

  unsubscribe: (endpoint) =>
    api.post('/notifications/unsubscribe', { endpoint }),
}
