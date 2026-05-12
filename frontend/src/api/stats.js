import { api } from './client'

export const statsApi = {
  /**
   * Today's actual balance, predicted balance, and spending breakdown.
   * @param {{ account_id?: number }} [params]
   */
  today: (params) =>
    api.get('/stats/today', { today: new Date().toLocaleDateString('sv'), ...params }),

  /** @param {{ date_from: string, date_to: string }} params */
  spendingByCategory: (params) =>
    api.get('/stats/spending-by-category', params),

  /** @param {{ category_name: string, date_from: string, date_to: string, account_id?: number }} params */
  spendingBySubcategory: (params) =>
    api.get('/stats/spending-by-subcategory', params),

  /** @param {{ date_from: string, date_to: string, account_id?: number }} params */
  spendingByType: (params) =>
    api.get('/stats/spending-by-type', params),

  /** @param {{ days?: number, account_id?: number }} [params] */
  dailyTrend: (params) =>
    api.get('/stats/daily-trend', params),

  /** @param {{ months?: number, account_id?: number }} [params] */
  monthlyComparison: (params) =>
    api.get('/stats/monthly-comparison', params),

  /** @param {{ date_from: string, date_to: string, account_id?: number }} params */
  insights: (params) =>
    api.get('/stats/insights', params),

  /** @param {{ days?: number, offset?: number, account_id?: number }} [params] */
  balanceHistory: (params) =>
    api.get('/stats/balance-history', params),
}
