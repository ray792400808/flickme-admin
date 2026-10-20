import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { authApi } from '../api/auth';
import { useAuthStore } from './auth';
vi.mock('../api/auth', () => ({ authApi: { login: vi.fn(), me: vi.fn(), logout: vi.fn() } }));
beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
});
describe('authentication lifecycle', () => {
  it('requires the current-user request to succeed before authenticating', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'test',
      email: 'admin@example.com',
      expiresAt: 123,
    });
    vi.mocked(authApi.me).mockRejectedValue(new Error('unavailable'));
    const auth = useAuthStore();
    await expect(auth.login({ email: 'admin@example.com', password: 'secret' })).rejects.toThrow(
      'unavailable',
    );
    expect(auth.authenticated).toBe(false);
  });
  it('clears the authenticated user when logout succeeds', async () => {
    const user = { email: 'admin@example.com', role: 'bootstrap-admin' };
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'test',
      email: user.email,
      expiresAt: 123,
    });
    vi.mocked(authApi.me).mockResolvedValue(user);
    vi.mocked(authApi.logout).mockResolvedValue({ loggedOut: true });
    const auth = useAuthStore();
    await auth.login({ email: user.email, password: 'secret' });
    expect(auth.authenticated).toBe(true);
    await auth.logout();
    expect(auth.authenticated).toBe(false);
    expect(auth.user).toBeNull();
  });
});
