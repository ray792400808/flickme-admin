<script setup lang="ts">
import PageHeading from '../common/PageHeading.vue';
import StatePanel from '../common/StatePanel.vue';
defineProps<{ title: string; description: string }>();
</script>

<template>
  <div>
    <PageHeading :title="title" :description="description" />
    <section class="card">
      <StatePanel
        kind="pending"
        title="功能待接入"
        description="奖励规则和业务接口接入后，可在此配置和管理。"
      />
    </section>
  </div>
</template>
