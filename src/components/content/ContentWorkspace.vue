<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
const props = defineProps<{ kind: 'dramas' | 'characters' }>();
import { make } from '../../domain/content';
import type { Row } from '../../types/content';
import { useContentStore } from '../../stores/content';
import { canPublish, getEpisodes, syncEpisodes } from '../../domain/episodes';
import ConfirmDialog from '../common/ConfirmDialog.vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
const auth = useAuthStore();
const canWrite = computed(() => auth.can('content', true));
const content = useContentStore();
const isDrama = computed(() => props.kind === 'dramas');
const rows = computed(() => (isDrama.value ? content.dramas : content.characters));
const statuses = computed(() =>
  isDrama.value ? ['草稿', '上架', '下架'] : ['草稿', '待审核', '驳回', '上架', '下架'],
);
const query = ref('');
const filter = ref('');
const badge = ref('');
const tagFilter = ref('');
const pageSize = ref(8);
const page = ref(1);
const matched = computed(() =>
  rows.value.filter(
    (r) =>
      (!filter.value || r.status === filter.value) &&
      (!badge.value || r.badge === badge.value) &&
      (!tagFilter.value || r.tags.includes(tagFilter.value)) &&
      `${r.name} ${r.id} ${r.author} ${r.tags.join(' ')}`
        .toLowerCase()
        .includes(query.value.toLowerCase()),
  ),
);
const pages = computed(() => Math.max(1, Math.ceil(matched.value.length / pageSize.value)));
const visible = computed(() =>
  matched.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
);
watch([query, filter, badge, tagFilter, pageSize], () => (page.value = 1));
watch(pages, (count) => {
  page.value = Math.min(page.value, count);
});
watch(
  () => props.kind,
  () => {
    query.value = '';
    filter.value = '';
    badge.value = '';
    close();
  },
);
const tags = [
  'Romance',
  'Thriller',
  'Revenge',
  'Historical',
  'Mystery',
  'Fantasy',
  'Drama',
  'CEO',
  'Mafia',
  'Werewolf',
];
const editing = ref(false);
const tab = ref('基本信息');
const error = ref('');
const notice = ref('');
const pending = ref<{ row: Row; target: string } | null>(null);
const discard = ref(false);
let snapshot = '';
let resolveLeave: ((leave: boolean) => void) | undefined;
onBeforeRouteLeave(() => {
  if (!editing.value || JSON.stringify(draft) === snapshot) return true;
  discard.value = true;
  return new Promise<boolean>((resolve) => {
    resolveLeave = resolve;
  });
});
function cancelDiscard() {
  discard.value = false;
  resolveLeave?.(false);
  resolveLeave = undefined;
}
const draft = reactive(make('', '', '草稿', []));
let timer: ReturnType<typeof setTimeout> | undefined;
let previousFocus: HTMLElement | null = null;
function notify(message: string) {
  notice.value = message;
  clearTimeout(timer);
  timer = setTimeout(() => (notice.value = ''), 3000);
}
function edit(row?: Row) {
  previousFocus = document.activeElement as HTMLElement;
  Object.assign(draft, JSON.parse(JSON.stringify(row ?? make('', '', '草稿', []))));
  draft.episodeItems = JSON.parse(JSON.stringify(getEpisodes(draft)));
  snapshot = JSON.stringify(draft);
  tab.value = '基本信息';
  error.value = '';
  editing.value = true;
  document.body.style.overflow = 'hidden';
  void nextTick(() => document.querySelector<HTMLElement>('.drawer input')?.focus());
}
function close() {
  if (editing.value && JSON.stringify(draft) !== snapshot) {
    discard.value = true;
    return;
  }
  finishClose();
}
function finishClose() {
  resolveLeave?.(true);
  resolveLeave = undefined;
  discard.value = false;
  editing.value = false;
  document.body.style.overflow = '';
  previousFocus?.focus();
}
function save(target?: string) {
  if (!canWrite.value) return;
  error.value = '';
  syncEpisodes(draft);
  if (!draft.name.trim()) {
    error.value = isDrama.value ? '请填写剧名' : '请填写角色名';
    return;
  }
  if (!Number.isInteger(draft.free) || draft.free < 0) {
    error.value = '免费集数必须为非负整数';
    return;
  }
  if ((target ?? draft.status) === '上架' && isDrama.value && !canPublish(draft)) {
    error.value = '上架前需导入分集，并完成免费集的视频转码。';
    return;
  }
  if (
    ['待审核', '上架'].includes(target ?? draft.status) &&
    !isDrama.value &&
    (!draft.opening.trim() || !draft.author.trim())
  ) {
    error.value = '请填写作者和开场白后提交审核。';
    return;
  }
  const next: Row = JSON.parse(JSON.stringify(draft));
  next.name = next.name.trim();
  next.status = target ?? next.status;
  if (!next.id) next.id = `${isDrama.value ? 'D' : 'C'}${Date.now()}`;
  if (target === '上架' && isDrama.value)
    next.episodeItems?.forEach((e) => {
      e.published = e.ready;
    });
  const index = rows.value.findIndex((r) => r.id === next.id);
  if (index < 0) rows.value.unshift(next);
  else rows.value[index] = next;
  finishClose();
  notify('已保存示例数据');
}
function action(row: Row, target: string) {
  if (!canWrite.value) return;
  if (target === '上架' && isDrama.value && !canPublish(row)) {
    notify('免费集尚未完成转码，请先检查分集。');
    return;
  }
  if (target === '待审核' && (!row.opening.trim() || !row.author.trim())) {
    edit(row);
    error.value = '请填写作者和开场白后提交审核。';
    return;
  }
  pending.value = { row, target };
}
function confirmAction(reason: string) {
  if (!pending.value) return;
  const { row, target } = pending.value;
  if (row === draft) {
    draft.reason = reason;
    pending.value = null;
    save(target);
    return;
  }
  row.status = target;
  if (target === '驳回') row.reason = reason;
  if (target === '上架') row.reason = '';
  if (isDrama.value) {
    row.episodeItems = getEpisodes(row);
    row.episodeItems.forEach((e) => {
      e.published = target === '上架' && e.ready;
    });
  }
  pending.value = null;
  notify(`已${target}（示例数据）`);
}
function importVideos(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
  if (files.some((f) => !f.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v)$/i.test(f.name))) {
    error.value = '请选择视频文件';
    input.value = '';
    return;
  }
  draft.episodeItems ??= [];
  for (const file of files)
    draft.episodeItems.push({
      number: draft.episodeItems.length + 1,
      filename: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      ready: false,
      published: false,
    });
  syncEpisodes(draft);
  input.value = '';
  error.value = '';
}
async function importCover(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    error.value = '请选择不超过 2 MB 的 JPG 或 PNG 图片';
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    draft.cover = String(reader.result);
    error.value = '';
  };
  reader.onerror = () => {
    error.value = '图片读取失败，请重试';
  };
  reader.readAsDataURL(file);
  input.value = '';
}
function simulateTranscoding() {
  draft.episodeItems?.forEach((e) => {
    if (e.filename) e.ready = true;
  });
  syncEpisodes(draft);
}
function replaceVideo(event: Event, number: number) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v)$/i.test(file.name)) {
    error.value = '请选择视频文件';
    input.value = '';
    return;
  }
  const episode = draft.episodeItems?.find((e) => e.number === number);
  if (episode) {
    episode.filename = file.name;
    episode.size = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
    episode.ready = false;
    episode.published = false;
    syncEpisodes(draft);
  }
  input.value = '';
}
function removeEpisode(number: number) {
  draft.episodeItems = draft.episodeItems
    ?.filter((e) => e.number !== number)
    .map((e, i) => ({ ...e, number: i + 1 }));
  syncEpisodes(draft);
}
function toggleEpisode(number: number) {
  const episode = draft.episodeItems?.find((e) => e.number === number);
  if (episode?.ready) episode.published = !episode.published;
}
function keyboard(event: KeyboardEvent) {
  if (pending.value || discard.value) return;
  if (!editing.value) return;
  if (event.key === 'Escape') {
    close();
    return;
  }
  if (event.key === 'Tab') {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.drawer button, .drawer input, .drawer select, .drawer textarea',
      ),
    ).filter((el) => !el.hasAttribute('disabled'));
    const first = nodes[0],
      last = nodes[nodes.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first || !nodes.includes(document.activeElement as HTMLElement))
    ) {
      event.preventDefault();
      last?.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !nodes.includes(document.activeElement as HTMLElement))
    ) {
      event.preventDefault();
      first?.focus();
    }
  }
}
onMounted(() => window.addEventListener('keydown', keyboard));
onUnmounted(() => {
  window.removeEventListener('keydown', keyboard);
  document.body.style.overflow = '';
  clearTimeout(timer);
});
</script>

