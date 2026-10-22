<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { languageApi, tagApi, type LanguageOption, type Tag } from '../../api/content';
import { useAuthStore } from '../../stores/auth';
import { useListQuery } from '../../composables/useContentList';

const auth = useAuthStore();
const canWrite = computed(() => auth.can('content', true));

const keyword = ref('');
const { page, size, total, lastPage, loading, error, applyMeta } = useListQuery(keyword, 10);
const filterType = ref<'' | number>('');
const filterStatus = ref<'' | number>('');
const rows = ref<Tag[]>([]);
const languages = ref<LanguageOption[]>([]);
const stats = ref<Record<string, number>>({});

const dialogVisible = ref(false);
const isNew = ref(false);
const saving = ref(false);
const formError = ref('');

interface TranslationDraft {
  language_id: number;
  language_code: string;
  name: string;
  description: string;
}

const draft = reactive({
  id: 0,
  code: '',
  type: 1,
  name: '',
  description: '',
  language_id: 0,
  language_code: 'en-US',
  status: 1,
  translations: [] as TranslationDraft[],
});

/** 默认语种：按排序最前的基础语种（语言表不再有 is_default 字段） */
const defaultLanguage = computed(() => languages.value[0] ?? null);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await tagApi.list({
      keyword: keyword.value || undefined,
      type: filterType.value === '' ? undefined : filterType.value,
      status: filterStatus.value === '' ? undefined : filterStatus.value,
      page: page.value,
      per_page: size.value,
    });
    rows.value = res.data;
    applyMeta(res);
  } catch (e) {
    error.value = (e as Error).message || '加载标签失败';
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  try {
    stats.value = await tagApi.stats();
  } catch {
    stats.value = {};
  }
}

async function loadLanguages() {
  try {
    languages.value = await languageApi.options();
  } catch {
    languages.value = [];
  }
}

/** 打开编辑抽屉时初始化翻译行：每种语言一行，默认带上已有翻译 */
function buildTranslationRows(existing: Tag['translations']): TranslationDraft[] {
  return languages.value.map((lang) => {
    const found = existing.find((t) => t.language_id === lang.id);
    return {
      language_id: lang.id,
      language_code: lang.code,
      name: found?.name ?? '',
      description: found?.description ?? '',
    };
  });
}

function openCreate() {
  isNew.value = true;
  formError.value = '';
  const base = defaultLanguage.value;
  Object.assign(draft, {
    id: 0,
    code: '',
    type: 1,
    name: '',
    description: '',
    language_id: base?.id ?? 0,
    language_code: base?.code ?? 'en-US',
    status: 1,
    translations: buildTranslationRows([]),
  });
  dialogVisible.value = true;
}

function openEdit(row: Tag) {
  isNew.value = false;
  formError.value = '';
  Object.assign(draft, {
    id: row.id,
    code: row.code,
    type: row.type,
    name: row.name,
    description: row.description ?? '',
    language_id: row.language_id,
    language_code: row.language_code,
    status: row.status,
    translations: buildTranslationRows(row.translations),
  });
  dialogVisible.value = true;
}

/** 切换默认语种时同步更新 language_code 缓存字段 */
function onDefaultLanguageChange() {
  const lang = languages.value.find((l) => l.id === draft.language_id);
  if (lang) draft.language_code = lang.code;
}

async function save() {
  if (saving.value) return;
  formError.value = '';
  if (!draft.code.trim() || !draft.name.trim()) {
    formError.value = '稳定标识与名称为必填项';
    return;
  }
  if (!draft.language_id) {
    formError.value = '请选择默认语种';
    return;
  }
  saving.value = true;
  try {
    // 只提交填了名称的翻译行
    const translations = draft.translations
      .filter((t) => t.name.trim())
      .map((t) => ({
        language_id: t.language_id,
        name: t.name.trim(),
        description: t.description.trim() || null,
      }));

    const body = {
      code: draft.code.trim(),
      type: draft.type,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      language_id: draft.language_id,
      language_code: draft.language_code,
      status: draft.status,
      translations,
    };

    if (isNew.value) await tagApi.create(body);
    else await tagApi.update(draft.id, body);

    ElMessage.success(isNew.value ? '已创建标签' : '已保存');
    dialogVisible.value = false;
    await Promise.all([load(), loadStats()]);
  } catch (e) {
    formError.value = (e as Error).message || '保存失败';
  } finally {
    saving.value = false;
  }
}

