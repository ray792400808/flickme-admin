<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getHealth } from '../api/system';
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const development = import.meta.env.DEV;
const links = computed(() =>
  [
    { to: '/dashboard', label: '数据概览', group: 'overview' },
    { to: '/dramas', label: 'Short 剧库', group: 'content' },
    { to: '/characters', label: 'Stories 角色库', group: 'content' },
    { to: '/accounts', label: '账号管理', group: 'system' },
    { to: '/roles', label: '角色与权限', group: 'system' },
    { to: '/audit-logs', label: '操作日志', group: 'system' },
  ].filter((link) => auth.can(link.group)),
);
const status = ref('正在连接');
const loading = ref(false);
const error = ref('');
const loggingOut = ref(false);
async function checkHealth() {
  loading.value = true;
  try {
    status.value = (await getHealth()).status === 'ok' ? 'API 已连接' : 'API 状态异常';
  } catch (cause) {
    status.value = cause instanceof Error ? cause.message : 'API 无法连接';
  } finally {
    loading.value = false;
  }
}
async function logout() {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await auth.logout();
    await router.replace('/login');
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '退出失败';
  } finally {
    loggingOut.value = false;
  }
}
onMounted(checkHealth);
</script>
<template>
  <div class="layout">
    <aside>
      <h1>Flickme<span>运营控制台</span></h1>
      <nav aria-label="主导航">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" active-class="active">{{
          link.label
        }}</RouterLink>
      </nav>
      <small>{{ auth.user?.name }} · {{ auth.user?.roleName }}<br />{{ auth.user?.email }}</small>
      <p>
        <button :disabled="loggingOut" @click="logout">
          {{ loggingOut ? '退出中…' : '退出登录' }}
        </button>
      </p>
    </aside>
    <main>
      <header>
        <div>
          <p>FLICKME / ADMIN</p>
          <h2>{{ route.meta.title }}</h2>
        </div>
        <span class="badge">{{ development ? '开发环境' : '正式环境' }}</span>
      </header>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="demo-banner">
        内容页面为示例数据；账号、权限与日志使用真实接口。<button
          :disabled="loading"
          @click="checkHealth"
        >
          {{ status }}
        </button>
      </div>
      <RouterView />
    </main>
  </div>
</template>
