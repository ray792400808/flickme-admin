import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { pinia } from '../stores';
import { getToken } from '../api/client';

/**
 * 静态兜底路由：登录页、404、403 等不依赖业务的入口。
 * 业务路由由后端返回的菜单树动态注册。
 */
const staticRoutes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('../views/auth/LoginView.vue'), meta: { title: '管理员登录' } },
  { path: '/403', name: 'forbidden', component: () => import('../views/errors/ForbiddenView.vue'), meta: { title: '无权限' } },
  // 注意：不放 catch-all；未匹配路由在 guard 里用 to.matched.length === 0 检测
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes: staticRoutes,
  scrollBehavior: () => ({ top: 0 }),
});

/**
 * 菜单 component 字段 → 路由组件。
 * 后端存的是 `src/views` 下的相对路径，如 `/system/users/index`，
 * 统一补成 `views/system/users/index` 后查表。
 */
const componentMap: Record<string, () => Promise<unknown>> = {
  'views/tasks/CheckinView': () => import('../views/tasks/CheckinView.vue'),
  'views/tasks/TaskConfigView': () => import('../views/tasks/TaskConfigView.vue'),
  'views/tasks/WatchRewardsView': () => import('../views/tasks/WatchRewardsView.vue'),
  'views/operations/HomeCategoriesView': () => import('../views/operations/HomeCategoriesView.vue'),
  'views/operations/HotPoolView': () => import('../views/operations/HotPoolView.vue'),
  'views/operations/LaunchPopupView': () => import('../views/operations/LaunchPopupView.vue'),
  'views/operations/SearchWordsView': () => import('../views/operations/SearchWordsView.vue'),
  'views/operations/StoryFiltersView': () => import('../views/operations/StoryFiltersView.vue'),
  'views/operations/RecommendationsView': () => import('../views/operations/RecommendationsView.vue'),
  'views/users/UserListView': () => import('../views/users/UserListView.vue'),
  'views/users/CoinAdjustmentsView': () => import('../views/users/CoinAdjustmentsView.vue'),
  'views/dashboard/index': () => import('../views/dashboard/index.vue'),
  'views/dramas/index': () => import('../views/dramas/index.vue'),
  'views/characters/index': () => import('../views/characters/index.vue'),
  'views/content/DramasView': () => import('../views/content/DramasView.vue'),
  'views/content/TagsView': () => import('../views/content/TagsView.vue'),
  'views/content/BadgesView': () => import('../views/content/BadgesView.vue'),
  'views/content/LanguagesView': () => import('../views/content/LanguagesView.vue'),
  'views/system/users/index': () => import('../views/system/users/index.vue'),
  'views/system/roles/index': () => import('../views/system/roles/index.vue'),
  'views/system/permissions/index': () => import('../views/system/permissions/index.vue'),
  'views/system/menus/index': () => import('../views/system/menus/index.vue'),
  'views/system/logs/index': () => import('../views/system/logs/index.vue'),
};

function normalizeComponent(c?: string | null): string | undefined {
  if (!c) return undefined;
  const clean = c.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.vue$/i, '');
  return clean.startsWith('views/') ? clean : `views/${clean}`;
}

let dynamicAdded = false;

/**
 * 递归遍历菜单树，把每个叶子页面（带 component 的节点）注册成一条平铺路由。
 *
 * Vue Router 4 的嵌套路径是逐层拼接的：父路由 path 为 '/'，子路由 path 写
 * 'system/users' 就能匹配到 '/system/users'，因此这里无需为目录节点单独建父级路由。
 */
export function buildRoutesFromMenus(refresh = false): void {
  const auth = useAuthStore(pinia);

  if (refresh && dynamicAdded) {
    for (const name of Object.keys(router.getRoutes())) {
      if (name.startsWith('menu:')) router.removeRoute(name);
    }
  }

  const children: RouteRecordRaw[] = [];

  const walk = (nodes: typeof auth.menus) => {
    for (const node of nodes) {
      // 有 component 的才是页面；目录节点（component 为空）不生成路由，只往下走
      if (node.component) {
        const key = normalizeComponent(node.component);
        const loader = key ? componentMap[key] : undefined;
        // 菜单里配了 component 但前端没有对应 vue 文件时跳过，避免整页路由失配
        if (loader) {
          children.push({
            path: node.path.replace(/^\/+/, ''), // "system/users"
            name: `menu:${node.path}`,
            component: loader as RouteRecordRaw['component'],
            meta: {
              title: node.meta.title,
              permissionCode: node.permission_code ?? undefined,
            },
          } as RouteRecordRaw);
        }
      }

      if (node.children?.length) walk(node.children);
    }
  };

  walk(auth.menus);

  /**
   * 首页兜底：路由表里必须有一条 path 为空的子路由，否则访问 '/' 时父路由虽然能匹配，
   * 却没有子路由可以渲染，<router-view> 会是空的 —— 这正是登录后整页空白的原因。
   * 优先跳 dashboard，没有就跳第一个可用页面。
   */
  const hasIndex = children.some((c) => c.path === '');
  if (!hasIndex) {
    const target =
      children.find((c) => c.path === 'dashboard')?.path ?? children[0]?.path ?? 'login';
    children.unshift({
      path: '',
      redirect: target ? `/${target}` : '/login',
    } as RouteRecordRaw);
  }

  router.addRoute({
    path: '/',
    name: 'layout',
    component: () => import('../layouts/AdminLayout.vue'),
    children,
  });

  dynamicAdded = true;
}

/** 用 localStorage 里的 token 恢复会话（刷新页面后 user 会丢失） */
async function restoreSession(): Promise<boolean> {
  if (!getToken()) return false;
  try {
    await useAuthStore(pinia).refresh();
    return true;
  } catch {
    return false;
  }
}

router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia);

  // 动态路由首次构建：菜单数据来自登录态，这里可能需要异步拉取。
  if (!dynamicAdded) {
    if (auth.authenticated) {
      buildRoutesFromMenus();
    } else if (getToken()) {
      const restored = await restoreSession();
      if (restored) buildRoutesFromMenus();
      else return to.name === 'login' ? true : { name: 'login', query: { redirect: to.fullPath } };
    } else {
      return to.name === 'login' ? true : { name: 'login', query: { redirect: to.fullPath } };
    }

    /**
     * 关键：addRoute 是异步生效的，但本次导航的 to 已经解析完毕，
     * 其 matched 仍是构建前的结果（空数组）。必须显式重定向回原地址，
     * 让守卫用新的路由表重新解析，否则 <router-view> 渲染 <!----> 整页空白。
     */
    return { ...to, replace: true };
  }

  // 路由表已就绪：白名单路由直接放行
  if (to.name === 'login') {
    return auth.authenticated ? { path: '/' } : true;
  }
  if (to.name === 'forbidden') return true;

  /**
   * 未匹配到任何路由：登录态正常却找不到页面时，回到首页而不是停在空白页。
   * 权限不足同样交给权限判断，避免把 403 当成 404。
   */
  if (to.matched.length === 0) {
    if (!auth.authenticated) return { name: 'login', query: { redirect: to.fullPath } };
    return { path: '/' };
  }

  // 权限检查：页面级权限码取自菜单 meta
  const need = to.meta.permissionCode as string | undefined;
  if (need && !auth.can(need)) {
    return '/403';
  }

  return true;
});

router.afterEach((to) => {
  document.title = `${String(to.meta.title ?? '运营后台')} · Flickme`;
});

export default router;
