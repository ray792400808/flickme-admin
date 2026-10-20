<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
const props = defineProps<{
  open: boolean;
  title: string;
  message?: string;
  requireReason?: boolean;
  confirmLabel?: string;
  busy?: boolean;
  error?: string;
}>();
const emit = defineEmits<{ confirm: [reason: string]; cancel: [] }>();
const dialog = ref<HTMLDialogElement>();
const reason = ref('');
watch(
  () => props.open,
  async (open) => {
    await nextTick();
    if (open) {
      reason.value = '';
      dialog.value?.showModal();
    } else dialog.value?.close();
  },
);
</script>
<template>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      class="confirm-dialog"
      @cancel.prevent="!busy && emit('cancel')"
      @click="
        (event) => {
          if (event.target === dialog && !busy) emit('cancel');
        }
      "
    >
      <form @submit.prevent="!busy && emit('confirm', reason.trim())">
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <label v-if="requireReason"
          >原因<textarea
            v-model="reason"
            required
            maxlength="500"
            rows="4"
            placeholder="请输入原因，最多 500 字"
          />
        </label>
        <footer>
          <button type="button" :disabled="busy" @click="emit('cancel')">取消</button
          ><button class="primary" :disabled="busy || (requireReason && !reason.trim())">
            {{ busy ? '处理中…' : confirmLabel || '确认' }}
          </button>
        </footer>
      </form>
    </dialog></Teleport
  >
</template>
