import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { pinia } from '../stores';
import { menuGroups, pathFor, permissionFor } from '../features/workspace/navigation';
const workspace = () => import('../views/workspace/WorkspaceView.vue');
const pendingModule = () => import('../views/system/ModulePendingView.vue');
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
    ...(import.meta.env.DEV
      ? [
          {
            path: '/preview',
            component: () => import('../layouts/AdminLayout.vue'),
            props: { preview: true },
            children: [
              { path: '', redirect: '/preview/overview' },
              {
                path: ':page',
                component: workspace,
                beforeEnter: (to: import('vue-router').RouteLocationNormalized) =>
                  menuGroups.some((group) => group.pages.some(([id]) => id === to.params.page)) ||
                  '/preview/overview',
              },
            ],
          },
        ]
      : []),
    {
      path: '/',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'overview', redirect: '/dashboard' },
        { path: 'logs', redirect: '/audit-logs' },
        ...menuGroups
          .flatMap((group) => group.pages)
          .filter(([id]) => !['accounts', 'roles', 'logs', 'cands'].includes(id))
          .map(([id, title]) => ({
            path: pathFor(id).slice(1),
            name: id === 'overview' ? 'dashboard' : id,
            component:
              id === 'dramas'
                ? () => import('../views/dramas/DramaListView.vue')
                : id === 'overview'
                  ? () => import('../views/dashboard/OverviewView.vue')
                  : pendingModule,
            meta: {
              title,
              permission: permissionFor(id),
              implementation:
                id === 'dramas' ? 'awaiting-api' : id === 'overview' ? 'live' : 'planned',
            },
          })),
        {
          path: 'cands',
          name: 'cands',
          component: () => import('../views/cands/CandidateListView.vue'),
          meta: { title: 'AI 角色备选库', permission: 'content', implementation: 'skeleton' },
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
  if (to.meta.requiresAuth && !auth.authenticated && !(await auth.restore()))
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
