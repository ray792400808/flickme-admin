<template>
  <el-drawer
    v-model="dialogVisible"
    title="重置密码"
    :size="420"
    direction="rtl"
    class="admin-drawer"
    :show-close="false"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <template #header="{ close }">
      <div class="drawer-head">
        <div>
          <h2>重置密码</h2>
          <p>{{ user?.name }} · {{ user?.email }}</p>
        </div>
        <button class="drawer-close" type="button" aria-label="关闭" @click="close">×</button>
      </div>
    </template>

    <el-form ref="formRef" :model="formData" :rules="rules" label-position="top" class="drawer-form">
      <div class="banner warn">重置后原密码立即失效，请提醒该用户尽快登录并修改密码。</div>

      <el-form-item label="账号">
        <el-input :model-value="user?.name" disabled />
      </el-form-item>

      <el-form-item label="新密码" prop="new_password">
        <el-input
          v-model="formData.new_password"
          type="password"
          placeholder="请输入新密码"
          show-password
        />
      </el-form-item>

      <el-form-item label="确认密码" prop="confirm_password">
        <el-input
          v-model="formData.confirm_password"
          type="password"
          placeholder="请再次输入新密码"
          show-password
        />
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
import type { AdminUser } from '../../../../types/auth';

const props = defineProps<{
  modelValue: boolean;
  user: AdminUser | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'success'): void;
}>();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const formRef = ref<FormInstance>();
const saving = ref(false);

const formData = ref({
  new_password: '',
  confirm_password: '',
});

const validatePassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    callback(new Error('请再次输入新密码'));
  } else if (value !== formData.value.new_password) {
    callback(new Error('两次输入的密码不一致'));
  } else {
    callback();
  }
};

const rules: FormRules = {
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, max: 64, message: '密码长度 8-64 位', trigger: 'blur' },
  ],
  confirm_password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
};

watch(
  () => props.user,
  () => resetForm(),
);

function resetForm() {
  formData.value = { new_password: '', confirm_password: '' };
  formRef.value?.clearValidate();
}

function handleClose() {
  resetForm();
  dialogVisible.value = false;
}

async function handleSubmit() {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  if (!props.user) return;

  saving.value = true;
  try {
    await userApi.resetPassword(props.user.id, { password: formData.value.new_password });
    ElMessage.success('密码已重置，请提醒用户尽快登录修改');
    emit('success');
    handleClose();
  } catch (error) {
    ElMessage.error((error as Error).message || '重置失败');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.banner.warn {
  display: block;
  margin-bottom: 14px;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 12.5px;
  padding: 10px 14px;
  border-radius: 10px;
  line-height: 1.6;
}
</style>