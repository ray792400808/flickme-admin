<script setup lang="ts" generic="T extends { id: string | number }">
import StatePanel from './StatePanel.vue';
export interface TableColumn {
  key: string;
  label: string;
}
withDefaults(
  defineProps<{
    columns: TableColumn[];
    rows: T[];
    loading?: boolean;
    error?: string;
    emptyTitle?: string;
    emptyDescription?: string;
  }>(),
  { loading: false, error: '', emptyTitle: '暂无数据' },
);
defineEmits<{ retry: [] }>();
function cellValue(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key] ?? '—';
}
</script>
<template>
  <div class="native-table" :aria-busy="loading">
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" scope="col">{{ column.label }}</th>
          </tr>
        </thead>
        <tbody v-if="!loading && !error && rows.length">
          <tr v-for="row in rows" :key="row.id">
            <td v-for="column in columns" :key="column.key">
              <slot :name="column.key" :row="row">{{ cellValue(row, column.key) }}</slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <StatePanel v-if="loading" kind="loading" title="正在加载…" />
    <StatePanel v-else-if="error" kind="error" title="加载失败" :description="error"
      ><button @click="$emit('retry')">重新加载</button></StatePanel
    >
    <StatePanel v-else-if="!rows.length" :title="emptyTitle" :description="emptyDescription" />
  </div>
</template>
