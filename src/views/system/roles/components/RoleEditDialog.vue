<template>
  <el-drawer
    v-model="dialogVisible"
    :title="isEdit ? '编辑角色' : '新增角色'"
    :size="480"
    direction="rtl"
    class="admin-drawer"
    :show-close="false"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <template #header="{ close }">
      <div class="drawer-head">
        <div>
          <h2>{{ isEdit ? '编辑角色' : '新增角色' }}</h2>
          <p>{{ isEdit ? `ID ${role?.id}` : '角色决定菜单可见范围与按钮级权限' }}</p>
        </div>
        <button class="drawer-close" type="button" aria-label="关闭" @click="close">×</button>
      </div>
    </template>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="drawer-form">
      <div class="row2">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入角色名称" maxlength="50" />
        </el-form-item>

        <el-form-item label="角色标识" prop="slug">
          <el-input v-model="form.slug" placeholder="如operator" :disabled="isSuperAdmin" />
        </el-form-item>
      </div>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          maxlength="255"
          placeholder="简要说明该角色的职责范围"
        />
      </el-form-item>

      <el-form-item label="状态">
        <el-switch
          v-model="form.status"
          :disabled="isSuperAdmin"
          active-text="启用"
          inactive-text="停用"
        />
      </el-form-item>

      <el-form-item label="权限分配">
        <template #label>
          <div class="field-label">
            <span>权限分配</span>
            <span class="counter">已选 {{ checkedCount }} 项</span>
          </div>
        </template>

        <div v-if="isSuperAdmin" class="banner warn">
          超级管理员始终拥有全部权限，此处配置不会生效。
        </div>

        <div class="perm-toolbar">
          <el-checkbox v-model="expandAll" @change="toggleExpand">展开 / 收起</el-checkbox>
          <el-checkbox v-model="checkAll" @change="toggleAll">全选 / 清空</el-checkbox>
        </div>

        <div class="perm-tree-wrap">
          <el-tree
            ref="treeRef"
            :data="permissionTree"
            :props="{ children: 'children', label: 'name' }"
            node-key="id"
            show-checkbox
            :default-expand-all="expandAll"
            :expand-on-click-node="false"
          >
            <template #default="{ data }">
              <span class="node">
                <span>{{ data.name }}</span>
                <span class="pill" :class="typeClass(data.type)">{{ data.type_label }}</span>
                <code class="node-code">{{ data.code }}</code>
              </span>
            </template>
          </el-tree>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="drawer-foot">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">确定</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules, TreeInstance } from 'element-plus';
import type { AdminPermission } from '../../../../types/auth';
import { roleApi, permissionApi } from '../../../../api/admin';
import type { Role } from '../../../../types/auth';

const props = defineProps<{ modelValue: boolean; role: Role | null }>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'success'): void;
}>();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const isEdit = computed(() => !!props.role?.id);
const isSuperAdmin = computed(() => props.role?.slug === 'super_admin');

const formRef = ref<FormInstance>();
const treeRef = ref<TreeInstance>();
const saving = ref(false);
const loadingPerms = ref(false);

const permissionTree = ref<AdminPermission[]>([]);
const expandAll = ref(true);
const checkAll = ref(false);
const checkedCount = ref(0);

const form = reactive({
  name: '',
  slug: '',
  description: '',
  status: true,
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  slug: [
    { required: true, message: '请输入角色标识', trigger: 'blur' },
    {
      pattern: /^[a-z][a-z0-9_]*$/,
      message: '标识只能包含小写字母、数字和下划线，且以字母开头',
      trigger: 'blur',
    },
  ],
};

/** 权限类型对应徽标样式：1=模块 2=动作 3=接口 */
function typeClass(type: number): string {
  return type === 1 ? 'acc' : type === 2 ? 'warn' : 'info';
}

/** 权限树首次打开时加载，之后复用缓存 */
async function loadPermissions() {
  if (permissionTree.value.length) return;
  loadingPerms.value = true;
  try {
    const res = await permissionApi.list();
    permissionTree.value = res.tree;
  } catch (error) {
    ElMessage.error((error as Error).message || '权限列表加载失败');
  } finally {
    loadingPerms.value = false;
  }
}

/** 含半选父节点，保证后端拿到完整路径上的权限 */
function collectIds(): number[] {
  const checked = treeRef.value?.getCheckedKeys(false) ?? [];
  const half = treeRef.value?.getHalfCheckedKeys() ?? [];
  return [...new Set([...checked, ...half])] as number[];
}

function syncCount() {
  checkedCount.value = (treeRef.value?.getCheckedKeys(false) ?? []).length;
}

function toggleExpand(val: boolean | string | number) {
  const nodes = treeRef.value?.store?.nodesMap ?? {};
  for (const key of Object.keys(nodes)) {
    (nodes[key] as { expanded: boolean }).expanded = Boolean(val);
  }
}

function toggleAll(val: boolean | string | number) {
  if (val) {
    const all: number[] = [];
    const walk = (list: AdminPermission[]) => {
      list.forEach((n) => {
        all.push(n.id);
        if (n.children?.length) walk(n.children);
      });
    };
    walk(permissionTree.value);
    treeRef.value?.setCheckedKeys(all);
  } else {
    treeRef.value?.setCheckedKeys([]);
  }
  syncCount();
}

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    await loadPermissions();

    if (props.role) {
      Object.assign(form, {
        name: props.role.name,
        slug: props.role.slug,
        description: props.role.description ?? '',
        status: props.role.status,
      });

      try {
        const detail = await roleApi.show(props.role.id);
        await nextTick();
        treeRef.value?.setCheckedKeys(detail.permission_ids ?? []);
        syncCount();
      } catch (error) {
        ElMessage.error((error as Error).message || '角色详情加载失败');
      }
    } else {
      Object.assign(form, { name: '', slug: '', description: '', status: true });
      await nextTick();
      treeRef.value?.setCheckedKeys([]);
      syncCount();
    }
  },
);

function handleClose() {
  formRef.value?.clearValidate();
  dialogVisible.value = false;
}

async function handleSubmit() {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      status: form.status,
      permission_ids: isSuperAdmin.value ? undefined : collectIds(),
    };

    if (isEdit.value && props.role) {
      await roleApi.update(props.role.id, payload);
      ElMessage.success('角色已更新');
    } else {
      await roleApi.create(payload);
      ElMessage.success('角色已创建');
    }
    emit('success');
    handleClose();
  } catch (error) {
    ElMessage.error((error as Error).message || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.drawer-form :deep(.el-form-item) {
  margin-bottom: 18px;
}
.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.counter {
  color: var(--muted);
  font-size: 12px;
}
.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.banner.warn {
  display: block;
  margin-bottom: 10px;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 12.5px;
  padding: 10px 14px;
  border-radius: 10px;
  line-height: 1.6;
}
.perm-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 13px;
}
.perm-tree-wrap {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 8px;
  max-height: 300px;
  overflow: auto;
}
.node {
  display: flex;
  align-items: center;
  gap: 8px;
}
.node-code {
  font-size: 11.5px;
  color: var(--muted);
  font-family: var(--mono);
}
</style>