<template>
  <div>
    <div class="ph">
      <div>
        <h1>角色管理</h1>
        <p>角色决定菜单可见范围与按钮级权限。超管角色不可删除，系统会自动授予全部权限。</p>
      </div>
      <div class="act">
        <span v-if="!auth.can('role.create')" class="readonly-pill">当前角色只读</span>
        <button v-if="auth.can('role.create')" class="btn pri" @click="handleAdd">新增角色</button>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <input
          v-model="queryForm.keyword"
          class="search-input"
          type="search"
          placeholder="搜索角色名称或标识"
          @keyup.enter="handleSearch"
          @search="handleSearch"
        />
        <button class="btn sm" @click="handleReset">重置</button>
        <span class="count">共 {{ total }} 条</span>
      </div>

      <div v-if="loading" class="empty">加载中…</div>

      <div v-else class="tw">
        <table>
          <thead>
            <tr>
              <th>角色</th>
              <th style="width: 150px">标识</th>
              <th>描述</th>
              <th style="width: 90px" class="num-th">用户数</th>
              <th style="width: 90px" class="num-th">权限数</th>
              <th style="width: 150px">创建时间</th>
              <th style="width: 140px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tableData" :key="row.id">
              <td>
                <div class="cell-stack">
                  <span class="t">
                    {{ row.name }}
                    <span v-if="row.is_super_admin" class="pill acc">超管</span>
                    <span v-else-if="row.is_default" class="pill info">默认</span>
                  </span>
                  <span v-if="row.status === false" class="sub">已停用</span>
                </div>
              </td>
              <td><span class="code">{{ row.slug }}</span></td>
              <td class="text-muted">{{ row.description || '—' }}</td>
              <td class="num">{{ row.users_count }}</td>
              <td class="num">{{ row.permissions_count ?? '—' }}</td>
              <td class="mono">{{ formatDate(row.created_at) }}</td>
              <td>
                <span class="row-actions">
                  <button
                    class="btn sm"
                    :disabled="!auth.can('role.edit')"
                    @click="handleEdit(row)"
                  >
                    编辑
                  </button>
                  <button
                    class="btn sm dg"
                    :disabled="!auth.can('role.delete') || row.slug === 'super_admin'"
                    @click="handleDelete(row)"
                  >
                    删除
                  </button>
                </span>
              </td>
            </tr>
            <tr v-if="!tableData.length">
              <td colspan="7" class="empty">没有符合条件的角色</td>
            </tr>
          </tbody>
        </table>
      </div>

      <TablePager
        v-model:page="queryForm.page"
        v-model:per-page="queryForm.per_page"
        :total="total"
        :page-sizes="[15, 30, 50, 100]"
        @update:page="loadData"
        @update:per-page="handleSearch"
      />
    </div>

    <RoleEditDialog v-model="editDialogVisible" :role="currentRole" @success="loadData" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { roleApi } from '../../../api/admin';
import type { Role } from '../../../types/auth';
import { useAuthStore } from '../../../stores/auth';
import TablePager from '../../../components/common/TablePager.vue';
import RoleEditDialog from './components/RoleEditDialog.vue';

const auth = useAuthStore();

const loading = ref(false);
const tableData = ref<Role[]>([]);
const total = ref(0);

const queryForm = reactive({
  keyword: '',
  page: 1,
  per_page: 15,
});

const editDialogVisible = ref(false);
const currentRole = ref<Role | null>(null);

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

async function loadData() {
  loading.value = true;
  try {
    const res = await roleApi.list({ ...queryForm });
    tableData.value = res.data;
    total.value = res.total;
  } catch (error) {
    ElMessage.error((error as Error).message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  queryForm.page = 1;
  loadData();
}

function handleReset() {
  queryForm.keyword = '';
  handleSearch();
}

function handleAdd() {
  currentRole.value = null;
  editDialogVisible.value = true;
}

function handleEdit(role: Role) {
  currentRole.value = { ...role };
  editDialogVisible.value = true;
}

async function handleDelete(role: Role) {
  if (role.users_count > 0) {
    ElMessage.warning(`「${role.name}」下还有 ${role.users_count} 个账号，请先调整成员`);
    return;
  }

  try {
    await ElMessageBox.confirm(`确定删除角色「${role.name}」？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }

  try {
    await roleApi.delete(role.id);
    ElMessage.success('已删除');
    if (tableData.value.length === 1 && queryForm.page > 1) queryForm.page -= 1;
    loadData();
  } catch (error) {
    ElMessage.error((error as Error).message || '删除失败');
  }
}

onMounted(loadData);
</script>

<style scoped>
.num-th {
  text-align: right;
}
</style>