<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getHealth } from '../../api/system';
import { useAuthStore } from '../../stores/auth';
import PageHeading from '../../components/common/PageHeading.vue';
import StatePanel from '../../components/common/StatePanel.vue';
const auth = useAuthStore();
const loading = ref(false);
const status = ref('');
const error = ref('');
async function load() {
  loading.value = true;
  error.value = '';
  try {
    const health = await getHealth();
    status.value = health.status === 'ok' ? 'API 服务正常' : 'API 服务状态异常';
  } catch (cause) {
    status.value = '';
    error.value = cause instanceof Error ? cause.message : '无法连接服务';
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <PageHeading title="数据概览" description="展示当前已接入的服务状态。"
    ><button :disabled="loading" @click="load">
      {{ loading ? '检查中…' : '刷新' }}
    </button></PageHeading
  >
  <section class="card">
    <h2>服务连接</h2>
    <StatePanel v-if="error" kind="error" title="连接失败" :description="error"
      ><button @click="load">重新连接</button></StatePanel
    >
    <p v-else role="status">{{ loading ? '正在检查服务…' : status }}</p>
  </section>
  <section class="card">
    <StatePanel
      kind="pending"
      title="统计接口尚未接入"
      description="DAU、收入、付费转化和待办数量将在统计接口完成后展示。目前不展示示例指标。"
    />
  </section>
  <section v-if="auth.can('system')" class="card">
    <h2>系统管理</h2>
    <div class="page-actions">
      <RouterLink to="/accounts">账号管理</RouterLink><RouterLink to="/roles">角色与权限</RouterLink
      ><RouterLink to="/audit-logs">操作日志</RouterLink>
    </div>
  </section>
</template>
