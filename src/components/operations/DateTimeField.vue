<script setup lang="ts">
import { computed, useId } from 'vue';
import { ElDatePicker } from 'element-plus';
const model = defineModel<number | null>({ required: true });
defineProps<{ label: string; disabled?: boolean }>();
const id = useId();
const value = computed<Date | null>({
  get() {
    if (model.value == null) return null;
    const date = new Date(model.value * 1000);
    return Number.isFinite(date.getTime()) ? date : null;
  },
  set(date) {
    if (!date || !Number.isFinite(date.getTime())) {
      model.value = null;
      return;
    }
    const selected = new Date(date);
    selected.setSeconds(0, 0);
    model.value = Math.floor(selected.getTime() / 1000);
  },
});
</script>
<template>
  <div class="fld date-time-field">
    <label :for="id">{{ label }}</label>
    <ElDatePicker
      :id="id"
      v-model="value"
      type="datetime"
      format="YYYY-MM-DD HH:mm"
      time-format="HH:mm"
      placeholder="请选择日期和时间"
      :disabled="disabled"
      :teleported="false"
      :popper-options="{ strategy: 'fixed' }"
      clearable
      :show-footer="false"
      :show-confirm="false"
      :show-now="false"
    />
  </div>
</template>
<style scoped>
.date-time-field :deep(.el-date-editor.el-input) {
  width: 100%;
  height: 34px;
}
.date-time-field :deep(.el-input__wrapper) {
  border-radius: 8px;
  background: var(--surface);
}
.date-time-field :deep(.el-input__inner) {
  font-size: 13px;
}
</style>
