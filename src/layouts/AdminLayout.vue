<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getHealth } from '../api/system';
import {
  icons,
  menuGroups,
  pageForPath,
  pathFor,
  permissionFor,
} from '../features/workspace/navigation';
const props = withDefaults(defineProps<{ preview?: boolean }>(), { preview: false });
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const mobileOpen = ref(false);
const openGroups = ref<Record<string, boolean>>({ content: true });
const query = ref('');
const searchFocused = ref(false);
const error = ref('');
const loggingOut = ref(false);
const health = ref('检查 API');
const checking = ref(false);
const theme = ref(
  localStorage.getItem('flickme-theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
);
provide(
  'workspacePreview',
  computed(() => props.preview),
);
provide('workspaceTheme', theme);
watch(
  theme,
  (value) => {
    document.documentElement.dataset.theme = value;
    localStorage.setItem('flickme-theme', value);
  },
  { immediate: true },
);
const current = computed(() =>
  props.preview ? String(route.params.page || 'overview') : pageForPath(route.path),
);
const groups = computed(() =>
  menuGroups
    .map((group) => ({
      ...group,
      pages: group.pages.filter(([id]) => props.preview || auth.can(permissionFor(id) || group.id)),
    }))
    .filter((group) => group.pages.length),
);
const activeGroup = computed(() =>
  menuGroups.find((group) => group.pages.some(([id]) => id === current.value)),
);
const title = computed(
  () => activeGroup.value?.pages.find(([id]) => id === current.value)?.[1] || route.meta.title,
);
const results = computed(() =>
  query.value.trim()
    ? groups.value
        .flatMap((group) => group.pages.map(([id, label]) => ({ id, label, group: group.title })))
        .filter((item) =>
          (item.label + item.group).toLowerCase().includes(query.value.trim().toLowerCase()),
        )
        .slice(0, 8)
    : [],
);
const isLive = computed(
  () => !props.preview && ['overview', 'accounts', 'roles', 'logs'].includes(current.value),
);
const notice = computed(() =>
  props.preview
    ? '开发原型参考：使用独立示例数据，所有业务操作均为本地模拟。'
    : isLive.value
      ? '正式工作区：数据以服务端实际返回为准。'
      : '开发中：此模块尚未接入业务接口，写操作暂不可用。',
);
function link(id: string) {
  return props.preview ? '/preview/' + id : pathFor(id);
}
function expanded(id: string) {
  return openGroups.value[id] ?? activeGroup.value?.id === id;
}
watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false;
    query.value = '';
    searchFocused.value = false;
  },
);
async function checkHealth() {
  if (checking.value) return;
  checking.value = true;
  try {
    health.value = (await getHealth()).status === 'ok' ? 'API 已连接' : 'API 状态异常';
  } catch {
    health.value = 'API 未连接';
  } finally {
    checking.value = false;
  }
}
async function logout() {
  loggingOut.value = true;
  error.value = '';
  try {
    await auth.logout();
    await router.replace('/login');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '退出失败';
  } finally {
    loggingOut.value = false;
  }
}
onMounted(() => {
  if (!props.preview) void checkHealth();
});
</script>

<template>
  <div
    class="admin-shell"
    @keydown.esc="
      mobileOpen = false;
      searchFocused = false;
    "
  >
    <button
      v-if="mobileOpen"
      class="nav-backdrop"
      aria-label="关闭菜单"
      @click="mobileOpen = false"
    />
    <aside class="admin-side" :class="{ 'is-open': mobileOpen }" aria-label="侧边导航">
      <RouterLink :to="link('overview')" class="admin-brand"
        ><i
          ><svg viewBox="0 0 24 24"><path d="M8 5l12 7-12 7z" /></svg
        ></i>
        <div>Flickme<small>运营后台</small></div></RouterLink
      >
      <nav class="admin-nav" aria-label="主导航">
        <div v-for="group in groups" :key="group.id" class="nav-group">
          <RouterLink
            v-if="group.id === 'overview'"
            :to="link('overview')"
            class="group-button"
            :class="{ current: current === 'overview' }"
            ><svg viewBox="0 0 24 24"><path :d="icons[group.icon]" /></svg
            >{{ group.title }}</RouterLink
          >
          <template v-else>
            <button
              class="group-button"
              :class="{ current: activeGroup?.id === group.id }"
              :aria-expanded="expanded(group.id)"
              @click="openGroups[group.id] = !expanded(group.id)"
            >
              <svg viewBox="0 0 24 24"><path :d="icons[group.icon]" /></svg>{{ group.title
              }}<svg class="chevron" :class="{ expanded: expanded(group.id) }" viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            <div v-show="expanded(group.id)" class="sub-menu">
              <RouterLink
                v-for="[id, label] in group.pages"
                :key="id"
                :to="link(id)"
                :class="{ selected: current === id }"
                >{{ label }}</RouterLink
              >
            </div>
          </template>
        </div>
      </nav>
      <div class="admin-session">
        <small
          >{{ preview ? '界面预览 · 本地示例数据' : auth.user?.name || auth.user?.email }}<br />{{
            preview ? '无需登录，可体验所有页面' : auth.user?.roleName
          }}</small
        ><RouterLink v-if="preview" to="/login">前往登录 →</RouterLink
        ><button v-else :disabled="loggingOut" @click="logout">
          {{ loggingOut ? '退出中…' : '退出登录' }}
        </button>
      </div>
    </aside>
    <div class="admin-main">
      <header class="admin-top">
        <button class="icon-button mobile-menu" aria-label="打开菜单" @click="mobileOpen = true">
          ☰
        </button>
        <div class="admin-crumb">
          {{ activeGroup?.title }} <span>›</span> <b>{{ title }}</b>
        </div>
        <div class="feature-search" @focusout="searchFocused = false">
          <svg viewBox="0 0 24 24">
            <circle cx="10" cy="10" r="6" />
            <path d="m15 15 5 5" /></svg
          ><input
            v-model="query"
            aria-label="搜索功能"
            placeholder="搜索功能，如 优惠券、Chips"
            @focus="searchFocused = true"
            @keydown.enter="results[0] && router.push(link(results[0].id))"
          />
          <div v-if="query && searchFocused" class="feature-results">
            <RouterLink
              v-for="item in results"
              :key="item.id"
              :to="link(item.id)"
              @mousedown.prevent
              >{{ item.label }}<small>{{ item.group }}</small></RouterLink
            >
            <div v-if="!results.length">没有匹配的功能</div>
          </div>
        </div>
        <span class="environment-label">{{
          preview ? '本地预览' : auth.user?.roleName || '管理后台'
        }}</span>
        <button
          class="icon-button"
          :aria-label="theme === 'dark' ? '切换浅色主题' : '切换深色主题'"
          @click="theme = theme === 'dark' ? 'light' : 'dark'"
        >
          <svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" /></svg>
        </button>
        <span class="admin-avatar" :title="auth.user?.email">{{
          preview ? '预' : (auth.user?.name || auth.user?.email || '管').slice(0, 1)
        }}</span>
      </header>
      <main class="admin-content">
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <div class="workspace-notice" :class="{ live: isLive }">
          <span>{{ notice }}</span
          ><button v-if="!preview" :disabled="checking" @click="checkHealth">
            {{ checking ? '检查中…' : health }}
          </button>
        </div>
        <RouterView v-slot="{ Component }">
          <component :is="Component" :key="preview ? 'preview' : 'live'" />
        </RouterView>
      </main>
    </div>
  </div>
</template>
