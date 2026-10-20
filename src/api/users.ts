import { requestApi } from './client';
import type { AppUser, CoinAdjustment, CoinAdjustmentInput, PageResult } from '../types/users';
export const usersEnabled = import.meta.env.VITE_USERS_API_ENABLED === 'true';
export const coinsEnabled = import.meta.env.VITE_COIN_API_ENABLED === 'true';
export const usersApi = {
  list: (params: URLSearchParams) => requestApi<PageResult<AppUser>>(`/users?${params}`),
  detail: (id: string) => requestApi<AppUser>(`/users/${encodeURIComponent(id)}`),
  status: (user: AppUser, status: AppUser['status'], reason: string) =>
    requestApi<AppUser>(`/users/${encodeURIComponent(user.id)}/status`, 'PATCH', {
      status,
      reason,
      version: user.version,
    }),
};
export const coinAdjustmentsApi = {
  list: (params: URLSearchParams) =>
    requestApi<PageResult<CoinAdjustment>>(`/coin-adjustments?${params}`),
  create: (input: CoinAdjustmentInput, key: string, submit = true) =>
    requestApi<CoinAdjustment>(
      '/coin-adjustments',
      'POST',
      { ...input, submit },
      { 'Idempotency-Key': key },
    ),
  update: (row: CoinAdjustment, input: CoinAdjustmentInput, key: string, submit: boolean) =>
    requestApi<CoinAdjustment>(
      '/coin-adjustments/' + encodeURIComponent(row.id),
      'PATCH',
      { ...input, version: row.version, submit },
      { 'Idempotency-Key': key },
    ),
  review: (
    adjustment: CoinAdjustment,
    decision: 'approve' | 'reject',
    reason: string,
    key: string,
  ) =>
    requestApi<CoinAdjustment>(
      `/coin-adjustments/${encodeURIComponent(adjustment.id)}/review`,
      'POST',
      { decision, reason, version: adjustment.version },
      { 'Idempotency-Key': key },
    ),
};
