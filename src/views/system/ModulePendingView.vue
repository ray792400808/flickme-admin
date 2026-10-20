<script setup lang="ts">
import { useRoute } from 'vue-router';
import PageHeading from '../../components/common/PageHeading.vue';
import StatePanel from '../../components/common/StatePanel.vue';
const route = useRoute();
const development = import.meta.env.DEV;
</script>
<template>
  <PageHeading
    :title="String(route.meta.title || '业务模块')"
    description="此模块正在按正式业务流程逐步接入。"
  />
  <section class="card">
    <StatePanel
      kind="pending"
      title="业务接口尚未接入"
      description="当前不展示示例业务数据，也不会执行发布、审批、生成或余额调整。"
    >
      <RouterLink v-if="development" :to="'/preview/' + String(route.name || route.path.slice(1))"
        >查看开发原型参考</RouterLink
      >
    </StatePanel>
  </section>
</template>
