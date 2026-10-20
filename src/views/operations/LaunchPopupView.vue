<script setup lang="ts">
import { reactive } from 'vue';
import { useOperationsConfig } from '../../composables/useOperationsConfig';
import ConfigFeedback from '../../components/operations/ConfigFeedback.vue';
import ToggleSwitch from '../../components/operations/ToggleSwitch.vue';
import { emptyLocalizedText } from '../../types/operations';
const c = reactive(
  useOperationsConfig('launch', () => ({
    enabled: false,
    fallback_drama_id: null,
    cover_url: '',
    button_text: emptyLocalizedText(),
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
        <h1>启动弹窗</h1>
        <p>
          冷启动进入 Home 后弹出一次。同一时刻只出现一个弹窗,优先级:启动弹窗 &gt; 会员优惠券 &gt;
          Daily Dramas。
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
        <h3>弹窗配置</h3>
        <p>推荐剧由服务端按用户返回,无个性化数据时取热榜第 1;此处为兜底。</p>
        <div class="fg2">
          <div class="fld">
            <label>启用</label
            ><label class="sf"
              ><input
                v-model="c.draft.enabled"
                type="checkbox"
                aria-label="启用"
                :disabled="!c.editable"
              /><span>开启</span></label
            >
          </div>
          <div class="fld">
            <label>兜底推荐剧</label
            ><select
              v-model="c.draft.fallback_drama_id"
              class="in"
              aria-label="兜底推荐剧"
              :disabled="!c.editable"
            >
              <option v-if="!c.document?.options?.dramas.length" :value="null">暂无剧集选项</option>
              <option
                v-for="drama in c.document?.options?.dramas"
                :key="drama.id"
                :value="drama.id"
              >
                {{ drama.title }}
              </option>
            </select>
          </div>
          <div class="fld">
            <label>弹窗封面</label
            ><input class="in" :value="c.draft.cover_url || '未上传(使用剧封面)'" readonly />
          </div>
          <div class="fld">
            <label>触发</label><input class="in" value="每次冷启动一次" readonly />
          </div>
          <div class="fld">
            <label>按钮文案</label
            ><input class="in" :value="c.draft.button_text.en || 'Start Watching'" readonly />
          </div>
        </div>
      </div>
      <div class="sec">
        <h3>预览</h3>
        <p>示意,以客户端实际渲染为准。</p>
        <div class="pop">
          <div class="im"></div>
          <b>Your Next Favorite</b><small>Perfect picks based on your taste!</small
          ><u>{{ c.draft.button_text.en || 'Start Watching' }}</u>
        </div>
      </div>
      <div class="sec" style="display: flex; gap: 8px; justify-content: flex-end">
        <button class="btn" :disabled="!c.editable" @click="c.reset">还原</button
        ><button class="btn pri" :disabled="!c.editable" @click="publish">发布</button>
      </div>
    </div>
  </div>
</template>
