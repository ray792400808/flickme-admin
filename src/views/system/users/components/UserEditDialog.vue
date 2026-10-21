<template>
  <el-drawer
    v-model="dialogVisible"
    :title="isEdit ? '编辑账户' : '新增账户'"
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
          <h2>{{ isEdit ? '编辑账户' : '新增账户' }}</h2>
          <p>{{ isEdit ? `ID ${user?.id}` : '后台账户与角色分配' }}</p>
        </div>
        <button class="drawer-close" type="button" aria-label="关闭" @click="close">×</button>
      </div>
    </template>

    <el-form ref="formRef" :model="formData" :rules="rules" label-position="top" class="drawer-form">
      <el-form-item label="姓名" prop="name">
        <el-input v-model="formData.name" placeholder="请输入姓名" maxlength="50" />
      </el-form-item>

      <el-form-item label="邮箱" prop="email">
        <el-input v-model="formData.email" placeholder="请输入邮箱" :disabled="isEdit" />
      </el-form-item>

      <el-form-item label="密码" :prop="isEdit ? '' : 'password'">
        <el-input
          v-model="formData.password"
          type="password"
          :placeholder="isEdit ? '留空则不修改' : '请输入密码'"
          show-password
        />
        <div v-if="isEdit" class="hint">留空表示不修改该账号密码</div>
      </el-form-item>

      <el-form-item label="角色" prop="role_ids">
        <el-select v-model="formData.role_ids" multiple placeholder="请选择角色" style="width: 100%">
          <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
        </el-select>
        <div class="hint">可多选，账号权限由所选角色的并集决定</div>
      </el-form-item>

      <el-form-item label="状态" prop="status">
        <el-switch v-model="formData.status" active-text="启用" inactive-text="停用" />
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
import { userApi } from '../../../../api/admin';
import type { AdminUser, Role } from '../../../../types/auth';

const props = defineProps<{
  modelValue: boolean;
  user: AdminUser | null;
  roles: Role[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'success'): void;
}>();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isEdit = computed(() => !!props.user?.id);

const formRef = ref<FormInstance>();
const saving = ref(false);

const formData = ref({
  name: '',
  email: '',
  password: '',
  role_ids: [] as number[],
  status: true,
});

// 新增时密码必填，编辑时留空表示不修改
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: isEdit.value
    ? [{ min: 8, max: 64, message: '密码长度 8-64 位', trigger: 'blur' }]
    : [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 8, max: 64, message: '密码长度 8-64 位', trigger: 'blur' },
      ],
  role_ids: [
    { required: true, type: 'array', min: 1, message: '请至少选择一个角色', trigger: 'change' },
  ],
}));

watch(
  () => props.user,
  (user) => {
    if (user) {
      formData.value = {
        name: user.name,
        email: user.email,
        password: '',
        role_ids: user.roles?.map((r) => r.id) ?? [],
        status: user.status,
      };
    } else {
      formData.value = { name: '', email: '', password: '', role_ids: [], status: true };
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
    if (isEdit.value && props.user) {
      const updateData: Record<string, unknown> = {
        name: formData.value.name,
        role_ids: formData.value.role_ids,
        status: formData.value.status,
      };
      // 密码留空表示不修改
      if (formData.value.password) updateData.password = formData.value.password;
      await userApi.update(props.user.id, updateData);
      ElMessage.success('账户已更新');
    } else {
      await userApi.create({
        name: formData.value.name,
        email: formData.value.email,
        password: formData.value.password,
        role_ids: formData.value.role_ids,
        status: formData.value.status,
      });
      ElMessage.success('账户已创建');
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
.hint {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
  margin-top: 4px;
}
</style>