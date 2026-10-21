export interface AdminPermission {
  id: number;
  parent_id: number | null;
  module: string;
  name: string;
  code: string;
  type: 1 | 2 | 3;
  type_label: string;
  sort: number;
  remark: string | null;
  children?: AdminPermission[];
}

export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: boolean;
  is_default: boolean;
  is_super_admin?: boolean;
  users_count: number;
  permissions_count?: number;
  created_at: string;
}

export interface Menu {
  id: number;
  parent_id: number | null;
  permission_id: number | null;
  permission_code?: string;
  title: string;
  icon: string | null;
  path: string;
  name: string | null;
  component: string | null;
  component_path?: string;
  redirect: string | null;
  sort: number;
  is_hidden: boolean;
  is_affix: boolean;
  is_keep_alive: boolean;
  meta: { title: string; isHidden: boolean };
  children?: Menu[];
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  status: boolean;
  is_super_admin: boolean;
  role_ids: number[];
  permission_ids?: number[];
  roles: Role[];
  permissions: string[];
  menus: Menu[];
  login_at: string | null;
  login_ip: string | null;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  expires_at: string;
  user: AdminUser;
}

export interface OperationLog {
  id: number;
  admin_user_id: number | null;
  username: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  ip: string | null;
  input: Record<string, unknown> | null;
  description: string | null;
  created_at: string;
  user?: Pick<AdminUser, 'id' | 'name' | 'email'> | null;
}
