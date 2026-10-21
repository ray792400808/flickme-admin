<template>
  <div>
    <div class="ph">
      <div>
        <h1>权限管理</h1>
        <p>
          按模块维护权限码。权限码同时用于接口鉴权与前端按钮显隐，命名格式为
          <span class="code">模块.动作</span>，例如 <span class="code">user.create</span>。
        </p>
      </div>
      <div class="act">
        <span v-if="!auth.can('permission.create')" class="readonly-pill">当前角色只读</span>
        <button v-if="auth.can('permission.create')" class="btn" @click="openBatch">批量生成</button>
        <button v-if="auth.can('permission.create')" class="btn pri" @click="openCreate()">
          新增权限
        </button>
      </div>
    </div>

    <div class="banner">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01M11 12h1v4h1" stroke-linecap="round" />
      </svg>
      <span>点击权限码可复制。已授权给角色的权限码不可直接改名，需先解除授权。</span>
    </div>

    <div class="card">
      <div class="toolbar">
        <input
          v-model="keyword"
          class="search-input"
          type="search"
          placeholder="搜索权限名称或权限码"
          @keyup.enter="load"
          @search="load"
        />
        <select v-model="moduleFilter" class="filter-select" aria-label="模块" @change="load">
          <option value="">模块：全部</option>
          <option v-for="m in modules" :key="m" :value="m">{{ m }}</option>
        </select>
        <select v-model="typeFilter" class="filter-select" aria-label="类型" @change="load">
          <option :value="undefined">类型：全部</option>
          <option v-for="(label, value) in types" :key="value" :value="Number(value)">
            {{ label }}
          </option>
        </select>
        <button class="btn sm" @click="keyword = ''; moduleFilter = ''; typeFilter = undefined; load()">
          重置
        </button>
        <span class="count">共 {{ flat.length }} 条</span>
      </div>

      <div v-if="loading" class="empty">加载中…</div>

      <div v-else class="tw">
        <table>
          <thead>
            <tr>
              <th>权限名称</th>
              <th style="width: 240px">权限码</th>
              <th style="width: 100px">类型</th>
              <th style="width: 70px" class="num-th">排序</th>
              <th>备注</th>
              <th v-if="canEditOrDelete" style="width: 130px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in flat" :key="row.id">
              <td>
                <span class="ind" :style="{ paddingLeft: depth(row) * 18 + 'px' }">
                  <span v-if="depth(row) > 0" class="twig">└</span>
                  <b v-if="row.type === 1">{{ row.name }}</b>
                  <span v-else>{{ row.name }}</span>
                </span>
              </td>
              <td>
                <span class="code clickable" :title="'点击复制 ' + row.code" @click="copyCode(row.code)">
                  {{ row.code }}
                </span>
              </td>
              <td>
                <span class="pill" :class="typeClass(row.type)">{{ row.type_label }}</span>
              </td>
              <td class="num">{{ row.sort }}</td>
              <td class="text-muted">{{ row.remark || '—' }}</td>
              <td v-if="canEditOrDelete">
                <span class="row-actions">
                  <button class="btn sm" @click="openEdit(row)">编辑</button>
                  <button class="btn sm dg" @click="remove(row)">删除</button>
                </span>
              </td>
            </tr>
            <tr v-if="!flat.length">
              <td :colspan="canEditOrDelete ? 6 : 5" class="empty">没有符合条件的权限</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 单条编辑 -->
    <el-dialog v-model="dialogVisible" :title="editing ? '编辑权限' : '新增权限'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="上级权限">
          <el-select v-model="form.parent_id" placeholder="不选则为顶级" clearable style="width: 100%">
            <el-option
              v-for="p in parentOptions"
              :key="p.id"
              :label="p.label"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="权限名称" prop="name">
          <el-input v-model="form.name" placeholder="如：创建用户" maxlength="50" />
        </el-form-item>
        <el-form-item label="权限码" prop="code">
          <el-input v-model="form.code" placeholder="如：user.create" />
          <div class="hint">小写字母与下划线，必须包含一个点</div>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio-button v-for="(label, value) in types" :key="value" :value="Number(value)">
              {{ label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="9999" :controls="false" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量生成 -->
    <el-dialog v-model="batchVisible" title="批量生成权限" width="520px">
      <el-form ref="batchRef" :model="batchForm" :rules="batchRules" label-width="90px">
        <el-form-item label="模块标识" prop="module">
          <el-input v-model="batchForm.module" placeholder="如：drama" />
          <div class="hint">英文小写，作为权限码前缀</div>
        </el-form-item>
        <el-form-item label="模块名称" prop="module_name">
          <el-input v-model="batchForm.module_name" placeholder="如：短剧库" />
        </el-form-item>
        <el-form-item label="生成动作">
          <el-checkbox-group v-model="batchForm.actions">
            <el-checkbox v-for="a in availableActions" :key="a" :value="a">{{ a }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <div v-if="batchPreview.length" class="banner" style="margin: 0 0 4px">
        <div style="display: flex; flex-direction: column; gap: 2px">
          <b>将创建 {{ batchPreview.length }} 条权限：</b>
          <span v-for="c in batchPreview" :key="c" class="code">{{ c }}</span>
        </div>
      </div>

      <template #footer>
        <el-button @click="batchVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitBatch">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { permissionApi } from '../../../api/admin';
import type { AdminPermission } from '../../../types/auth';
import { useAuthStore } from '../../../stores/auth';

const auth = useAuthStore();

const loading = ref(false);
const saving = ref(false);
const tree = ref<AdminPermission[]>([]);
const flat = ref<AdminPermission[]>([]);
const types = ref<Record<string, string>>({});
const availableActions = ref<string[]>([]);

const keyword = ref('');
const moduleFilter = ref('');
const typeFilter = ref<number | undefined>();

const canEditOrDelete = computed(() => auth.can('permission.edit', 'permission.delete'));

const modules = computed(() => [...new Set(flat.value.map((p) => p.module))]);

/** 扁平列表 + 父链，用于算缩进深度 */
const depthMap = computed(() => {
  const map = new Map<number, number>();
  const walk = (list: AdminPermission[], d: number) => {
    for (const p of list) {
      map.set(p.id, d);
      if (p.children?.length) walk(p.children, d + 1);
    }
  };
  walk(tree.value, 0);
  return map;
});

const parentOptions = computed(() => {
  const out: { id: number; label: string }[] = [];
  const walk = (list: AdminPermission[], d: number) => {
    for (const p of list) {
      if (p.type === 3) continue;
      out.push({ id: p.id, label: `${'　'.repeat(d)}${p.name}` });
      if (p.children?.length) walk(p.children, d + 1);
    }
  };
  walk(tree.value, 0);
  return out;
});

function depth(p: AdminPermission): number {
  return depthMap.value.get(p.id) ?? 0;
}

function typeClass(type: number): string {
  return type === 1 ? 'acc' : type === 2 ? 'warn' : 'info';
}

async function load() {
  loading.value = true;
  try {
    const res = await permissionApi.list({
      keyword: keyword.value || undefined,
      module: moduleFilter.value || undefined,
      type: typeFilter.value,
    });
    tree.value = res.tree;
    flat.value = res.flat;
    types.value = res.types;
    availableActions.value = res.actions;
  } catch (error) {
    ElMessage.error((error as Error).message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    ElMessage.success(`已复制 ${code}`);
  } catch {
    ElMessage.warning('复制失败，请手动选择文本');
  }
}

// ─────────── 单条编辑 ───────────
const dialogVisible = ref(false);
const editing = ref<AdminPermission | null>(null);
const formRef = ref<FormInstance>();

const form = reactive({
  parent_id: null as number | null,
  name: '',
  code: '',
  type: 3,
  sort: 0,
  remark: '',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入权限码', trigger: 'blur' },
    {
      pattern: /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/,
      message: '格式应为 模块.动作，如 user.create',
      trigger: 'blur',
    },
  ],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
};

function openCreate(parent?: AdminPermission) {
  editing.value = null;
  Object.assign(form, {
    parent_id: parent?.id ?? null,
    name: '',
    code: parent?.module ? `${parent.module}.` : '',
    type: 3,
    sort: 0,
    remark: '',
  });
  dialogVisible.value = true;
}

function openEdit(row: AdminPermission) {
  editing.value = row;
  Object.assign(form, {
    parent_id: row.parent_id,
    name: row.name,
    code: row.code,
    type: row.type,
    sort: row.sort,
    remark: row.remark ?? '',
  });
  dialogVisible.value = true;
}

async function submit() {
  if (!formRef.value) return;
  await formRef.value.validate();

  saving.value = true;
  try {
    if (editing.value) {
      await permissionApi.update(editing.value.id, { ...form });
      ElMessage.success('已更新');
    } else {
      await permissionApi.create({ ...form, module: form.code.split('.')[0] });
      ElMessage.success('已创建');
    }
    dialogVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function remove(row: AdminPermission) {
  try {
    await ElMessageBox.confirm(`确定删除权限「${row.name}」（${row.code}）？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }

  try {
    await permissionApi.delete(row.id);
    ElMessage.success('已删除');
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message || '删除失败');
  }
}

// ─────────── 批量生成 ───────────
const batchVisible = ref(false);
const batchRef = ref<FormInstance>();
const batchForm = reactive({
  module: '',
  module_name: '',
  actions: ['view', 'create', 'edit', 'delete'] as string[],
});

const batchRules: FormRules = {
  module: [
    { required: true, message: '请输入模块标识', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母开头，可含数字下划线', trigger: 'blur' },
  ],
  module_name: [{ required: true, message: '请输入模块名称', trigger: 'blur' }],
};

const batchPreview = computed(() =>
  batchForm.module && batchForm.actions.length
    ? [batchForm.module, ...batchForm.actions.map((a) => `${batchForm.module}.${a}`)]
    : [],
);

function openBatch() {
  batchForm.module = '';
  batchForm.module_name = '';
  batchForm.actions = ['view', 'create', 'edit', 'delete'];
  batchVisible.value = true;
}

async function submitBatch() {
  if (!batchRef.value) return;
  await batchRef.value.validate();

  saving.value = true;
  try {
    await permissionApi.batch({ ...batchForm });
    ElMessage.success('已生成');
    batchVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message || '生成失败');
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.num-th {
  text-align: right;
}
.ind {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.ind b {
  font-weight: 600;
}
.twig {
  color: var(--muted2);
}
.hint {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
  margin-top: 2px;
}
</style>