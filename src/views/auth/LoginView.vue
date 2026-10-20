<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const submitting = ref(false);
async function login() {
  if (submitting.value) return;
  submitting.value = true;
  error.value = '';
  try {
    await auth.login({ email: email.value, password: password.value });
    password.value = '';
    const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard';
    await router.replace(
      ['/dashboard', '/dramas', '/characters', '/accounts', '/roles', '/audit-logs'].includes(
        target.split('?')[0]!,
      )
        ? target
        : '/dashboard',
    );
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '登录失败';
  } finally {
    submitting.value = false;
  }
}
</script>
<template>
  <main class="login-page">
    <h1>Flickme 管理员登录</h1>
    <section class="card">
      <form @submit.prevent="login">
        <label>邮箱<input v-model="email" type="email" autocomplete="username" required /></label
        ><label
          >密码<input v-model="password" type="password" autocomplete="current-password" required
        /></label>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <button class="primary" :disabled="submitting">
          {{ submitting ? '登录中…' : '登录' }}
        </button>
      </form>
    </section>
  </main>
</template>
