<script setup lang="ts">
import ConfirmDialog from '../common/ConfirmDialog.vue';
defineProps<{
  preview: boolean;
  enabled: boolean;
  loading: boolean;
  error: string;
  message: string;
  busy: boolean;
  publishOpen: boolean;
  dirty: boolean;
  revision?: number;
  publishedRevision?: number | null;
  conflict: boolean;
}>();
defineEmits<{ publish: []; cancel: []; reload: [] }>();
</script>
<template>
  <p v-if="preview" class="banner warn">
    原型预览：当前为示例配置，修改仅用于本页预览，不能保存或发布。
  </p>
  <p v-else-if="!enabled" class="banner warn">业务接口尚未接入，操作暂不可用。</p>
  <p v-if="loading" class="banner" role="status">正在加载配置…</p>
  <p v-if="error" class="banner bad" role="alert">
    {{ error }}
    <button class="btn sm" :disabled="busy || loading" @click="$emit('reload')">重新加载</button>
  </p>
  <p v-if="conflict" class="banner warn">配置已被其他管理员更新，请重新加载后再编辑。</p>
  <p v-if="message" class="banner good" role="status">{{ message }}</p>
  <p v-if="dirty" class="banner warn">
    有未保存的修改{{ preview ? '（仅预览）' : '，线上配置尚未改变' }}。
  </p>
  <p v-if="revision !== undefined" class="task-version">
    草稿 v{{ revision }} · 线上 {{ publishedRevision == null ? '未发布' : 'v' + publishedRevision }}
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
