import { requestApi } from './client';
import type {
  AdminUser,
  AdminPermission,
  LoginResult,
  Menu,
  OperationLog,
  Role,
} from '../types/auth';

// ============================================================
// 认证
// ============================================================

export const authApi = {
  login: (body: { email: string; password: string }) =>
    requestApi<LoginResult>('/auth/login', 'POST', body),

  me: () => requestApi<LoginResult['user']>('/auth/me'),

  menus: () => requestApi<Menu[]>('/auth/menus'),

  refresh: () => requestApi<{ token: string; expires_at: string; user: LoginResult['user'] }>('/auth/refresh', 'POST'),

  logout: () => requestApi<{ logged_out: boolean }>('/auth/logout', 'POST'),

  changePassword: (body: { old_password: string; password: string; password_confirmation: string }) =>
    requestApi<{ password_changed: boolean }>('/auth/change-password', 'POST', body),
};

export const systemApi = {
  session: () => requestApi<{ is_super_admin: boolean; permissions: string[]; role_slugs: string[]; token_expires_in: number }>('/session'),
  info: () => requestApi<Record<string, unknown>>('/system/info'),
};

// ============================================================
// 用户
// ============================================================

export const userApi = {
  list: (params: {
    keyword?: string;
    role_id?: number;
    status?: boolean;
    page?: number;
    per_page?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params.keyword) sp.set('keyword', params.keyword);
    if (params.role_id) sp.set('role_id', String(params.role_id));
    if (params.status !== undefined) sp.set('status', String(params.status));
    if (params.page) sp.set('page', String(params.page));
    if (params.per_page) sp.set('per_page', String(params.per_page));
    return requestApi<PageData<AdminUser>>(`/users?${sp}`);
  },

  create: (body: {
    name: string;
    email: string;
    password: string;
    role_ids: number[];
    status?: boolean;
  }) => requestApi<{ created: boolean }>('/users', 'POST', body),

  show: (id: number) => requestApi<AdminUser>(`/users/${id}`),

  update: (
    id: number,
    body: Partial<Pick<AdminUser, 'name' | 'email' | 'status' | 'role_ids' | 'permission_ids'> & { password?: string }>
  ) => requestApi<AdminUser>(`/users/${id}`, 'PATCH', body),

  delete: (id: number) => requestApi<{ deleted: boolean }>(`/users/${id}`, 'DELETE'),

  resetPassword: (id: number, body: { password: string }) =>
    requestApi<{ reset: boolean }>(`/users/${id}/reset-password`, 'POST', body),

  forceLogout: (id: number) =>
    requestApi<{ logged_out: boolean }>(`/users/${id}/force-logout`, 'POST'),
};

// ============================================================
// 角色
// ============================================================

export const roleApi = {
  list: (params?: { keyword?: string; status?: boolean; page?: number; per_page?: number }) => {
    const sp = new URLSearchParams();
    if (params?.keyword) sp.set('keyword', params.keyword);
    if (params?.status !== undefined) sp.set('status', String(params.status));
    if (params?.page) sp.set('page', String(params.page));
    if (params?.per_page) sp.set('per_page', String(params.per_page));
    return requestApi<PageData<Role>>(`/roles?${sp}`);
  },

  create: (body: { name: string; slug: string; description?: string; permission_ids?: number[] }) =>
    requestApi<{ created: boolean }>('/roles', 'POST', body),

  show: (id: number) => requestApi<Role & { permission_ids: number[] }>(`/roles/${id}`),

  update: (id: number, body: Partial<Role & { permission_ids: number[] }>) =>
    requestApi<Role>(`/roles/${id}`, 'PATCH', body),

  delete: (id: number) => requestApi<{ deleted: boolean }>(`/roles/${id}`, 'DELETE'),

  users: (id: number) => requestApi<Array<Pick<AdminUser, 'id' | 'name' | 'email' | 'status' | 'login_at'>>>(`/roles/${id}/users`),
};

// ============================================================
// 权限（按钮 / 接口级别）
// ============================================================

