import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { pinia } from '../stores';
export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { title: '管理员登录' },
    },
    {
      path: '/activate',
      component: () => import('../views/auth/ActivateView.vue'),
      meta: { title: '激活账号' },
    },
    {
      path: '/forbidden',
      component: () => import('../views/errors/ForbiddenView.vue'),
      meta: { requiresAuth: true, title: '无访问权限' },
    },
    {
      path: '/',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('../views/dashboard/OverviewView.vue'),
          meta: { title: '数据概览', permission: 'overview' },
        },
        {
          path: 'dramas',
          name: 'dramas',
          component: () => import('../views/dramas/DramaListView.vue'),
          meta: { title: 'Short 剧库', permission: 'content' },
        },
        {
          path: 'characters',
          name: 'characters',
          component: () => import('../views/characters/CharacterListView.vue'),
          meta: { title: 'Stories 角色库', permission: 'content' },
        },
        {
          path: 'accounts',
          component: () => import('../views/system/AccountsView.vue'),
          meta: { title: '账号管理', permission: 'system' },
        },
        {
          path: 'roles',
          component: () => import('../views/system/RolesView.vue'),
          meta: { title: '角色与权限', permission: 'system' },
        },
        {
          path: 'audit-logs',
          component: () => import('../views/system/AuditLogsView.vue'),
          meta: { title: '操作日志', permission: 'system' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../views/errors/NotFoundView.vue'),
      meta: { title: '页面不存在' },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia);
  if (to.meta.requiresAuth && !auth.authenticated)
    return { name: 'login', query: { redirect: to.fullPath } };
  if (to.name === 'login' && auth.authenticated) return { name: 'dashboard' };
  if (to.meta.requiresAuth && auth.authenticated) {
    try {
      await auth.refresh();
    } catch {
      auth.clear();
      return { name: 'login' };
    }
  }
  if (typeof to.meta.permission === 'string' && !auth.can(to.meta.permission)) return '/forbidden';
});
router.afterEach((to) => {
  document.title = `${String(to.meta.title || '运营后台')} · Flickme`;
});
