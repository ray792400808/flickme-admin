<template>
  <el-drawer
    v-model="dialogVisible"
    :title="isEdit ? '编辑菜单' : '新增菜单'"
    :size="520"
    direction="rtl"
    class="admin-drawer"
    :show-close="false"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <template #header="{ close }">
      <div class="drawer-head">
        <div>
          <h2>{{ isEdit ? '编辑菜单' : '新增菜单' }}</h2>
          <p>{{ isEdit ? `ID ${menu?.id}` : '菜单决定侧边栏结构与路由映射' }}</p>
        </div>
        <button class="drawer-close" type="button" aria-label="关闭" @click="close">×</button>
      </div>
    </template>

    <el-form ref="formRef" :model="formData" :rules="rules" label-position="top" class="drawer-form">
      <el-form-item label="上级菜单">
        <el-input :model-value="parentMenu?.title || '顶级菜单'" disabled />
      </el-form-item>

      <div class="row2">
        <el-form-item label="菜单标题" prop="title">
          <el-input v-model="formData.title" placeholder="请输入菜单标题" maxlength="50" />
        </el-form-item>

        <el-form-item label="路由名称" prop="name">
          <el-input v-model="formData.name" placeholder="如 SystemUsers" />
        </el-form-item>
      </div>

      <el-form-item label="路由路径" prop="path">
        <el-input v-model="formData.path" placeholder="如 /system/users" />
        <div class="hint">
          一级菜单以 <span class="code">/</span> 开头，二级菜单为相对路径，如
          <span class="code">/system</span>
        </div>
      </el-form-item>

      <el-form-item label="组件路径" prop="component">
        <el-input v-model="formData.component" placeholder="如 /system/users/index" />
        <div class="hint">相对 <span class="code">src/views</span> 的组件文件路径，省略 .vue 后缀</div>
      </el-form-item>

      <div class="row2">
        <el-form-item label="图标">
          <el-input v-model="formData.icon" placeholder="Element Plus 图标名，如 User" />
        </el-form-item>

        <el-form-item label="排序">
          <el-input-number v-model="formData.sort" :min="0" :max="9999" :controls="false" />
        </el-form-item>
      </div>

      <el-form-item label="重定向">
        <el-input v-model="formData.redirect" placeholder="如 /dashboard" />
      </el-form-item>

      <el-form-item label="隐藏菜单">
        <el-switch v-model="formData.is_hidden" />
        <div class="hint">隐藏后不在侧边栏显示，但路由仍可访问</div>
      </el-form-item>

      <el-form-item label="固定标签">
        <el-switch v-model="formData.is_affix" />
        <div class="hint">开启后该标签页在多页签中不可关闭</div>
      </el-form-item>

      <el-form-item label="缓存页面">
        <el-switch v-model="formData.is_keep_alive" />
        <div class="hint">开启后缓存页面状态，切换回来保留滚动位置</div>
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
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { menuApi } from '../../../../api/admin';
import type { Menu } from '../../../../types/auth';

const props = defineProps<{
  modelValue: boolean;
  menu: Menu | null;
  parentMenu: Menu | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'success'): void;
}>();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isEdit = computed(() => !!props.menu?.id);

const formRef = ref<FormInstance>();
const saving = ref(false);

const formData = ref({
  parent_id: null as number | null,
  title: '',
  path: '',
  name: '',
  component: '',
  icon: '',
  sort: 0,
  redirect: '',
  is_hidden: false,
  is_affix: false,
  is_keep_alive: true,
});

const rules: FormRules = {
  title: [{ required: true, message: '请输入菜单标题', trigger: 'blur' }],
  path: [
    { required: true, message: '请输入路由路径', trigger: 'blur' },
    { pattern: /^\/[a-zA-Z0-9\-_/]*$/, message: '必须以 / 开头，仅允许字母、数字、- _ 和 /', trigger: 'blur' },
  ],
};

watch(
  () => props.menu,
  (menu) => {
    if (menu) {
      formData.value = {
        parent_id: menu.parent_id,
        title: menu.title,
        path: menu.path,
        name: menu.name ?? '',
        component: menu.component ?? '',
        icon: menu.icon ?? '',
        sort: menu.sort ?? 0,
        redirect: menu.redirect ?? '',
        is_hidden: menu.is_hidden ?? false,
        is_affix: menu.is_affix ?? false,
        is_keep_alive: menu.is_keep_alive !== false,
      };
    } else {
      formData.value = {
        parent_id: props.parentMenu?.id ?? null,
        title: '',
        path: '',
        name: '',
        component: '',
        icon: '',
        sort: 0,
        redirect: '',
        is_hidden: false,
        is_affix: false,
        is_keep_alive: true,
      };
    }
    formRef.value?.clearValidate();
  },
  { immediate: true },
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
    const data: Record<string, unknown> = { ...formData.value };
    if (!data.parent_id) delete data.parent_id;

    if (isEdit.value && props.menu) {
      await menuApi.update(props.menu.id, data);
      ElMessage.success('菜单已更新，请重新登录以刷新侧边栏');
    } else {
      await menuApi.create(data as never);
      ElMessage.success('菜单已创建');
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
.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.hint {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
  margin-top: 4px;
}
</style>