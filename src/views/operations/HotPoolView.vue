<script setup lang="ts">
import { reactive } from 'vue';
import { useOperationsConfig } from '../../composables/useOperationsConfig';
import ConfigFeedback from '../../components/operations/ConfigFeedback.vue';
import ToggleSwitch from '../../components/operations/ToggleSwitch.vue';
const c = reactive(
  useOperationsConfig('hot', () => ({
    pool_size: 50,
    refresh_hours: 1,
    short_count: 9,
    stories_count: 8,
    page_size: 20,
    overrides: [],
  })),
);
async function publish() {
  if (await c.persist(true)) c.message = '已发布';
}
</script>
<template>
  <div class="op-page">
    <div class="ph">
      <div>
        <h1>热门池与排序</h1>
        <p>
          决定 Short 热门区、Stories Explore 与分类 Feed 的数据来源。Explore
          为跨题材随机,从热门池取样,会话内稳定。
        </p>
      </div>
    </div>
    <ConfigFeedback
      :enabled="c.enabled"
      :loading="c.loading"
      :error="c.error"
      :message="c.message"
      :busy="c.busy"
      :discard-open="c.discardOpen"
      :publish-open="c.publishOpen"
      @discard="c.confirmDiscard"
      @cancel-discard="c.cancelDiscard"
      @publish="publish"
      @cancel-publish="c.publishOpen = false"
    />
    <div class="card">
      <div class="sec">
        <h3>热门池</h3>
        <p>热度由播放量、完播、新增追剧综合计算。</p>
        <div class="fg2">
          <div class="fld">
            <label>热门池大小 TopN</label
            ><input
              v-model.number="c.draft.pool_size"
              class="in"
              aria-label="热门池大小 TopN"
              type="number"
              :disabled="!c.editable"
            />
          </div>
          <div class="fld">
            <label>刷新周期</label
            ><select
              v-model.number="c.draft.refresh_hours"
              class="in"
              aria-label="刷新周期"
              :disabled="!c.editable"
            >
              <option :value="1">每小时</option>
              <option :value="6">每 6 小时</option>
              <option :value="24">每天</option>
            </select>
          </div>
          <div class="fld">
            <label>For you 热门区数量(3 列)</label
            ><input
              v-model.number="c.draft.short_count"
              class="in"
              aria-label="For you 热门区数量(3 列)"
              type="number"
              :disabled="!c.editable"
            />
          </div>
          <div class="fld">
            <label>Stories 横滑行数量</label
            ><input
              v-model.number="c.draft.stories_count"
              class="in"
              aria-label="Stories 横滑行数量"
              type="number"
              :disabled="!c.editable"
            />
          </div>
          <div class="fld">
            <label>Feed 每页数量</label
            ><input
              v-model.number="c.draft.page_size"
              class="in"
              aria-label="Feed 每页数量"
              type="number"
              :disabled="!c.editable"
            />
          </div>
          <div class="fld">
            <label>合集卡插入规则</label><input class="in" readonly /><span class="hint"
              >从首位起,每隔 3、4、3、4 张普通卡插入 1 张合集卡</span
            >
          </div>
        </div>
      </div>
      <div class="sec">
        <h3>热门池预览</h3>
        <p>按热度排序的前 8 部。置顶固定在池首,屏蔽则不进入热门池。</p>
        <div class="tw">
          <table style="min-width: 520px">
            <thead>
              <tr>
                <th>#</th>
                <th>剧集</th>
                <th>热度</th>
                <th>置顶</th>
                <th>屏蔽</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in c.draft.overrides.slice(0, 8)" :key="row.drama_id">
                <td class="num">{{ index + 1 }}</td>
                <td>{{ row.title }}</td>
                <td class="num">{{ row.heat }}</td>
                <td>
                  <ToggleSwitch
                    v-model="row.pinned"
                    :label="row.title + '置顶'"
                    :disabled="!c.editable || row.blocked"
                  />
                </td>
                <td>
                  <ToggleSwitch
                    v-model="row.blocked"
                    :label="row.title + '屏蔽'"
                    :disabled="!c.editable || row.pinned"
                  />
                </td>
              </tr>
              <tr v-if="!c.draft.overrides.length">
                <td colspan="5" class="empty">暂无数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="sec" style="display: flex; gap: 8px; justify-content: flex-end">
        <button class="btn" :disabled="!c.editable" @click="c.reset">还原</button
        ><button class="btn pri" :disabled="!c.editable" @click="publish">发布</button>
      </div>
    </div>
  </div>
</template>
