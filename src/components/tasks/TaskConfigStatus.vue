<script setup lang="ts">
import ConfirmDialog from '../common/ConfirmDialog.vue';
defineProps<{
  canRead: boolean;
  enabled: boolean;
  loading: boolean;
  error: string;
  message: string;
  busy: boolean;
  publishOpen: boolean;
  dirty: boolean;
  revision?: number;
  publishedRevision?: number | null;
  publishedAt?: number | null;
  conflict: boolean;
}>();
defineEmits<{ publish: []; cancel: []; reload: [] }>();
</script>
<template>
  <p v-if="!enabled" class="banner warn">业务接口已关闭，操作暂不可用。</p>
  <p v-else-if="!canRead" class="banner bad" role="alert">没有查看激励任务配置的权限。</p>
  <p v-if="loading" class="banner" role="status">正在加载配置…</p>
  <p v-if="error" class="banner bad" role="alert">
    {{ error }}
    <button class="btn sm" :disabled="busy || loading" @click="$emit('reload')">重新加载</button>
  </p>
  <p v-if="conflict" class="banner warn">当前版本或请求结果需要核实，请重新加载后再编辑。</p>
  <p v-if="message" class="banner good" role="status">{{ message }}</p>
  <p v-if="dirty" class="banner warn">有未保存的修改，线上配置尚未改变。</p>
  <p v-if="revision !== undefined" class="task-version">
    草稿 v{{ revision }} · 线上 {{ publishedRevision == null ? '未发布' : 'v' + publishedRevision }}
    <span
      v-if="
        publishedRevision !== null &&
        publishedRevision !== undefined &&
        revision !== publishedRevision
      "
    >
      · 有未发布草稿</span
    >
    <span v-else-if="publishedRevision !== null && publishedRevision !== undefined">
      · 当前版本已发布</span
    >
    <span v-if="publishedAt != null">
      · 发布于 {{ new Date(publishedAt * 1000).toLocaleString('zh-CN') }}</span
    >
  </p>
  <ConfirmDialog
    :open="publishOpen"
    title="发布奖励配置"
    message="确认发布已保存的草稿？生效时间以服务端为准。"
    confirm-label="发布"
    :busy="busy"
    :error="error"
    @confirm="$emit('publish')"
    @cancel="$emit('cancel')"
  />
</template>
