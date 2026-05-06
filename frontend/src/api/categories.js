import { api } from './client'

export const categoriesApi = {
  /** @returns {Promise<Record<string, string[]>>} parent category id → distinct subcategories */
  subcategoryUsage: () =>
    api.get('/categories/subcategory-usage'),

  list: () =>
    api.get('/categories'),

  get: (id) =>
    api.get(`/categories/${id}`),

  create: (data) =>
    api.post('/categories', data),

  update: (id, data) =>
    api.patch(`/categories/${id}`, data),

  rename: (id, name) =>
    api.post(`/categories/${id}/rename`, { name }),

  reassignTransactions: (id, targetSubcategoryId) =>
    api.post(`/categories/${id}/reassign-transactions`, { target_subcategory_id: targetSubcategoryId ?? null }),

  reassignParentTransactions: (id, targetCategoryId) =>
    api.post(`/categories/${id}/reassign-parent-transactions`, { target_category_id: targetCategoryId ?? null }),

  delete: (id) =>
    api.delete(`/categories/${id}`),
}
