<script setup lang="ts">
import { reactive } from 'vue';
import { useTaskConfig } from '../../composables/useTaskConfig';
import TaskConfigStatus from '../../components/tasks/TaskConfigStatus.vue';
const c = reactive(useTaskConfig('watch'));
</script>
<template>
  <div class="op-page task-page">
    <div class="ph">
      <div>
        <h1>实时观看奖励</h1>
        <p>
          播放器里的 Watch to
          earn：边看边得，到账不需要领取。与累计观看任务共用有效播放时长（服务端上报，暂停、退出、切后台不计），两类奖励分开计算、各有上限。累计观看任务在任务配置中设置。
        </p>
      </div>
    </div>
    <TaskConfigStatus
      v-bind="c"
      :revision="c.document?.revision"
      :published-revision="c.document?.published_revision"
      :published-at="c.document?.published_at"
      @reload="c.load"
    />
    <form class="card" @submit.prevent="c.save">
      <p class="task-version sec">保存后立即生效，无需单独发布。本页只配置规则，不执行奖励入账。</p>
      <section class="sec">
        <h3>实时奖励</h3>
        <p>
          每看满一段时间立即得金币，计入 Bonus，有效期 12
          个月。每日上限只针对实时奖励，不含任务奖励。
        </p>
        <fieldset class="config-fields" :disabled="!c.editable">
          <label for="watch-sec"
            >每满(秒)<input
              id="watch-sec"
              v-model.number="c.draft.sec"
              class="in"
              type="number"
              min="1"
              max="86400"
              step="1"
              required /></label
          ><label for="watch-coins"
            >奖励金币<input
              id="watch-coins"
              v-model.number="c.draft.coins"
              class="in"
              type="number"
              min="1"
              max="1000000"
              step="1"
              required /></label
          ><label for="watch-cap"
            >每账号每日上限(金币)<input
              id="watch-cap"
              v-model.number="c.draft.cap"
              class="in"
              type="number"
              :min="c.draft.coins || 1"
              max="1000000"
              step="1"
              required
          /></label>
        </fieldset>
      </section>
      <div class="task-form-actions">
        <button class="btn" type="button" :disabled="!c.editable" @click="c.reset">还原</button
        ><button class="btn pri" :disabled="!c.canSave">保存并生效</button>
      </div>
    </form>
  </div>
</template>