export const permissionApi = {
  list: (params?: { keyword?: string; module?: string; type?: number }) => {
    const sp = new URLSearchParams();
    if (params?.keyword) sp.set('keyword', params.keyword);
    if (params?.module) sp.set('module', params.module);
    if (params?.type) sp.set('type', String(params.type));
    return requestApi<{
      tree: AdminPermission[];
      flat: AdminPermission[];
      types: Record<string, string>;
      actions: string[];
    }>(`/permissions?${sp}`);
  },

  codes: (module?: string) => {
    const sp = module ? new URLSearchParams({ module }) : '';
    return requestApi<string[]>(`/permissions/codes${sp ? '?' + sp : ''}`);
  },

  mine: () => requestApi<{ is_super_admin: boolean; permissions: string[] }>('/permissions/mine'),

  batch: (body: { module: string; module_name: string; actions?: string[] }) =>
    requestApi<{ created: boolean }>('/permissions/batch', 'POST', body),

  create: (body: Omit<AdminPermission, 'id' | 'type_label'>) =>
    requestApi<AdminPermission>('/permissions', 'POST', body),

  show: (id: number) => requestApi<AdminPermission & { roles: string[]; menu_count: number }>(`/permissions/${id}`),

  update: (id: number, body: Partial<AdminPermission>) =>
    requestApi<AdminPermission>(`/permissions/${id}`, 'PATCH', body),

  delete: (id: number) => requestApi<{ deleted: boolean }>(`/permissions/${id}`, 'DELETE'),
};

// ============================================================
// 菜单
// ============================================================

export const menuApi = {
  list: (params?: { keyword?: string }) => {
    const sp = new URLSearchParams();
    if (params?.keyword) sp.set('keyword', params.keyword);
    return requestApi<Menu[]>(`/menus?${sp}`);
  },

  options: () => requestApi<Array<Pick<Menu, 'id' | 'parent_id' | 'title' | 'path' | 'sort'>>>(`/menus/options`),

  create: (body: Omit<Menu, 'id' | 'children' | 'permission_code'>) =>
    requestApi<Menu>('/menus', 'POST', body),

  show: (id: number) => requestApi<Menu>(`/menus/${id}`),

  update: (id: number, body: Partial<Menu>) =>
    requestApi<Menu>(`/menus/${id}`, 'PATCH', body),

  delete: (id: number) => requestApi<{ deleted: boolean }>(`/menus/${id}`, 'DELETE'),

  sort: (items: Array<{ id: number; parent_id?: number | null; sort: number }>) =>
    requestApi<{ sorted: boolean }>('/menus/sort', 'POST', { items }),
};

// ============================================================
// 操作日志
// ============================================================

export const logApi = {
  list: (params?: {
    start_date?: string;
    end_date?: string;
    user_id?: number;
    method?: string;
    keyword?: string;
    page?: number;
    per_page?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.start_date) sp.set('start_date', params.start_date);
    if (params?.end_date) sp.set('end_date', params.end_date);
    if (params?.user_id) sp.set('user_id', String(params.user_id));
    if (params?.method) sp.set('method', params.method);
    if (params?.keyword) sp.set('keyword', params.keyword);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.per_page) sp.set('per_page', String(params.per_page));
    return requestApi<PageData<OperationLog>>(`/operation-logs?${sp}`);
  },

  show: (id: number) => requestApi<OperationLog>(`/operation-logs/${id}`),

  delete: (id: number) => requestApi<{ deleted: boolean }>(`/operation-logs/${id}`, 'DELETE'),

  purge: (days: number) =>
    requestApi<{ purged: number }>('/operation-logs/purge', 'POST', { days }),
};

// ============================================================
// 共享类型
// ============================================================

export interface PageData<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
  links: Array<{ url: string | null; label: string; active: boolean }>;
  first_page_url: string;
  last_page_url: string;
  next_page_url: string | null;
  prev_page_url: string | null;
  path: string;
}

// 重新导出 auth.ts 中的类型供外部使用
export type {
  AdminPermission,
  AdminUser,
  LoginResult,
  LoginCredentials,
  Menu,
  OperationLog,
  Role,
} from '../types/auth';
