<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { languageApi, type Language } from '../../api/content';
import { useAuthStore } from '../../stores/auth';
import { useListQuery } from '../../composables/useContentList';

const auth = useAuthStore();
const canWrite = computed(() => auth.can('content', true));

const keyword = ref('');
const { page, size, total, lastPage, loading, error, applyMeta } = useListQuery(keyword, 10);
const filterEnabled = ref<'' | number>('');
const rows = ref<Language[]>([]);

const dialogVisible = ref(false);
const isNew = ref(false);
const saving = ref(false);
const formError = ref('');
const draft = reactive({
  id: 0,
  code: '',
  name: '',
  native_name: '',
  flag_emoji: '',
  enabled: 1,
  sort: 0,
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await languageApi.list({
      keyword: keyword.value || undefined,
      enabled: filterEnabled.value === '' ? undefined : filterEnabled.value,
      page: page.value,
      per_page: size.value,
    });
    rows.value = res.data;
    applyMeta(res);
  } catch (e) {
    error.value = (e as Error).message || '加载语言列表失败';
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  isNew.value = true;
  formError.value = '';
  Object.assign(draft, {
    id: 0,
    code: '',
    name: '',
    native_name: '',
    flag_emoji: '',
    enabled: 1,
    sort: (rows.value.at(-1)?.sort ?? 0) + 10,
  });
  dialogVisible.value = true;
}

function openEdit(row: Language) {
  isNew.value = false;
  formError.value = '';
  Object.assign(draft, {
    id: row.id,
    code: row.code,
    name: row.name,
    native_name: row.native_name,
    flag_emoji: row.flag_emoji ?? '',
    enabled: row.enabled,
    sort: row.sort,
  });
  dialogVisible.value = true;
}

async function save() {
  if (saving.value) return;
  formError.value = '';
  if (!draft.code.trim() || !draft.name.trim() || !draft.native_name.trim()) {
    formError.value = '语种代码、英文名与本地名均为必填项';
    return;
  }
  saving.value = true;
  try {
    const body = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      native_name: draft.native_name.trim(),
      flag_emoji: draft.flag_emoji.trim() || null,
      enabled: draft.enabled,
      sort: draft.sort,
    };
    if (isNew.value) await languageApi.create(body);
    else await languageApi.update(draft.id, body);
    ElMessage.success(isNew.value ? '已创建语种' : '已保存');
    dialogVisible.value = false;
    await load();
  } catch (e) {
    formError.value = (e as Error).message || '保存失败';
  } finally {
    saving.value = false;
  }
}

async function remove(row: Language) {
  try {
    await ElMessageBox.confirm(
      `确定删除语种「${row.native_name}」？已被引用的语种建议改为停用。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await languageApi.delete(row.id);
    ElMessage.success('已删除');
    await load();
  } catch (e) {
    ElMessage.error((e as Error).message || '删除失败');
  }
}

async function toggleEnabled(row: Language) {
  try {
    await languageApi.update(row.id, { enabled: row.enabled ? 0 : 1 });
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
      <h1>语言列表</h1>
      <p>
        维护系统支持的语种。语言是标签、合集、剧库等内容的默认语种与翻译维度，
        排序值决定语言切换器的展示顺序。
      </p>
    </div>
    <div class="act">
      <span v-if="!canWrite" class="pill">当前角色只读</span>
      <button v-else class="primary" @click="openCreate">＋ 新增语种</button>
    </div>
  </div>

  <section class="card table-card">
    <div class="toolbar">
      <input v-model="keyword" type="search" placeholder="搜索语种代码或名称…" />
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
            <th class="flag-col"></th>
            <th>语种代码</th>
            <th>英文名</th>
            <th>本地名</th>
            <th>排序</th>
            <th>启用</th>
            <th class="operations">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="empty">正在加载…</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="7" class="empty" role="alert">
              {{ error }}<button class="btn sm" @click="load">重试</button>
            </td>
          </tr>
          <template v-else>
            <tr v-for="row in rows" :key="row.id">
              <td class="flag-col">{{ row.flag_emoji || '—' }}</td>
              <td><span class="code">{{ row.code }}</span></td>
              <td>{{ row.name }}</td>
              <td>{{ row.native_name }}</td>
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
              <td colspan="7" class="empty">暂无匹配的语种</td>
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
    :title="isNew ? '新增语种' : '编辑语种'"
    width="520px"
    :close-on-click-modal="false"
  >
    <div class="form-grid">
      <label>
        语种代码（BCP47）
        <input v-model="draft.code" placeholder="如 zh-Hans-CN" maxlength="16" />
        <small>建议使用 BCP47 区域码，前端按此匹配翻译</small>
      </label>
      <label>
        英文名
        <input v-model="draft.name" placeholder="如 Chinese (Simplified)" maxlength="100" />
      </label>
      <label>
        本地名
        <input v-model="draft.native_name" placeholder="如 简体中文" maxlength="100" />
      </label>
      <label>
        国旗 Emoji
        <input v-model="draft.flag_emoji" placeholder="如 🇨🇳" maxlength="16" />
      </label>
      <label>
        排序
        <input v-model.number="draft.sort" type="number" min="0" step="1" />
        <small>数值越小越靠前，排在首位的基础语种即默认语种</small>
      </label>
      <label class="checkbox-row">
        <input v-model="draft.enabled" type="checkbox" :true-value="1" :false-value="0" />
        <span>启用该语种</span>
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
.flag-col {
  width: 48px;
  text-align: center;
  font-size: 20px;
}
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
