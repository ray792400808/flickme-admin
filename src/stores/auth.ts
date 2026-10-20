import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { authApi } from '../api/auth';
import { setAccessToken } from '../api/client';
import type { AdminUser, LoginCredentials } from '../types/auth';
import { useContentStore } from './content';

const SESSION_KEY = 'flickme-admin-session';

interface StoredSession {
  accessToken: string;
  expiresAt: number;
}

function readSession(): StoredSession | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as StoredSession | null;
    if (!session?.accessToken) return null;
    const expiresAt = session.expiresAt < 1_000_000_000_000 ? session.expiresAt * 1000 : session.expiresAt;
    if (expiresAt <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const storedSession = readSession();
  const user = ref<AdminUser | null>(null);
  const hasSession = ref(storedSession !== null);
  setAccessToken(storedSession?.accessToken ?? null);
  const authenticated = computed(() => user.value !== null);
  function can(group: string, write = false) {
    const value = user.value?.permissions?.[group];
    return value === 'rw' || (!write && value === 'r');
  }
  async function refresh() {
    user.value = await authApi.me();
  }
  async function restore() {
    if (authenticated.value) return true;
    if (!hasSession.value) return false;
    try {
      await refresh();
      return true;
    } catch {
      clear();
      return false;
    }
  }
  function clear() {
    user.value = null;
    hasSession.value = false;
    setAccessToken(null);
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_KEY);
    useContentStore().reset();
  }
  async function login(credentials: LoginCredentials) {
    clear();
    try {
      const result = await authApi.login(credentials);
      setAccessToken(result.accessToken);
      hasSession.value = true;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ accessToken: result.accessToken, expiresAt: result.expiresAt }),
        );
      }
      user.value = await authApi.me();
    } catch (error) {
      clear();
      throw error;
    }
  }
  async function logout() {
    await authApi.logout();
    clear();
  }
  return { user, authenticated, login, logout, clear, can, refresh, restore };
});
