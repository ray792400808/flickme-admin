<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useTaskConfig } from '../../composables/useTaskConfig';
import { nonnegative, type CheckinReward } from '../../types/tasks';
import TaskConfigStatus from '../../components/tasks/TaskConfigStatus.vue';
import FormDrawer from '../../components/common/FormDrawer.vue';
const c = reactive(useTaskConfig('checkin'));
const search = ref(''),
  open = ref(false),
  error = ref('');
const row = ref<CheckinReward>({ id: '', day: '', reward: 0 });
watch(open, (value) => {
  c.localEditing = value;
});
const rows = computed(() =>
  c.draft.filter((r) => r.day.toLowerCase().includes(search.value.toLowerCase())),
);
function edit(value: CheckinReward) {
  row.value = { ...value };
  error.value = '';
  open.value = true;
}
function apply() {
  if (!c.editable) return;
  if (!nonnegative(row.value.reward) || row.value.reward > 1000000) {
    error.value = '奖励金币必须为 0～1,000,000 的整数';
    return;
  }
  const index = c.draft.findIndex((r) => r.id === row.value.id);
  if (index >= 0) c.draft[index] = { ...row.value };
  open.value = false;
}
</script>
<template>
  <div class="op-page task-page">
    <div class="ph">
      <div>
        <h1>签到奖励</h1>
        <p>7 天一轮，断签后从 Day 1 重新开始。奖励计入 Bonus。</p>
      </div>
      <div class="act">
        <button class="btn" :disabled="!c.canSave" @click="c.save">保存草稿</button
        ><button class="btn pri" :disabled="!c.canPublish" @click="c.publishOpen = true">
          发布
        </button>
      </div>
    </div>
    <TaskConfigStatus
      v-bind="c"
      :revision="c.document?.revision"
      :published-revision="c.document?.published_revision"
      :published-at="c.document?.published_at"
      @publish="c.publish"
      @cancel="c.publishOpen = false"
      @reload="c.load"
    />
    <div class="card">
      <div class="tb">
        <input v-model="search" type="search" placeholder="搜索天数" aria-label="搜索天数" /><span
          class="n"
          >共 {{ rows.length }} 条</span
        >
      </div>
      <div class="tw">
        <table>
          <thead>
            <tr>
              <th>天数</th>
              <th>奖励(Bonus)</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in rows" :key="item.id">
              <td>{{ item.day }}</td>
              <td class="num">+{{ item.reward }}</td>
              <td>
                <button class="btn sm" :disabled="!c.editable" @click="edit(item)">编辑</button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="3" class="empty">没有符合条件的记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <FormDrawer
      reference
      :open="open"
      title="编辑签到奖励"
      :subtitle="row.day"
      @close="open = false"
      ><form id="checkin-form" class="op-form" @submit.prevent="apply">
        <div class="fld">
          <label for="checkin-day">天数</label
          ><input id="checkin-day" class="in" :value="row.day" readonly />
        </div>
        <div class="fld">
          <label for="checkin-reward">奖励金币</label
          ><input
            id="checkin-reward"
            v-model.number="row.reward"
            class="in"
            type="number"
            min="0"
            max="1000000"
            step="1"
            required
          />
        </div>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      </form>
      <template #footer
        ><button class="btn" @click="open = false">取消</button
        ><button class="btn pri" form="checkin-form" :disabled="!c.editable">
          应用到草稿
        </button></template
      ></FormDrawer
    >
  </div>
</template>
