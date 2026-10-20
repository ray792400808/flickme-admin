<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { accountsApi } from '../../api/accounts';
const route = useRoute();
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));
const password = ref('');
const confirmation = ref('');
const busy = ref(false);
const error = ref('');
const done = ref(false);
async function submit() {
  if (busy.value) return;
  error.value = '';
  if (password.value !== confirmation.value) {
    error.value = '两次输入的密码不一致';
    return;
  }
  busy.value = true;
  try {
    await accountsApi.activate({
      token: token.value,
      password: password.value,
      password_confirmation: confirmation.value,
    });
    done.value = true;
    password.value = '';
    confirmation.value = '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '激活失败';
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="login-page">
    <h1>激活账号 / 设置密码</h1>
    <section class="card">
      <template v-if="done"
        ><p>密码已设置，请使用邮箱和新密码登录。</p>
        <RouterLink to="/login">前往登录 →</RouterLink></template
      >
      <form v-else @submit.prevent="submit">
        <p>链接有效期为 24 小时，仅可使用一次。</p>
        <p v-if="!token" class="form-error">缺少激活链接，请联系管理员重新邀请。</p>
        <label
          >新密码<input
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="12"
            maxlength="128"
            required /></label
        ><label
          >确认密码<input
            v-model="confirmation"
            type="password"
            autocomplete="new-password"
            minlength="12"
            maxlength="128"
            required
        /></label>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <button class="primary" :disabled="busy || !token">
          {{ busy ? '提交中…' : '设置密码并激活' }}
        </button>
      </form>
    </section>
  </main>
</template>
