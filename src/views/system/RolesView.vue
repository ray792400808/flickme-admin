<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { accountsApi, type RoleData, type Role } from '../../api/accounts';
import { useAuthStore } from '../../stores/auth';
const auth = useAuthStore();
const data = ref<RoleData>({ groups: {}, roles: [] });
const error = ref('');
const busy = ref(false);
const saving = ref<number | null>(null);
const message = ref('');
async function load() {
  busy.value = true;
  error.value = '';
  try {
    data.value = await accountsApi.roles();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载失败';
  } finally {
    busy.value = false;
  }
}
async function change(role: Role, key: string, event: Event) {
  if (saving.value !== null) return;
  const previous = role.permissions[key];
  role.permissions[key] = (event.target as HTMLSelectElement).value as 'none' | 'r' | 'rw';
  saving.value = role.id;
  error.value = '';
  try {
    await accountsApi.updateRole(role);
    message.value = '权限已保存，后端下一次请求即生效';
  } catch (cause) {
    if (previous) role.permissions[key] = previous;
    else delete role.permissions[key];
    error.value = cause instanceof Error ? cause.message : '保存失败';
  } finally {
    saving.value = null;
  }
}
onMounted(load);
</script>
<template>
  <div class="page-heading">
    <div>
      <h1>角色与权限</h1>
      <p>按菜单分配无权限、只读、读写。超级管理员固定全部读写。</p>
    </div>
    <button :disabled="busy" @click="load">刷新</button>
  </div>
  <p v-if="error" class="form-error" role="alert">{{ error }}</p>
  <p v-if="message" class="info-note" role="status">{{ message }}</p>
  <section class="card table-card">
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>菜单</th>
            <th v-for="r in data.roles" :key="r.id">{{ r.name }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(name, key) in data.groups" :key="key">
            <th>{{ name }}</th>
            <td v-for="r in data.roles" :key="r.id">
              <select
                :aria-label="`${r.name} ${name}权限`"
                :value="r.permissions[key] || 'none'"
                :disabled="r.key === 'admin' || auth.user?.role !== 'admin' || saving !== null"
                @change="change(r, key, $event)"
              >
                <option value="none">无权限</option>
                <option value="r">只读</option>
                <option value="rw">读写</option>
              </select>
            </td>
          </tr>
          <tr v-if="busy">
            <td colspan="6" class="empty">加载中…</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
  <p class="info-note">
    仅超级管理员可修改权限。业务页面中的本地示例操作不会影响服务端；金币调整、价格变更、推送群发的正式审批以接入后的服务端流程为准。
  </p>
</template>
