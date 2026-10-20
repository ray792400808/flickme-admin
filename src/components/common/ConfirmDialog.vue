<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
const props = defineProps<{
  open: boolean;
  title: string;
  message?: string;
  requireReason?: boolean;
  confirmLabel?: string;
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
      @cancel.prevent="emit('cancel')"
      @click="
        (event) => {
          if (event.target === dialog) emit('cancel');
        }
      "
    >
      <form @submit.prevent="emit('confirm', reason.trim())">
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
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
          <button type="button" @click="emit('cancel')">取消</button
          ><button class="primary" :disabled="requireReason && !reason.trim()">
            {{ confirmLabel || '确认' }}
          </button>
        </footer>
      </form>
    </dialog></Teleport
  >
</template>
