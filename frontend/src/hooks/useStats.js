import { useQuery } from '@tanstack/react-query'
import { statsApi } from '../api/stats'

export const STATS_TODAY_KEY = ['stats', 'today']

/**
 * @param {number | null | undefined} accountId
 *   Pass the selected account id to scope stats to that account.
 *   Omit (or pass null/undefined) to use the server's primary-account default.
 */
export function useTodayStats(accountId) {
  return useQuery({
    queryKey: [...STATS_TODAY_KEY, accountId ?? null],
    queryFn: () => statsApi.today(accountId ? { account_id: accountId } : undefined),
    staleTime: 30_000,
    refetchInterval: 5 * 60_000,
  })
}

export function useSpendingByCategory(params) {
  return useQuery({
    queryKey: ['stats', 'spending-by-category', params],
    queryFn: () => statsApi.spendingByCategory(params),
    enabled: Boolean(params?.date_from && params?.date_to),
  })
}

export function useSpendingBySubcategory(params) {
  return useQuery({
    queryKey: ['stats', 'spending-by-subcategory', params],
    queryFn: () => statsApi.spendingBySubcategory(params),
    enabled: Boolean(params?.category_name && params?.date_from && params?.date_to),
  })
}

export function useSpendingByType(params) {
  return useQuery({
    queryKey: ['stats', 'spending-by-type', params],
    queryFn: () => statsApi.spendingByType(params),
    enabled: Boolean(params?.date_from && params?.date_to),
  })
}

export function useDailyTrend(days = 30, offset = 0, accountId) {
  return useQuery({
    queryKey: ['stats', 'daily-trend', days, offset, accountId ?? null],
    queryFn: () => statsApi.dailyTrend({
      days,
      offset,
      ...(accountId ? { account_id: accountId } : {}),
    }),
    staleTime: 60_000,
  })
}

export function useMonthlyComparison(months = 6, accountId) {
  return useQuery({
    queryKey: ['stats', 'monthly-comparison', months, accountId ?? null],
    queryFn: () => statsApi.monthlyComparison({
      months,
      ...(accountId ? { account_id: accountId } : {}),
    }),
    staleTime: 60_000,
  })
}

export function useAnalyticsInsights(params) {
  return useQuery({
    queryKey: ['stats', 'insights', params],
    queryFn: () => statsApi.insights(params),
    enabled: Boolean(params?.date_from && params?.date_to),
    staleTime: 60_000,
  })
}

export function useBalanceHistory(days = 30, offset = 0, accountId) {
  return useQuery({
    queryKey: ['stats', 'balance-history', days, offset, accountId ?? null],
    queryFn: () => statsApi.balanceHistory({
      days,
      offset,
      ...(accountId ? { account_id: accountId } : {}),
    }),
    staleTime: 60_000,
  })
}