async function remove(row: Tag) {
  try {
    await ElMessageBox.confirm(
      `确定删除${row.type_label}「${row.name}」？已关联该${row.type_label}的剧集会解除关联。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await tagApi.delete(row.id);
    ElMessage.success('已删除');
    await Promise.all([load(), loadStats()]);
  } catch (e) {
    ElMessage.error((e as Error).message || '删除失败');
  }
}

async function toggleStatus(row: Tag) {
  try {
    await tagApi.update(row.id, { status: row.status === 1 ? 2 : 1 });
    ElMessage.success(row.status === 1 ? '已停用' : '已启用');
    await load();
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败');
  }
}

watch([filterType, filterStatus, size], () => {
  page.value = 1;
  load();
});
watch(page, load);

onMounted(async () => {
  await loadLanguages();
  await Promise.all([load(), loadStats()]);
});
</script>

<template>
  <div class="page-heading">
    <div>
      <h1>标签与合集</h1>
      <p>
        标签用于分类 Chips 与 Topic 主题页；合集在 For you 的 You May Like
        中以合集卡出现。标签支持多语言名称与描述。
      </p>
    </div>
    <div class="act">
      <span v-if="!canWrite" class="pill">当前角色只读</span>
      <button v-else class="primary" @click="openCreate">＋ 新建</button>
    </div>
  </div>

  <section class="card table-card">
    <div class="toolbar">
      <input v-model="keyword" type="search" placeholder="搜索标识或名称…" />
      <select v-model="filterType" aria-label="筛选类型">
        <option value="">全部类型</option>
        <option :value="1">标签</option>
        <option :value="2">合集</option>
      </select>
      <select v-model="filterStatus" aria-label="筛选状态">
        <option value="">全部状态</option>
        <option :value="1">已发布</option>
        <option :value="2">已停用</option>
      </select>
      <button @click="keyword = ''; filterType = ''; filterStatus = ''">重置</button>
      <span>{{ total }} 条记录</span>
    </div>

    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>名称</th>
            <th>稳定标识</th>
            <th>类型</th>
            <th>默认语种</th>
            <th>关联剧数</th>
            <th>状态</th>
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
              <td>
                <b>{{ row.name }}</b>
                <small v-if="row.description" class="desc">{{ row.description }}</small>
              </td>
              <td><span class="code">{{ row.code }}</span></td>
              <td>
                <span class="pill" :class="row.type === 2 ? 'blue' : ''">
                  {{ row.type_label }}
                </span>
              </td>
              <td><span class="code">{{ row.language_code }}</span></td>
              <td class="num">{{ stats[row.id] ?? 0 }}</td>
              <td>
                <span class="pill" :class="row.status === 1 ? 'positive' : 'warning'">
                  {{ row.status_label }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button @click="openEdit(row)">{{ canWrite ? '编辑' : '查看' }}</button>
                  <button v-if="canWrite" @click="toggleStatus(row)">
                    {{ row.status === 1 ? '停用' : '启用' }}
                  </button>
                  <button v-if="canWrite" class="negative" @click="remove(row)">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="7" class="empty">暂无匹配的标签</td>
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
    :title="isNew ? '新建标签与合集' : '编辑标签与合集'"
    width="640px"
    :close-on-click-modal="false"
  >
    <div class="form-grid">
      <label>
        稳定标识
        <input v-model="draft.code" placeholder="如 romance" maxlength="100" />
        <small>唯一标识，创建后不建议修改</small>
      </label>
      <label>
        名称（默认语种）
        <input v-model="draft.name" placeholder="如 Romance" maxlength="200" />
      </label>
      <label>
        描述
        <textarea v-model="draft.description" rows="2" placeholder="选填" />
      </label>
      <div class="row2">
        <label>
          类型
          <select v-model.number="draft.type">
            <option :value="1">标签</option>
            <option :value="2">合集</option>
          </select>
        </label>
        <label>
          默认语种
          <select v-model.number="draft.language_id" @change="onDefaultLanguageChange">
            <option v-for="lang in languages" :key="lang.id" :value="lang.id">
              {{ lang.flag_emoji }} {{ lang.native_name }} ({{ lang.code }})
            </option>
          </select>
        </label>
      </div>
      <label>
        状态
        <select v-model.number="draft.status">
          <option :value="1">已发布</option>
          <option :value="2">已停用</option>
        </select>
      </label>

      <fieldset v-if="draft.translations.length">
        <legend>多语言名称与描述</legend>
        <div class="trans-list">
          <div v-for="t in draft.translations" :key="t.language_id" class="trans-item">
            <div class="trans-head">
              <span class="code">{{ t.language_code }}</span>
              <span class="text-muted">{{ t.name ? '已翻译' : '未翻译' }}</span>
            </div>
            <input v-model="t.name" placeholder="名称" maxlength="200" />
            <input v-model="t.description" placeholder="描述（选填）" maxlength="500" />
          </div>
        </div>
        <small class="hint">留空表示该语种回退到默认语种名称</small>
      </fieldset>
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
.desc {
  display: block;
  margin-top: 2px;
  max-width: 260px;
  color: var(--muted);
  font-size: 11.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.form-grid input,
.form-grid select,
.form-grid textarea {
  height: 34px;
  border: 1px solid var(--line2);
  border-radius: 8px;
  background: var(--surface);
  padding: 0 10px;
  color: var(--fg);
  font: inherit;
  font-weight: 400;
}
.form-grid textarea {
  height: auto;
  padding: 8px 10px;
  resize: vertical;
}
.form-grid small {
  font-size: 11px;
  color: var(--muted);
  font-weight: 400;
}
.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
fieldset {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  margin: 0;
}
legend {
  padding: 0 6px;
  font-size: 12.5px;
  font-weight: 500;
}
.trans-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.trans-item {
  display: grid;
  gap: 6px;
}
.trans-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
}
.trans-item input {
  height: 32px;
}
.hint {
  display: block;
  margin-top: 10px;
  font-size: 11px;
  color: var(--muted);
}
</style>
