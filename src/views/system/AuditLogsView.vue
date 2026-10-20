<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { accountsApi, type Page, type AuditLog } from '../../api/accounts';
const data = ref<Page<AuditLog>>({ data: [], current_page: 1, last_page: 1, total: 0 });
const busy = ref(false);
const error = ref('');
async function load(page = 1) {
  busy.value = true;
  error.value = '';
  try {
    data.value = await accountsApi.logs(page);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载失败';
  } finally {
    busy.value = false;
  }
}
onMounted(() => load());
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>操作日志</h1>
      <p>记录账号与角色权限的管理操作。日志只读，不记录密码或激活令牌。</p>
    </div>
    <button :disabled="busy" @click="load()">刷新</button>
  </div>
  <p v-if="error" class="form-error" role="alert">{{ error }}</p>
  <section class="card table-card">
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>时间</th>
            <th>操作人</th>
            <th>操作</th>
            <th>对象</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in data.data" :key="row.id">
            <td>{{ new Date(row.created_at).toLocaleString() }}</td>
            <td>{{ row.actor }}</td>
            <td>{{ row.action }}</td>
            <td>{{ row.subject }}</td>
          </tr>
          <tr v-if="!data.data.length">
            <td colspan="4" class="empty">{{ busy ? '加载中…' : '暂无操作记录' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <footer class="pagination">
      <span>共 {{ data.total }} 条</span
      ><button :disabled="busy || data.current_page <= 1" @click="load(data.current_page - 1)">
        上一页</button
      ><span>{{ data.current_page }} / {{ data.last_page }}</span
      ><button
        :disabled="busy || data.current_page >= data.last_page"
        @click="load(data.current_page + 1)"
      >
        下一页
      </button>
    </footer>
  </section>
</template>
