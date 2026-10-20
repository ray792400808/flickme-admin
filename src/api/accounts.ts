import { requestApi } from './client';
export interface Account {
  id: number;
  name: string;
  email: string;
  role_key: string;
  status: 'active' | 'pending' | 'disabled';
  note: string | null;
  last_login_at: string | null;
  created_at: string;
}
export interface Role {
  id: number;
  key: string;
  name: string;
  permissions: Record<string, 'r' | 'rw' | 'none'>;
}
export interface RoleData {
  groups: Record<string, string>;
  roles: Role[];
}
export interface Page<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}
export interface AuditLog {
  id: number;
  actor: string;
  action: string;
  subject: string;
  created_at: string;
}
export interface AccountInput {
  name: string;
  email?: string;
  role_key: string;
  status?: string;
  note: string;
}
export const accountsApi = {
  list: (params: URLSearchParams) => requestApi<Page<Account>>(`/accounts?${params}`),
  create: (body: AccountInput) =>
    requestApi<{ account: Account; activationToken: string; expiresAt: string }>(
      '/accounts',
      'POST',
      body,
    ),
  update: (id: number, body: AccountInput) => requestApi<Account>(`/accounts/${id}`, 'PATCH', body),
  remove: (id: number) => requestApi(`/accounts/${id}`, 'DELETE'),
  reset: (id: number) =>
    requestApi<{ activationToken: string; expiresAt: string }>(
      `/accounts/${id}/reset-password`,
      'POST',
    ),
  roles: () => requestApi<RoleData>('/roles'),
  updateRole: (role: Role) =>
    requestApi<Role>(`/roles/${role.id}`, 'PATCH', { permissions: role.permissions }),
  logs: (page: number) => requestApi<Page<AuditLog>>(`/audit-logs?page=${page}`),
  activate: (body: { token: string; password: string; password_confirmation: string }) =>
    requestApi('/auth/activate', 'POST', body),
};
