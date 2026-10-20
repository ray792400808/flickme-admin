import { requestApi } from './client';
import type { AdminUser, LoginCredentials, LoginResult } from '../types/auth';
export const authApi = {
  login: (credentials: LoginCredentials) =>
    requestApi<LoginResult>('/auth/login', 'POST', credentials),
  me: () => requestApi<AdminUser>('/auth/me'),
  logout: () => requestApi<{ loggedOut: boolean }>('/auth/logout', 'POST'),
};
