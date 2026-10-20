import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { authApi } from '../api/auth';
import { setAccessToken } from '../api/client';
import type { AdminUser, LoginCredentials } from '../types/auth';
import { useContentStore } from './content';
export const useAuthStore = defineStore('auth', () => {
  const user = ref<AdminUser | null>(null);
  const authenticated = computed(() => user.value !== null);
  function can(group: string, write = false) {
    const value = user.value?.permissions?.[group];
    return value === 'rw' || (!write && value === 'r');
  }
  async function refresh() {
    user.value = await authApi.me();
  }
  function clear() {
    user.value = null;
    setAccessToken(null);
    useContentStore().reset();
  }
  async function login(credentials: LoginCredentials) {
    clear();
    try {
      const result = await authApi.login(credentials);
      setAccessToken(result.accessToken);
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
  return { user, authenticated, login, logout, clear, can, refresh };
});
