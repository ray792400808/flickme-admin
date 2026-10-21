<script setup lang="ts">
import { reactive, ref, toRef, computed } from 'vue';
import { useOperationsConfig } from '../../composables/useOperationsConfig';
import { useConfigEditor } from '../../composables/useConfigEditor';
import ConfigFeedback from '../../components/operations/ConfigFeedback.vue';
import ToggleSwitch from '../../components/operations/ToggleSwitch.vue';
import LocalizedInput from '../../components/operations/LocalizedInput.vue';
import DateTimeField from '../../components/operations/DateTimeField.vue';
import FormDrawer from '../../components/common/FormDrawer.vue';
import ConfirmDialog from '../../components/common/ConfirmDialog.vue';
import { emptyLocalizedText, type Channel, type HomeCategory } from '../../types/operations';
import { validateOperations } from '../../utils/operations';
const channel = ref<Channel>('short');
const previewDragging = ref(false);
let previewPointer: number | null = null;
let previewStartX = 0;
let previewStartScroll = 0;
function startPreviewDrag(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  const strip = event.currentTarget as HTMLElement;
  if (strip.scrollWidth <= strip.clientWidth) return;
  previewPointer = event.pointerId;
  previewStartX = event.clientX;
  previewStartScroll = strip.scrollLeft;
  previewDragging.value = true;
  strip.setPointerCapture(event.pointerId);
  event.preventDefault();
}
function movePreviewDrag(event: PointerEvent) {
  if (previewPointer !== event.pointerId) return;
  const strip = event.currentTarget as HTMLElement;
  strip.scrollLeft = previewStartScroll - (event.clientX - previewStartX);
}
function endPreviewDrag(event: PointerEvent) {
  if (previewPointer !== event.pointerId) return;
  previewPointer = null;
  previewDragging.value = false;
  const strip = event.currentTarget as HTMLElement;
  if (strip.hasPointerCapture(event.pointerId)) strip.releasePointerCapture(event.pointerId);
}
const c = reactive(useOperationsConfig('chips', () => [], channel));
const e = reactive(
  useConfigEditor<HomeCategory>(toRef(c, 'draft'), () => ({
    id: crypto.randomUUID(),
    key: '',
    type: 'tag',
    names: emptyLocalizedText(),
    enabled: true,
    locked: false,
    starts_at: null,
    ends_at: null,
  })),
);
const deleteOpen = ref(false),
  drag = ref<number | null>(null),
  over = ref<number | null>(null),
  editorError = ref('');
