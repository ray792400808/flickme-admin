<script setup lang="ts" generic="T extends { id: string | number }">
import { computed } from 'vue';
const search = defineModel<string>('search', { default: '' });
const props = withDefaults(
  defineProps<{
    columns: { key: string; label: string }[];
    rows: T[];
    total: number;
    page: number;
    pageSize?: number;
    loading?: boolean;
    disabled?: boolean;
    clickable?: boolean;
    error?: string;
  }>(),
  { pageSize: 8, loading: false, disabled: false, clickable: false, error: '' },
);
defineEmits<{ open: [row: T]; search: []; page: [page: number]; retry: [] }>();
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const numbers = computed(() =>
  Array.from(
    { length: Math.min(pages.value, 7) },
    (_, index) => Math.max(1, Math.min(props.page - 3, pages.value - 6)) + index,
  ),
);
function value(row: T, key: string) {
  return (row as Record<string, unknown>)[key] ?? '—';
}
</script>
<template>
  <div class="card">
    <div class="tb">
      <input
        v-model="search"
        type="search"
        placeholder="搜索"
        aria-label="搜索"
        :disabled="disabled"
        @input="$emit('search')"
        @keydown.enter="$emit('search')"
      /><slot name="filters" /><span class="n">共 {{ total }} 条</span>
    </div>
    <div class="tw">
      <table>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length" class="empty">正在加载…</td>
          </tr>
          <tr v-else-if="error">
            <td :colspan="columns.length" class="empty" role="alert">
              {{ error }} <button class="btn sm" @click="$emit('retry')">重试</button>
            </td>
          </tr>
          <template v-else
            ><tr
              v-for="row in rows"
              :key="row.id"
              :class="{ rw: clickable }"
              :tabindex="clickable ? 0 : undefined"
              @click="clickable && $emit('open', row)"
              @keydown.enter.self="clickable && $emit('open', row)"
            >
              <td v-for="column in columns" :key="column.key">
                <slot :name="column.key" :row="row">{{ value(row, column.key) }}</slot>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td :colspan="columns.length" class="empty">没有符合条件的记录</td>
            </tr></template
          >
        </tbody>
      </table>
    </div>
    <div class="pg">
      <span>共 {{ total }} 条 · 第 {{ page }} / {{ pages }} 页</span
      ><button
        :disabled="disabled || loading || page <= 1"
        aria-label="上一页"
        @click="$emit('page', page - 1)"
      >
        ‹</button
      ><button
        v-for="number in numbers"
        :key="number"
        :class="{ on: number === page }"
        :disabled="disabled || loading"
        @click="$emit('page', number)"
      >
        {{ number }}</button
      ><button
        :disabled="disabled || loading || page >= pages"
        aria-label="下一页"
        @click="$emit('page', page + 1)"
      >
        ›
      </button>
    </div>
  </div>
</template>