<template>
  <div class="page-heading">
    <div>
      <h1>{{ isDrama ? 'Short 剧库' : 'Stories 角色库' }}</h1>
      <p>
        {{
          isDrama
            ? '管理剧集、分集视频、标签、角标与免费集数。'
            : '管理角色与审核流程，通过审核后才对前台可见。'
        }}
      </p>
    </div>
    <button v-if="canWrite" class="primary" @click="edit()">
      ＋ {{ isDrama ? '新建剧集' : '新建角色' }}</button
    ><span v-else class="pill">当前角色只读</span>
  </div>
  <div class="flow">
    <button
      v-for="s in statuses"
      :key="s"
      :class="{ selected: filter === s }"
      @click="filter = filter === s ? '' : s"
    >
      {{ s }} <b>{{ rows.filter((r) => r.status === s).length }}</b>
    </button>
  </div>
  <section class="card table-card">
    <div class="toolbar">
      <input v-model="query" aria-label="搜索内容" placeholder="搜索名称、ID、标签…" /><select
        v-model="filter"
        aria-label="筛选状态"
      >
        <option value="">全部状态</option>
        <option v-for="s in statuses" :key="s">{{ s }}</option></select
      ><select v-if="isDrama" v-model="badge" aria-label="筛选角标">
        <option value="">全部角标</option>
        <option>HOT</option>
        <option>NEW</option>
        <option>EXCLUSIVE</option></select
      ><select v-model="tagFilter" aria-label="筛选标签">
        <option value="">全部标签</option>
        <option v-for="tag in tags" :key="tag">{{ tag }}</option></select
      ><button
        @click="
          query = '';
          filter = '';
          badge = '';
          tagFilter = '';
        "
      >
        重置</button
      ><span>{{ matched.length }} 条记录</span>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{{ isDrama ? '剧集' : '角色' }}</th>
            <th v-if="!isDrama">作者</th>
            <th>标签</th>
            <th>{{ isDrama ? '角标' : '聊天数' }}</th>
            <th v-if="isDrama">已转码 / 总集</th>
            <th v-if="isDrama">免费集</th>
            <th v-if="isDrama">播放量</th>
            <th>状态</th>
            <th class="operations">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in visible" :key="row.id">
            <td>
              <button class="title-cell" @click="edit(row)">
                <span
                  v-if="!row.cover"
                  class="cover"
                  :class="{ portrait: !isDrama }"
                  :style="{
                    background: `linear-gradient(145deg,hsl(${335 + i * 29} 25% 27%),hsl(${15 + i * 23} 35% 56%))`,
                  }"
                  >{{ row.name.slice(0, 1) }}</span
                ><img
                  v-else
                  class="cover"
                  :class="{ portrait: !isDrama }"
                  :src="row.cover"
                  :alt="row.name"
                /><span
                  ><b>{{ row.name }}</b
                  ><small>{{ row.id }}</small></span
                >
              </button>
            </td>
            <td v-if="!isDrama">{{ row.author }}</td>
            <td>
              <div class="tags">
                <span v-for="tag in row.tags" :key="tag" class="pill">{{ tag }}</span>
              </div>
            </td>
            <td>
              <span v-if="isDrama && row.badge" class="pill blue">{{ row.badge }}</span
              ><template v-else>{{ isDrama ? '—' : row.chats }}</template>
            </td>
            <td v-if="isDrama">{{ row.ready }} / {{ row.episodes }}</td>
            <td v-if="isDrama">{{ row.free }}</td>
            <td v-if="isDrama">{{ row.views }}</td>
            <td>
              <span
                class="pill"
                :class="{
                  positive: row.status === '上架',
                  negative: row.status === '驳回',
                  warning: row.status === '待审核',
                }"
                >{{ row.status }}</span
              ><small v-if="row.reason" class="reason">{{ row.reason }}</small>
            </td>
            <td>
              <div class="row-actions">
                <button @click="edit(row)">{{ canWrite ? '编辑' : '查看' }}</button
                ><button v-if="canWrite && row.status === '上架'" @click="action(row, '下架')">
                  下架</button
                ><button
                  v-else-if="canWrite && (isDrama || row.status === '下架')"
                  @click="action(row, '上架')"
                >
                  上架</button
                ><template v-else-if="canWrite && row.status === '待审核'"
                  ><button @click="action(row, '上架')">通过</button
                  ><button class="negative" @click="action(row, '驳回')">驳回</button></template
                ><button v-else-if="canWrite" @click="action(row, '待审核')">提交审核</button>
              </div>
            </td>
          </tr>
          <tr v-if="!visible.length">
            <td :colspan="isDrama ? 8 : 6" class="empty">暂无匹配结果，请调整搜索条件。</td>
          </tr>
        </tbody>
      </table>
    </div>
    <footer class="pagination">
      <span>共 {{ matched.length }} 条</span
      ><select v-model.number="pageSize" aria-label="每页记录数">
        <option :value="8">8 条/页</option>
        <option :value="16">16 条/页</option>
        <option :value="32">32 条/页</option></select
      ><button :disabled="page === 1" @click="page--">上一页</button
      ><span>{{ page }} / {{ pages }}</span
      ><button :disabled="page === pages" @click="page++">下一页</button>
    </footer>
  </section>
  <Teleport to="body"
    ><div v-if="editing" class="drawer-overlay" @click.self="close">
      <section class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header>
          <div>
            <h2 id="drawer-title">
              {{ draft.id ? '编辑' : '新建' }}{{ isDrama ? '剧集' : '角色' }}
            </h2>
            <p>{{ draft.id || '填写资料，保存草稿' }}</p>
          </div>
          <button aria-label="关闭抽屉" @click="close">×</button>
        </header>
        <div class="drawer-tabs">
          <button
            v-for="t in isDrama ? ['基本信息', '分集与视频', '封面'] : ['基本信息', '封面']"
            :key="t"
            :class="{ selected: tab === t }"
            @click="tab = t"
          >
            {{ t }}
          </button>
        </div>
        <form id="content-form" class="drawer-body" :inert="!canWrite" @submit.prevent="save()">
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <template v-if="tab === '基本信息'"
            ><label
              >{{ isDrama ? '剧名' : '角色名'
              }}<input v-model="draft.name" required maxlength="200" /></label
            ><label v-if="isDrama">简介<textarea v-model="draft.description" rows="4" /></label
            ><label v-else>作者<input v-model="draft.author" required /></label>
            <fieldset>
              <legend>标签</legend>
              <div class="tag-options">
                <label v-for="t in tags" :key="t"
                  ><input v-model="draft.tags" type="checkbox" :value="t" />{{ t }}</label
                >
              </div>
            </fieldset>
            <template v-if="isDrama"
              ><label
                >免费集数<input
                  v-model.number="draft.free"
                  type="number"
                  min="0"
                  step="1"
                  required /></label
              ><label
                >角标<select v-model="draft.badge">
                  <option value="">无</option>
                  <option>HOT</option>
                  <option>NEW</option>
                  <option>EXCLUSIVE</option>
                </select></label
              >
              <p>
                总集数 {{ draft.episodes }} · 已转码 {{ draft.ready }} 集。上架前需完成免费集转码。
              </p>
              <label
                >计划上架时间<input v-model="draft.publishAt" type="datetime-local" /><small
                  >仅保存计划时间；自动发布需后端调度接入。</small
                ></label
              ></template
            ><template v-else
              ><label>开场白<textarea v-model="draft.opening" rows="5" /></label
              ><label>快捷回复 1<input v-model="draft.q1" /></label
              ><label>快捷回复 2<input v-model="draft.q2" /></label>
              <p v-if="draft.reason" class="form-error">驳回原因：{{ draft.reason }}</p></template
            ></template
          >
          <template v-else-if="tab === '分集与视频'"
            ><div class="info-note">
              本地演示：文件仅用于填写视频资料，不上传服务器；可模拟转码验证上架流程。
            </div>
            <div class="episode-tools">
              <label class="file-button"
                >＋ 导入视频<input
                  type="file"
                  accept="video/*,.mp4,.mov,.webm,.m4v"
                  multiple
                  @change="importVideos" /></label
              ><button
                type="button"
                :disabled="!draft.episodeItems?.some((e) => e.filename && !e.ready)"
                @click="simulateTranscoding"
              >
                模拟转码完成
              </button>
            </div>
            <div v-if="!draft.episodes" class="empty">暂无分集</div>
            <table v-else>
              <thead>
                <tr>
                  <th>集号</th>
                  <th>视频状态</th>
                  <th>解锁方式</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="episode in draft.episodeItems" :key="episode.number">
                  <td>
                    EP. {{ String(episode.number).padStart(2, '0')
                    }}<small class="episode-file"
                      >{{ episode.filename || '未选择文件' }} · {{ episode.size }}</small
                    >
                  </td>
                  <td>
                    <span class="pill" :class="{ positive: episode.ready }">{{
                      episode.ready ? '已转码' : episode.filename ? '待转码' : '未上传'
                    }}</span>
                  </td>
                  <td>{{ episode.number <= draft.free ? '免费' : '金币解锁' }}</td>
                  <td>
                    <div class="row-actions">
                      <label class="file-button compact-file"
                        >{{ episode.filename ? '替换' : '选择'
                        }}<input
                          type="file"
                          accept="video/*,.mp4,.mov,.webm,.m4v"
                          @change="replaceVideo($event, episode.number)"
                      /></label>
                      <button
                        type="button"
                        :disabled="!episode.ready"
                        @click="toggleEpisode(episode.number)"
                      >
                        {{ episode.published ? '下架' : '上架' }}</button
                      ><button
                        type="button"
                        class="negative"
                        @click="removeEpisode(episode.number)"
                      >
                        移除
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table></template
          ><template v-else
            ><img
              v-if="draft.cover"
              :src="draft.cover"
              alt="封面预览"
              class="cover cover-preview"
            />
            <div v-else class="cover cover-preview">{{ draft.name.slice(0, 1) || 'F' }}</div>
            <p>建议比例 3:4.3，JPG / PNG，≤ 2MB。图片仅在当前示例会话中预览。</p>
            <label class="file-button"
              >选择封面<input
                type="file"
                accept="image/jpeg,image/png"
                @change="importCover" /></label
            ><button v-if="draft.cover" type="button" @click="draft.cover = ''">
              移除图片
            </button></template
          >
        </form>
        <footer>
          <button @click="close">{{ canWrite ? '取消' : '关闭' }}</button
          ><template v-if="canWrite"
            ><button v-if="!draft.id || draft.status === '草稿'" @click="save('草稿')">
              保存草稿</button
            ><button class="primary" type="submit" form="content-form">保存修改</button
            ><button v-if="isDrama && draft.status !== '上架'" @click="save('上架')">上架</button
            ><button
              v-if="!isDrama && draft.status === '待审核'"
              class="negative"
              @click="pending = { row: draft, target: '驳回' }"
            >
              驳回</button
            ><button v-if="!isDrama && draft.status === '待审核'" @click="save('上架')">
              通过并上架</button
            ><button
              v-if="!isDrama && ['草稿', '驳回'].includes(draft.status)"
              @click="save('待审核')"
            >
              提交审核
            </button></template
          >
        </footer>
      </section>
    </div>
    <div v-if="notice" class="toast" role="status">{{ notice }}</div></Teleport
  >
  <ConfirmDialog
    :open="!!pending"
    :title="pending?.target === '驳回' ? '驳回角色' : `确认${pending?.target || ''}`"
    :message="
      pending
        ? `「${pending.row.name}」${pending.target === '下架' ? '下架后前台不可见，已有记录保留。' : '本操作仅更新当前示例数据。'}`
        : ''
    "
    :require-reason="pending?.target === '驳回'"
    @cancel="pending = null"
    @confirm="confirmAction"
  />
  <ConfirmDialog
    :open="discard"
    title="放弃未保存的修改？"
    message="关闭后，本次尚未保存的修改将丢失。"
    confirm-label="放弃修改"
    @cancel="cancelDiscard"
    @confirm="finishClose"
  />
</template>
