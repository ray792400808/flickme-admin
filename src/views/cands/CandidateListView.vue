<script setup lang="ts">
import PageHeading from '../../components/common/PageHeading.vue';
import StatePanel from '../../components/common/StatePanel.vue';
</script>

<template>
  <PageHeading title="AI 角色备选库" description="管理候选角色，人工确认后加入 Stories 角色库。" />

  <section class="card">
    <StatePanel title="候选角色列表" description="页面骨架已就绪，业务数据尚未接入。" />
  </section>
</template>