const unpublished = computed(
  () => c.dirty || (c.document && c.document.revision !== c.document.published_revision),
);
function edit(row?: HomeCategory) {
  editorError.value = '';
  e.edit(row);
}
async function save() {
  if (!c.editable) return;
  const copy = JSON.parse(JSON.stringify(c.draft)) as HomeCategory[];
  const index = copy.findIndex((row) => row.id === e.draft.id);
  if (index < 0) copy.push(e.draft);
  else copy[index] = e.draft;
  editorError.value = validateOperations('chips', copy);
  if (editorError.value) return;
  if (index < 0) c.draft.push(JSON.parse(JSON.stringify(e.draft)));
  else c.draft[index] = JSON.parse(JSON.stringify(e.draft));
  if (await c.persist()) {
    e.open = false;
    c.message = '已保存';
  }
}
async function remove() {
  if (!c.editable || e.draft.locked) return;
  c.draft = c.draft.filter((row) => row.id !== e.draft.id);
  if (await c.persist()) {
    deleteOpen.value = false;
    e.open = false;
    c.message = '已删除';
  }
}
function drop(index: number) {
  if (!c.editable || drag.value === null || index === 0 || drag.value === 0) return;
  const [row] = c.draft.splice(drag.value, 1);
  c.draft.splice(index, 0, row!);
  drag.value = null;
  over.value = null;
}
async function publish() {
  if (await c.persist(true)) c.message = '已发布 v' + c.document?.published_revision;
}
</script>
<template>
  <div class="op-page">
    <div class="ph">
      <div>
        <h1>首页分类 Chips</h1>
        <p>
          Home 顶部分类标签。For you
          固定在首位且不可停用;其余可新增、排序、定时上下线。名称为多语言。客户端缓存 10
          分钟,拉取失败使用本地兜底。
        </p>
      </div>
      <div class="act">
        <button class="btn" :disabled="!c.editable" @click="edit()">新增分类</button
        ><button class="btn pri" :disabled="!c.editable" @click="c.publishOpen = true">
          {{ unpublished ? '发布更改' : '发布' }}
        </button>
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
    <div v-if="unpublished" class="banner warn">
      有未发布的更改,线上仍为 v{{ c.document?.published_revision ?? '—' }}。
    </div>
    <div class="tabs">
      <button
        :class="{ on: channel === 'short' }"
        :disabled="c.busy || c.loading"
        @click="c.switchChannel('short')"
      >
        Short</button
      ><button
        :class="{ on: channel === 'stories' }"
        :disabled="c.busy || c.loading"
        @click="c.switchChannel('stories')"
      >
        Stories
      </button>
    </div>
    <div class="two">
      <div class="card" id="clist">
        <div
          v-for="(row, index) in c.draft"
          :key="row.id"
          class="li"
          :class="{ lock: row.locked, drag: drag === index, over: over === index }"
          :draggable="c.editable && !row.locked"
          @dragstart="
            drag = index;
            $event.dataTransfer?.setData('text/plain', row.id);
          "
          @dragover.prevent="over = index > 0 ? index : null"
          @drop.prevent="drop(index)"
          @dragend="
            drag = null;
            over = null;
          "
        >
          <span class="hd" :aria-label="'拖动排序 ' + row.names.en">{{ index ? '⋮⋮' : '•' }}</span>
          <div class="nm">
            <b>{{ row.names.en }}</b
            ><small
              >{{ row.type === 'system' ? '系统分类' : '标签分类 · ' + row.key
              }}{{ row.locked ? ' · 固定首位' : '' }}</small
            >
          </div>
          <span class="pill" :class="{ info: row.type === 'system' }">{{ row.type }}</span
          ><span class="mono">#{{ index + 1 }}</span
          ><button v-if="!row.locked" class="btn sm" @click="edit(row)">编辑</button
          ><ToggleSwitch
            v-model="row.enabled"
            :label="row.names.en + '启用'"
            :disabled="!c.editable || row.locked"
          />
        </div>
        <div v-if="!c.draft.length" class="empty">暂无分类数据</div>
      </div>
      <div class="card sec">
        <h3>客户端预览</h3>
        <p>{{ channel === 'short' ? 'Short' : 'Stories' }} 页顶部,文字 Tab 形态。</p>
        <div class="phone">
          <div class="hdr">
            <template v-if="channel === 'short'">Short <span>Stories</span></template
            ><template v-else><span>Short</span> Stories</template>
          </div>
          <div
            class="ch2"
            :class="{ 'is-dragging': previewDragging }"
            tabindex="0"
            aria-label="分类标签，可按住鼠标左右拖动"
            @pointerdown="startPreviewDrag"
            @pointermove="movePreviewDrag"
            @pointerup="endPreviewDrag"
            @pointercancel="endPreviewDrag"
            @lostpointercapture="endPreviewDrag"
          >
            <template v-for="(row, index) in c.draft.filter((row) => row.enabled)" :key="row.id"
              ><b v-if="!index">{{ row.names.en }}</b
              ><i v-else>{{ row.names.en }}</i></template
            >
          </div>
          <div class="g">
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
      </div>
    </div>
    <FormDrawer
      reference
      :open="e.open"
      :title="e.isNew ? '新增分类' : '编辑分类'"
      :subtitle="channel === 'short' ? 'Short' : 'Stories'"
      :busy="c.busy"
      @close="e.close"
      ><form id="category-form" class="op-form" @submit.prevent="save">
        <div class="fld">
          <label>类型</label
          ><select v-model="e.draft.type" class="in" aria-label="类型" :disabled="!c.editable">
            <option>system</option>
            <option>tag</option>
          </select>
        </div>
        <div class="fld">
          <label>tagKey</label
          ><input
            v-model="e.draft.key"
            class="in"
            aria-label="tagKey"
            :readonly="!c.editable"
          /><span class="hint">type=tag 时必填,对应标签库中的稳定标识</span>
        </div>
        <LocalizedInput
          v-model="e.draft.names"
          label="多语言名称"
          :disabled="!c.editable"
        /><DateTimeField
          v-model="e.draft.starts_at"
          label="开始时间(可空)"
          :disabled="!c.editable"
        /><DateTimeField v-model="e.draft.ends_at" label="结束时间(可空)" :disabled="!c.editable" />
        <p v-if="editorError || c.error" class="form-error" role="alert">
          {{ editorError || c.error }}
        </p>
      </form>
      <template #footer
        ><button class="btn" :disabled="c.busy" @click="e.close">取消</button
        ><button v-if="!e.isNew" class="btn dg" :disabled="!c.editable" @click="deleteOpen = true">
          删除</button
        ><button class="btn pri" type="submit" form="category-form" :disabled="!c.editable">
          保存
        </button></template
      ></FormDrawer
    >
    <ConfirmDialog
      :open="e.discardOpen"
      title="放弃未保存修改？"
      @confirm="e.discard"
      @cancel="e.discardOpen = false"
    /><ConfirmDialog
      :open="deleteOpen"
      title="删除分类"
      message="删除后前台不再展示该分类,已发布的版本在重新发布后更新。"
      confirm-label="删除"
      :busy="c.busy"
      :error="c.error"
      @confirm="remove"
      @cancel="deleteOpen = false"
    />
  </div>
</template>
