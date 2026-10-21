<template>
  <div v-if="total > 0" class="pager">
    <span>
      共 <b class="num">{{ total }}</b> 条 · 第 {{ from }}-{{ to }} 条
    </span>
    <span class="spacer" />
    <select v-model.number="sizeProxy" class="filter-select" style="min-width: 92px" aria-label="每页条数">
      <option v-for="s in pageSizes" :key="s" :value="s">{{ s }} 条/页</option>
    </select>
    <div class="nums">
      <button :disabled="page <= 1" aria-label="上一页" @click="go(page - 1)">‹</button>
      <button
        v-for="p in pages"
        :key="p"
        :class="{ on: p === page, gap: p === -1 }"
        :disabled="p === -1"
        :aria-current="p === page ? 'page' : undefined"
        @click="go(p)"
      >
        {{ p === -1 ? '…' : p }}
      </button>
      <button :disabled="page >= last" aria-label="下一页" @click="go(page + 1)">›</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    page: number;
    perPage: number;
    total: number;
    pageSizes?: number[];
  }>(),
  { pageSizes: () => [15, 30, 50, 100] },
);

const emit = defineEmits<{ 'update:page': [number]; 'update:perPage': [number] }>();

const last = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)));
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.perPage + 1));
const to = computed(() => Math.min(props.total, props.page * props.perPage));

/** 页码窗口：始终首尾，中间围绕当前页，最多 5 个 */
const pages = computed(() => {
  const n = last.value;
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);

  const out: number[] = [1];
  const start = Math.max(2, props.page - 1);
  const end = Math.min(n - 1, props.page + 1);
  if (start > 2) out.push(-1);
  for (let i = start; i <= end; i += 1) out.push(i);
  if (end < n - 1) out.push(-1);
  out.push(n);
  return out;
});

const sizeProxy = computed({
  get: () => props.perPage,
  set: (v: number) => emit('update:perPage', v),
});

function go(p: number) {
  if (p === -1 || p === props.page) return;
  if (p < 1 || p > last.value) return;
  emit('update:page', p);
}
</script>