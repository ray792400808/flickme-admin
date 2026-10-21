<template>
  <div>
    <div class="ph">
      <div>
        <h1>用户管理</h1>
        <p>后台账号、角色分配与登录状态。删除账号前请确认其名下无待办审批。</p>
      </div>
      <div class="act">
        <span v-if="readOnly" class="readonly-pill">当前角色只读</span>
        <button v-if="auth.can('user.create')" class="btn pri" :disabled="readOnly" @click="handleAdd">
          新增用户
        </button>
      </div>
    </div>

    <div class="card">
      <div class="toolbar">
        <input
          v-model="queryForm.keyword"
          class="search-input"
          type="search"
          placeholder="搜索姓名或邮箱"
          @keyup.enter="handleSearch"
          @search="handleSearch"
        />
        <select v-model="queryForm.role_id" class="filter-select" aria-label="角色" @change="handleSearch">
          <option :value="undefined">角色：全部</option>
          <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
        <select v-model="queryForm.status" class="filter-select" aria-label="状态" @change="handleSearch">
          <option :value="undefined">状态：全部</option>
          <option :value="true">启用</option>
          <option :value="false">禁用</option>
        </select>
        <button class="btn sm" @click="handleReset">重置</button>
        <span class="count">共 {{ total }} 条</span>
      </div>

      <div v-if="loading" class="empty">加载中…</div>

      <div v-else class="tw">
        <table>
          <thead>
            <tr>
              <th>用户</th>
              <th>角色</th>
              <th style="width: 90px">状态</th>
              <th style="width: 160px">最后登录</th>
              <th style="width: 130px">登录 IP</th>
              <th style="width: 160px">创建时间</th>
              <th style="width: 200px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in tableData" :key="row.id" :class="{ dim: !row.status }">
              <td>
                <div class="cell-stack">
                  <span class="t">
                    {{ row.name }}
                    <span v-if="row.is_super_admin" class="pill acc">超管</span>
                  </span>
                  <span class="sub">{{ row.email }}</span>
                </div>
              </td>
              <td>
                <span v-if="row.roles.length" class="tg">
                  <span v-for="r in row.roles" :key="r.id" class="pill">{{ r.name }}</span>
                </span>
                <span v-else class="text-muted">—</span>
              </td>
              <td>
                <span class="pill" :class="row.status ? 'good' : 'bad'">
                  {{ row.status ? '启用' : '禁用' }}
                </span>
              </td>
              <td class="mono">{{ row.login_at ? formatDate(row.login_at) : '从未登录' }}</td>
              <td class="mono">{{ row.login_ip || '—' }}</td>
              <td class="mono">{{ formatDate(row.created_at) }}</td>
              <td>
                <span class="row-actions">
                  <button class="btn sm" :disabled="!auth.can('user.edit')" @click="handleEdit(row)">
                    编辑
                  </button>
                  <button class="btn sm" :disabled="!auth.can('user.edit')" @click="handleResetPwd(row)">
                    重置密码
                  </button>
                  <button
                    class="btn sm dg"
                    :disabled="!auth.can('user.delete') || row.id === currentUserId"
                    @click="handleDelete(row)"
                  >
                    删除
                  </button>
                </span>
              </td>
            </tr>
            <tr v-if="!tableData.length">
              <td colspan="7" class="empty">没有符合条件的账号</td>
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

    <UserEditDialog
      v-model="editDialogVisible"
      :user="currentUser"
      :roles="roles"
      @success="loadData"
    />

    <ResetPwdDialog v-model="resetPwdDialogVisible" :user="currentUser" @success="loadData" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { userApi, roleApi } from '../../../api/admin';
import type { AdminUser, Role } from '../../../types/auth';
import { useAuthStore } from '../../../stores/auth';
import TablePager from '../../../components/common/TablePager.vue';
import UserEditDialog from './components/UserEditDialog.vue';
import ResetPwdDialog from './components/ResetPwdDialog.vue';

const auth = useAuthStore();
const currentUserId = computed(() => auth.user?.id);
const readOnly = computed(() => !auth.isSuperAdmin && auth.menus.length === 0);

const loading = ref(false);
const tableData = ref<AdminUser[]>([]);
const total = ref(0);
const roles = ref<Role[]>([]);

const queryForm = reactive({
  keyword: '',
  role_id: undefined as number | undefined,
  status: undefined as boolean | undefined,
  page: 1,
  per_page: 15,
});

const editDialogVisible = ref(false);
const resetPwdDialogVisible = ref(false);
const currentUser = ref<AdminUser | null>(null);

function formatDate(iso: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

async function loadData() {
  loading.value = true;
  try {
    const res = await userApi.list({ ...queryForm });
    tableData.value = res.data;
    total.value = res.total;
  } catch (error) {
    ElMessage.error((error as Error).message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadRoles() {
  try {
    const res = await roleApi.list({ per_page: 100 });
    roles.value = res.data;
  } catch {
    roles.value = [];
  }
}

function handleSearch() {
  queryForm.page = 1;
  loadData();
}

function handleReset() {
  queryForm.keyword = '';
  queryForm.role_id = undefined;
  queryForm.status = undefined;
  handleSearch();
}

function handleAdd() {
  currentUser.value = null;
  editDialogVisible.value = true;
}

function handleEdit(user: AdminUser) {
  currentUser.value = { ...user };
  editDialogVisible.value = true;
}

function handleResetPwd(user: AdminUser) {
  currentUser.value = user;
  resetPwdDialogVisible.value = true;
}

async function handleDelete(user: AdminUser) {
  try {
    await ElMessageBox.confirm(`确定删除账号「${user.name}」？此操作不可撤销。`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }

  try {
    await userApi.delete(user.id);
    ElMessage.success('已删除');
    // 删掉当前页最后一条时回退一页
    if (tableData.value.length === 1 && queryForm.page > 1) queryForm.page -= 1;
    loadData();
  } catch (error) {
    ElMessage.error((error as Error).message || '删除失败');
  }
}

onMounted(() => {
  loadData();
  loadRoles();
});
</script>