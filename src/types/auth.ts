export interface AdminUser {
  id?: number;
  name?: string;
  roleName?: string;
  permissions?: Record<string, 'r' | 'rw'>;
  email: string;
  role: string;
}
export interface LoginCredentials {
  email: string;
  password: string;
}
export interface LoginResult {
  accessToken: string;
  expiresAt: number;
  email: string;
}
