<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { badgeApi, type Badge } from '../../api/content';
import { useAuthStore } from '../../stores/auth';
import { useListQuery } from '../../composables/useContentList';

const auth = useAuthStore();
const canWrite = computed(() => auth.can('content', true));

const keyword = ref('');
const { page, size, total, lastPage, loading, error, applyMeta } = useListQuery(keyword, 10);
const filterEnabled = ref<'' | number>('');
const rows = ref<Badge[]>([]);

const dialogVisible = ref(false);
const isNew = ref(false);
const saving = ref(false);
const formError = ref('');
const draft = reactive({
  id: 0,
  keyword: '',
  label: '',
  sort: 0,
  enabled: 1,
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await badgeApi.list({
      keyword: keyword.value || undefined,
      enabled: filterEnabled.value === '' ? undefined : filterEnabled.value,
      page: page.value,
      per_page: size.value,
    });
    rows.value = res.data;
    applyMeta(res);
  } catch (e) {
    error.value = (e as Error).message || '加载角标失败';
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  isNew.value = true;
  formError.value = '';
  Object.assign(draft, {
    id: 0,
    keyword: '',
    label: '',
    sort: (rows.value.at(-1)?.sort ?? 0) + 10,
    enabled: 1,
  });
  dialogVisible.value = true;
}

function openEdit(row: Badge) {
  isNew.value = false;
  formError.value = '';
  Object.assign(draft, {
    id: row.id,
    keyword: row.keyword,
    label: row.label ?? '',
    sort: row.sort,
    enabled: row.enabled,
  });
  dialogVisible.value = true;
}

async function save() {
  if (saving.value) return;
  formError.value = '';
  if (!draft.keyword.trim()) {
    formError.value = '角标关键词为必填项';
    return;
  }
  saving.value = true;
  try {
    const body = {
      keyword: draft.keyword.trim().toUpperCase(),
      label: draft.label.trim() || null,
      sort: draft.sort,
      enabled: draft.enabled,
    };
    if (isNew.value) await badgeApi.create(body);
    else await badgeApi.update(draft.id, body);
    ElMessage.success(isNew.value ? '已创建角标' : '已保存');
    dialogVisible.value = false;
    await load();
  } catch (e) {
    formError.value = (e as Error).message || '保存失败';
  } finally {
    saving.value = false;
  }
}

async function remove(row: Badge) {
  try {
    await ElMessageBox.confirm(
      `确定删除角标「${row.keyword}」？已挂载该角标的剧集会变为无角标。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await badgeApi.delete(row.id);
    ElMessage.success('已删除');
    await load();
  } catch (e) {
    ElMessage.error((e as Error).message || '删除失败');
  }
}

async function toggleEnabled(row: Badge) {
  try {
    await badgeApi.update(row.id, { enabled: row.enabled ? 0 : 1 });
    ElMessage.success(row.enabled ? '已停用' : '已启用');
    await load();
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败');
  }
}

watch([filterEnabled, size], () => {
  page.value = 1;
  load();
});
watch(page, load);

onMounted(load);
</script>

<template>
  <div class="page-heading">
    <div>
      <h1>角标</h1>
      <p>
        角标用于在剧集卡片上展示 HOT、NEW 等标识。关键词是稳定标识，创建后不建议修改。
      </p>
    </div>
    <div class="act">
      <span v-if="!canWrite" class="pill">当前角色只读</span>
      <button v-else class="primary" @click="openCreate">＋ 新增角标</button>
    </div>
  </div>

  <section class="card table-card">
    <div class="toolbar">
      <input v-model="keyword" type="search" placeholder="搜索角标关键词或名称…" />
      <select v-model="filterEnabled" aria-label="筛选启用状态">
        <option value="">全部状态</option>
        <option :value="1">已启用</option>
        <option :value="0">已停用</option>
      </select>
      <button @click="keyword = ''; filterEnabled = ''">重置</button>
      <span>{{ total }} 条记录</span>
    </div>

    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>关键词</th>
            <th>显示名称</th>
            <th>排序</th>
            <th>启用</th>
            <th class="operations">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="empty">正在加载…</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="5" class="empty" role="alert">
              {{ error }}<button class="btn sm" @click="load">重试</button>
            </td>
          </tr>
          <template v-else>
            <tr v-for="row in rows" :key="row.id">
              <td>
                <span class="pill blue">{{ row.keyword }}</span>
              </td>
              <td>{{ row.label || '—' }}</td>
              <td class="num">{{ row.sort }}</td>
              <td>
                <span class="pill" :class="row.enabled ? 'positive' : 'warning'">
                  {{ row.enabled ? '已启用' : '已停用' }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button @click="openEdit(row)">{{ canWrite ? '编辑' : '查看' }}</button>
                  <button v-if="canWrite" @click="toggleEnabled(row)">
                    {{ row.enabled ? '停用' : '启用' }}
                  </button>
                  <button v-if="canWrite" class="negative" @click="remove(row)">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="5" class="empty">暂无匹配的角标</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <footer class="pagination">
      <span>共 {{ total }} 条</span>
      <select v-model.number="size" aria-label="每页记录数">
        <option :value="10">10 条/页</option>
        <option :value="20">20 条/页</option>
        <option :value="50">50 条/页</option>
      </select>
      <button :disabled="page <= 1" @click="page--">上一页</button>
      <span>{{ page }} / {{ lastPage }}</span>
      <button :disabled="page >= lastPage" @click="page++">下一页</button>
    </footer>
  </section>

  <el-dialog
    v-model="dialogVisible"
    :title="isNew ? '新增角标' : '编辑角标'"
    width="480px"
    :close-on-click-modal="false"
  >
    <div class="form-grid">
      <label>
        关键词
        <input v-model="draft.keyword" placeholder="如 HOT" maxlength="64" />
        <small>唯一标识，建议大写英文；前台按此判断角标类型</small>
      </label>
      <label>
        显示名称
        <input v-model="draft.label" placeholder="如 热门" maxlength="50" />
        <small>留空时前台直接展示关键词</small>
      </label>
      <label>
        排序
        <input v-model.number="draft.sort" type="number" min="0" step="1" />
      </label>
      <label class="checkbox-row">
        <input v-model="draft.enabled" type="checkbox" :true-value="1" :false-value="0" />
        <span>启用该角标</span>
      </label>
    </div>
    <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
td.num {
  font-variant-numeric: tabular-nums;
}
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-grid label {
  display: grid;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 500;
}
.form-grid input:not([type='checkbox']) {
  height: 34px;
  border: 1px solid var(--line2);
  border-radius: 8px;
  background: var(--surface);
  padding: 0 10px;
  color: var(--fg);
  font: inherit;
  font-weight: 400;
}
.form-grid small {
  font-size: 11px;
  color: var(--muted);
  font-weight: 400;
}
.checkbox-row {
  grid-auto-flow: column;
  justify-content: start;
  align-items: center;
  gap: 8px;
}
.checkbox-row input {
  width: auto;
  height: auto;
  accent-color: var(--accent);
}
</style>
