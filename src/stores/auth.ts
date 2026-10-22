import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { authApi, systemApi } from '../api/admin';
import { setAccessToken } from '../api/client';
import type { AdminUser, Menu } from '../types/auth';

// token 初始值由 client.ts 负责（从 sessionStorage 读）
export const useAuthStore = defineStore('auth', () => {
  // ─── 状态 ───────────────────────────────────────────────
  const user = ref<AdminUser | null>(null);
  const token = ref<string | null>(null);
  const permissions = ref<string[]>([]);
  const menus = ref<Menu[]>([]);
  const tokenExpiresAt = ref<number | null>(null);

  // ─── 计算属性 ────────────────────────────────────────────
  /** 登录状态由 user 对象决定，token 持久化由 client.ts 管理 */
  const authenticated = computed(() => user.value !== null);

  const isSuperAdmin = computed(() => user.value?.is_super_admin === true);

  /** 路由级权限检查：用户能否进入某个页面 */
  const canView = (path: string): boolean => {
    if (isSuperAdmin.value) return true;
    const flat = flattenMenus(menus.value);
    return flat.some((m) => m.path === path && !m.is_hidden);
  };

  /**
   * 按钮级权限检查：v-perm="'user.create'"
   *
   * 用法：
   *   can('user.create')             精确匹配
   *   can('permission.edit', 'permission.delete')  多个权限任一命中即可
   *   can('content', true)           模块级匹配：拥有 `content.*` 中任意一个权限即可
   */
  const can = (...args: Array<string | boolean>): boolean => {
    if (isSuperAdmin.value) return true;

    const allowModuleScope = args.length > 0 && args[args.length - 1] === true;
    const codes = args.filter((arg): arg is string => typeof arg === 'string');

    return codes.some((code) => {
      if (permissions.value.includes(code)) return true;

      const [module] = code.split('.');
      if (permissions.value.includes(`${module}.*`)) return true;

      if (allowModuleScope) {
        return permissions.value.some((permission) => permission.startsWith(`${code}.`));
      }

      return false;
    });
  };

  /** v-perm 指令语法糖 */
  const hasPerm = (code: string): boolean => can(code);

  // ─── 动作 ───────────────────────────────────────────────
  /** 登录：接受 (email, password) 或 ({email, password}) */
  async function login(
    emailOrCreds: string | { email: string; password: string },
    passwordArg?: string,
  ): Promise<void> {
    const credentials =
      typeof emailOrCreds === 'string'
        ? { email: emailOrCreds, password: passwordArg ?? '' }
        : emailOrCreds;

    clear();
    const result = await authApi.login(credentials);
    token.value = result.token;
    setAccessToken(result.token);
    applyProfile(result.user);
  }

  /** 从 /auth/me 或 /auth/refresh 同步状态 */
  function applyProfile(u: AdminUser): void {
    user.value = u;
    permissions.value = u.permissions ?? [];
    menus.value = u.menus ?? [];
  }

  async function refresh(): Promise<void> {
    const u = await authApi.me();
    applyProfile(u);
  }

  async function fetchSession(): Promise<void> {
    const data = await systemApi.session();
    tokenExpiresAt.value = Date.now() + data.token_expires_in * 1000;
  }

  function clear(): void {
    user.value = null;
    token.value = null;
    permissions.value = [];
    menus.value = [];
    tokenExpiresAt.value = null;
    setAccessToken(null);
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch { /* ignore */ } finally {
      clear();
    }
  }

  return {
    // 状态
    user,
    token,
    permissions,
    menus,
    tokenExpiresAt,

    // 计算
    authenticated,
    isSuperAdmin,
    can,
    canView,
    hasPerm,

    // 动作
    login,
    refresh,
    fetchSession,
    clear,
    logout,
    applyProfile,
  };
});

// ─── 辅助函数 ──────────────────────────────────────────────
export function flattenMenus(list: Menu[]): Menu[] {
  const result: Menu[] = [];
  const walk = (nodes: Menu[]) => {
    for (const node of nodes) {
      result.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(list);

  return result;
}
