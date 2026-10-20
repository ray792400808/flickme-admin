<script setup lang="ts">
import { computed } from 'vue';
const props = withDefaults(
  defineProps<{ page: number; total: number; pageSize: number; disabled?: boolean }>(),
  { disabled: false },
);
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
defineEmits<{ change: [page: number] }>();
</script>
<template>
  <nav class="pagination-bar" aria-label="列表分页">
    <span>共 {{ total }} 条 · 第 {{ page }} / {{ pages }} 页</span>
    <button :disabled="disabled || page <= 1" @click="$emit('change', page - 1)">上一页</button>
    <button :disabled="disabled || page >= pages" @click="$emit('change', page + 1)">下一页</button>
  </nav>
</template>
