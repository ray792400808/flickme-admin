<script setup lang="ts">
import ConfirmDialog from '../common/ConfirmDialog.vue';
defineProps<{
  enabled: boolean;
  loading: boolean;
  error: string;
  message: string;
  busy: boolean;
  discardOpen: boolean;
  publishOpen: boolean;
}>();
defineEmits<{ discard: []; cancelDiscard: []; publish: []; cancelPublish: [] }>();
</script>
<template>
  <p v-if="!enabled" class="banner warn">业务接口尚未接入，操作暂不可用。</p>
  <p v-if="loading" class="banner" role="status">正在加载配置…</p>
  <p v-if="error" class="banner warn" role="alert">{{ error }}</p>
  <div v-if="message" class="op-toast" role="status">{{ message }}</div>
  <ConfirmDialog
    :open="discardOpen"
    title="放弃未保存修改？"
    message="当前未保存的修改将被放弃。"
    confirm-label="放弃修改"
    @confirm="$emit('discard')"
    @cancel="$emit('cancelDiscard')"
  /><ConfirmDialog
    :open="publishOpen"
    title="发布分类配置"
    message="将发布当前分类到线上，客户端在缓存到期后生效。"
    confirm-label="发布"
    :busy="busy"
    :error="error"
    @confirm="$emit('publish')"
    @cancel="$emit('cancelPublish')"
  />
</template>
