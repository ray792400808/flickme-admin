<script setup lang="ts">
import ConfirmDialog from '../common/ConfirmDialog.vue';
defineProps<{
  busy: boolean;
  loading: boolean;
  loaded: boolean;
  enabled: boolean;
  editable: boolean;
  dirty: boolean;
  publishable: boolean;
  publishOpen: boolean;
  discardOpen: boolean;
  error: string;
  message: string;
  conflict: boolean;
  revision?: number;
  publishedRevision?: number | null;
}>();
defineEmits<{
  save: [];
  reset: [];
  refresh: [];
  publish: [];
  'update:publishOpen': [open: boolean];
  discard: [];
  cancelDiscard: [];
}>();
</script>
<template>
  <div class="config-status">
    <p v-if="!enabled" class="integration-notice">
      此模块接口尚未启用。后端按对接文档实现后再开启配置，不使用示例数据。
    </p>
    <p v-if="loaded">
      草稿版本 {{ revision }} · 已发布版本 {{ publishedRevision ?? '无'
      }}<span v-if="dirty"> · 有未保存修改</span>
    </p>
    <p v-if="loading" role="status">正在加载配置…</p>
    <p v-if="error" class="form-error" role="alert">
      {{ error }}<span v-if="conflict"> 配置已被其他人修改，请重新加载后核对。</span>
    </p>
    <p v-if="message" role="status">{{ message }}</p>
    <div class="page-actions">
      <button :disabled="!enabled || busy || loading" @click="$emit('refresh')">重新加载</button
      ><button :disabled="!editable || !dirty" @click="$emit('reset')">撤销修改</button
      ><button :disabled="!editable || !dirty" @click="$emit('save')">保存草稿</button
      ><button class="primary" :disabled="!publishable" @click="$emit('update:publishOpen', true)">
        发布配置
      </button>
    </div>
  </div>
  <ConfirmDialog
    :open="publishOpen"
    :error="error"
    title="确认发布配置"
    message="仅发布已保存的草稿，发布结果及客户端缓存生效时间以服务端返回为准。"
    :busy="busy"
    @confirm="$emit('publish')"
    @cancel="$emit('update:publishOpen', false)"
  /><ConfirmDialog
    :open="discardOpen"
    title="放弃未保存修改？"
    message="仅放弃当前页面的未保存修改，已保存草稿不受影响。"
    confirm-label="放弃修改"
    @confirm="$emit('discard')"
    @cancel="$emit('cancelDiscard')"
  />
</template>
