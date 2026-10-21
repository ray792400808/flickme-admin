<template>
  <div class="login-shell">
    <div class="login-card card">
      <div class="brand-row">
        <div class="brand-icon">F</div>
        <div>
          <div class="brand-name">Flickme</div>
          <div class="brand-sub">运营控制台</div>
        </div>
      </div>

      <form class="form" @submit.prevent="handleLogin">
        <div class="fld">
          <label for="email">邮箱</label>
          <input
            id="email"
            v-model="form.email"
            class="in"
            type="email"
            placeholder="admin@flickme.com"
            autocomplete="username"
            required
          />
        </div>

        <div class="fld">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            class="in"
            type="password"
            placeholder="输入密码"
            autocomplete="current-password"
            required
          />
        </div>

        <div v-if="errorMsg" class="banner bad">{{ errorMsg }}</div>

        <button type="submit" class="btn pri submit-btn" :disabled="loading">
          {{ loading ? '登录中…' : '登 录' }}
        </button>
      </form>

      <div class="hint-row">
        <span>测试账号：admin@flickme.com / admin123</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { authApi } from '../../api/admin';
import { useAuthStore } from '../../stores/auth';
import { pinia } from '../../stores';

const router = useRouter();
// 必须传入应用同一个 pinia 实例，否则登录态写入的是另一个 store 实例，
// 路由守卫读到的仍是未登录状态，会把用户弹回登录页。
const auth = useAuthStore(pinia);

const loading = ref(false);
const errorMsg = ref('');

const form = reactive({
  email: 'admin@flickme.com',
  password: 'admin123',
});

const REDIRECT_KEY = 'flickme_login_redirect';

function saveRedirect(url: string | null) {
  if (url) sessionStorage.setItem(REDIRECT_KEY, url);
  else sessionStorage.removeItem(REDIRECT_KEY);
}

function getAndClearRedirect(): string {
  const url = sessionStorage.getItem(REDIRECT_KEY) ?? '/';
  sessionStorage.removeItem(REDIRECT_KEY);
  return url;
}

/**
 * 取登录后要跳转的地址。
 * 路由用的是 hash history（#/login?redirect=/system/users），
 * 查询参数挂在 hash 之后，window.location.search 拿不到，必须从 hash 里解析。
 */
function resolveRedirect(): string {
  const hash = window.location.hash;              // "#/login?redirect=/system/users"
  const queryIdx = hash.indexOf('?');
  if (queryIdx !== -1) {
    const redirect = new URLSearchParams(hash.slice(queryIdx + 1)).get('redirect');
    // 只接受站内路径，避免被构造成外部地址造成开放重定向
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      return redirect;
    }
  }
  return getAndClearRedirect();
}

async function handleLogin() {
  errorMsg.value = '';
  loading.value = true;
  try {
    await auth.login({ email: form.email, password: form.password });
    // 登录态变了，此时动态路由尚未注册，交给守卫在跳转时按菜单重建
    await router.replace(resolveRedirect());
  } catch (err) {
    errorMsg.value =
      err instanceof Error ? err.message : '登录失败，请检查邮箱和密码';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--bg);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 380px;
  padding: 32px 28px 24px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--accent);
  color: var(--accent-fg);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 20px;
  flex: none;
}

.brand-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--fg);
}

.brand-sub {
  font-size: 12px;
  color: var(--muted);
  margin-top: 1px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.fld {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fld > label {
  font-size: 13px;
  font-weight: 500;
  color: var(--fg);
}

.in {
  height: 38px;
  border: 1px solid var(--line2);
  border-radius: var(--radius-sm);
  background: var(--surface);
  padding: 0 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}
.in:focus {
  border-color: var(--accent);
  background: var(--surface);
}

.submit-btn {
  height: 40px;
  font-size: 15px;
  margin-top: 6px;
  width: 100%;
  justify-content: center;
}

.hint-row {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}
</style>
