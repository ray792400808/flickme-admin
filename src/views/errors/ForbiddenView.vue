<script setup lang="ts">
import { useAuthStore } from '../../stores/auth';
const auth = useAuthStore();
</script>
<template>
  <main class="login-page">
    <h1>403 · 无访问权限</h1>
    <p>当前角色未获授权，请联系超级管理员。</p>
    <RouterLink v-if="auth.can('content')" to="/dramas">查看内容管理</RouterLink>
    <p v-else>该角色可用的业务页面尚未接入。</p>
    <button @click="auth.clear()">清除当前会话</button><RouterLink to="/login">返回登录</RouterLink>
  </main>
</template>
