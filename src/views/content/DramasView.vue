<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  badgeApi,
  dramaApi,
  languageApi,
  tagApi,
  type BadgeOption,
  type Drama,
  type DramaEpisode,
  type LanguageOption,
} from '../../api/content';
import { useAuthStore } from '../../stores/auth';
import {
  coverGradient,
  formatDate,
  formatDuration,
  statusPillClass,
  useListQuery,
} from '../../composables/useContentList';

const auth = useAuthStore();
const canWrite = computed(() => auth.can('content', true));

const keyword = ref('');
const { page, size, total, lastPage, loading, error, applyMeta } = useListQuery(keyword, 10);
const filterStatus = ref<'' | number>('');
const filterBadge = ref<'' | number>('');
const filterTag = ref<'' | number>('');
const rows = ref<Drama[]>([]);
const badges = ref<BadgeOption[]>([]);
const languages = ref<LanguageOption[]>([]);
const tags = ref<Array<{ id: number; code: string; name: string }>>([]);

const drawerVisible = ref(false);
const isNew = ref(false);
const saving = ref(false);
const formError = ref('');
const tab = ref('基本信息');

const draft = reactive({
  id: 0,
  title: '',
  synopsis: '',
  cover_url: '',
  video_url: '',
  status: 0,
  badge_id: null as number | null,
  language_id: 0,
  free_episodes: 6,
  tag_ids: [] as number[],
});

// ── 分集编辑 ──────────────────────────────────────────────
const episodes = ref<DramaEpisode[]>([]);
const episodeDialog = ref(false);
const episodeDraft = reactive({
  id: 0,
  episode_no: 1,
  title: '',
  duration_sec: 0,
  status: 1,
  is_pay: 0,
  video_url: '',
  poster_url: '',
});

const statusOptions = [
  { value: 0, label: '草稿' },
  { value: 1, label: '上架' },
  { value: 2, label: '下架' },
];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await dramaApi.list({
      q: keyword.value || undefined,
      status: filterStatus.value === '' ? undefined : filterStatus.value,
      badge_id: filterBadge.value === '' ? undefined : filterBadge.value,
      tag_id: filterTag.value === '' ? undefined : filterTag.value,
      page: page.value,
      per_page: size.value,
    });
    rows.value = res.data;
    applyMeta(res);
  } catch (e) {
    error.value = (e as Error).message || '加载剧库失败';
  } finally {
    loading.value = false;
  }
}

async function loadOptions() {
  try {
    const [b, l, t] = await Promise.all([
      badgeApi.options(),
      languageApi.options(),
      tagApi.options({ type: 1 }),
    ]);
    badges.value = b;
    languages.value = l;
    tags.value = t;
  } catch {
    badges.value = [];
    languages.value = [];
    tags.value = [];
  }
}

function openCreate() {
  isNew.value = true;
  formError.value = '';
  tab.value = '基本信息';
  Object.assign(draft, {
    id: 0,
    title: '',
    synopsis: '',
    cover_url: '',
    video_url: '',
    status: 0,
    badge_id: null,
    language_id: languages.value[0]?.id ?? 0,
    free_episodes: 6,
    tag_ids: [],
  });
  episodes.value = [];
  drawerVisible.value = true;
}

async function openEdit(row: Drama) {
  isNew.value = true;
  formError.value = '';
  tab.value = '基本信息';

  try {
    const detail = await dramaApi.show(row.id);
    Object.assign(draft, {
      id: detail.id,
      title: detail.title,
      synopsis: detail.synopsis ?? '',
      cover_url: detail.cover_url ?? '',
      video_url: detail.video_url ?? '',
      status: detail.status,
      badge_id: detail.badge_id,
      language_id: detail.language_id,
      free_episodes: detail.free_episodes,
      tag_ids: detail.tags.map((t) => t.id),
    });
    episodes.value = detail.episodes ?? [];
  } catch (e) {
    ElMessage.error((e as Error).message || '加载剧集详情失败');
    return;
  }

  isNew.value = false;
  drawerVisible.value = true;
}

async function save(status?: number) {
  if (saving.value) return;
  formError.value = '';

  if (!draft.title.trim()) {
    formError.value = '请填写剧名';
    return;
  }
  if (!draft.language_id) {
    formError.value = '请选择剧集语种';
    return;
  }
  if (status !== undefined && status === 1 && episodes.value.length === 0) {
    formError.value = '上架前需先导入分集';
    return;
  }

  saving.value = true;
  try {
    const body = {
      title: draft.title.trim(),
      synopsis: draft.synopsis.trim() || null,
      cover_url: draft.cover_url.trim() || null,
      video_url: draft.video_url.trim() || null,
      status: status ?? draft.status,
      badge_id: draft.badge_id,
      language_id: draft.language_id,
      free_episodes: draft.free_episodes,
      tag_ids: draft.tag_ids,
    };

    if (isNew.value) {
      const created = await dramaApi.create(body);
      // 建档成功后立刻切到「编辑」态：否则 draft.id 仍是 0，
      // 用户接着加分集会打到 /dramas/0/episodes 报「资源不存在」。
      draft.id = created.id;
      isNew.value = false;
    } else {
      await dramaApi.update(draft.id, body);
    }

    ElMessage.success('已保存');
    await load();
  } catch (e) {
    formError.value = (e as Error).message || '保存失败';
  } finally {
    saving.value = false;
  }
}

async function remove(row: Drama) {
  try {
    await ElMessageBox.confirm(
      `确定删除剧集「${row.title}」？分集与标签关联会一并移除。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await dramaApi.delete(row.id);
    ElMessage.success('已删除');
    await load();
  } catch (e) {
    ElMessage.error((e as Error).message || '删除失败');
  }
}

/** 行内快捷上下架 */
async function toggleStatus(row: Drama) {
  const next = row.status === 1 ? 2 : 1;
  if (next === 1 && row.episodes_num === 0) {
    ElMessage.warning('该剧还没有分集，无法上架');
    return;
  }
  try {
    await dramaApi.update(row.id, { status: next });
    ElMessage.success(next === 1 ? '已上架' : '已下架');
    await load();
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败');
  }
}

// ── 分集 CRUD ────────────────────────────────────────────
function openEpisodeCreate() {
  Object.assign(episodeDraft, {
    id: 0,
    episode_no: (episodes.value.at(-1)?.episode_no ?? 0) + 1,
    title: '',
    duration_sec: 0,
    status: 1,
    is_pay: 0,
    video_url: '',
    poster_url: '',
  });
  episodeDialog.value = true;
}

function openEpisodeEdit(ep: DramaEpisode) {
  Object.assign(episodeDraft, {
    id: ep.id,
    episode_no: ep.episode_no,
    title: ep.title ?? '',
    duration_sec: ep.duration_sec,
    status: ep.status,
    is_pay: ep.is_pay,
    video_url: ep.video_url ?? '',
    poster_url: ep.poster_url ?? '',
  });
  episodeDialog.value = true;
}

async function saveEpisode() {
  if (saving.value) return;
  formError.value = '';
  if (!episodeDraft.episode_no || episodeDraft.episode_no < 1) {
    formError.value = '集号必须为正整数';
    return;
  }
  saving.value = true;
  try {
    const body = {
      episode_no: episodeDraft.episode_no,
      title: episodeDraft.title.trim() || null,
      duration_sec: episodeDraft.duration_sec,
      status: episodeDraft.status,
      is_pay: episodeDraft.is_pay,
      video_url: episodeDraft.video_url.trim() || null,
      poster_url: episodeDraft.poster_url.trim() || null,
    };

    if (episodeDraft.id) {
      await dramaApi.updateEpisode(draft.id, episodeDraft.id, body);
    } else {
      await dramaApi.createEpisode(draft.id, body);
    }

    ElMessage.success('已保存分集');
    episodeDialog.value = false;
    const detail = await dramaApi.show(draft.id);
    episodes.value = detail.episodes ?? [];
    // 分集变动后 episodes_num 会重算，列表要跟着刷新
    await load();
  } catch (e) {
    formError.value = (e as Error).message || '保存分集失败';
  } finally {
    saving.value = false;
  }
}

async function removeEpisode(ep: DramaEpisode) {
  try {
    await ElMessageBox.confirm(`确定删除第 ${ep.episode_no} 集？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  try {
    await dramaApi.deleteEpisode(draft.id, ep.id);
    ElMessage.success('已删除');
    const detail = await dramaApi.show(draft.id);
    episodes.value = detail.episodes ?? [];
    // 删除分集后 episodes_num 同样需要重算并刷新列表
    await load();
  } catch (e) {
    ElMessage.error((e as Error).message || '删除失败');
  }
}

watch([filterStatus, filterBadge, filterTag, size], () => {
  page.value = 1;
  load();
});
watch(page, load);

onMounted(async () => {
  await loadOptions();
  await load();
});
</script>

<template>
  <div class="page-heading">
    <div>
      <h1>Short 剧库</h1>
      <p>
        管理剧集、分集视频、标签、角标与免费集数。上架前需完成免费集视频转码；下架后前台 Short
        分类、搜索与 Topic 均不可见。
      </p>
    </div>
    <div class="act">
      <span v-if="!canWrite" class="pill">当前角色只读</span>
      <button v-else class="primary" @click="openCreate">＋ 新建剧集</button>
    </div>
  </div>

  <div class="flow">
    <button
      v-for="s in statusOptions"
      :key="s.value"
      :class="{ selected: filterStatus === s.value }"
      @click="filterStatus = filterStatus === s.value ? '' : s.value"
    >
      {{ s.label }}
    </button>
  </div>

  <section class="card table-card">
    <div class="toolbar">
      <input v-model="keyword" type="search" placeholder="搜索剧名或 ID…" />
      <select v-model="filterStatus" aria-label="筛选状态">
        <option value="">全部状态</option>
        <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
      <select v-model="filterBadge" aria-label="筛选角标">
        <option value="">全部角标</option>
        <option v-for="b in badges" :key="b.id" :value="b.id">{{ b.keyword }}</option>
      </select>
      <select v-model="filterTag" aria-label="筛选标签">
        <option value="">全部标签</option>
        <option v-for="t in tags" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <button @click="keyword = ''; filterStatus = ''; filterBadge = ''; filterTag = ''">重置</button>
      <span>{{ total }} 条记录</span>
    </div>

    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>剧集</th>
            <th>标签</th>
            <th>角标</th>
            <th>语种</th>
            <th>总集 / 免费集</th>
            <th>状态</th>
            <th>更新</th>
            <th class="operations">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="empty">正在加载…</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="8" class="empty" role="alert">
              {{ error }}<button class="btn sm" @click="load">重试</button>
            </td>
          </tr>
          <template v-else>
            <tr v-for="(row, i) in rows" :key="row.id">
              <td>
                <button class="title-cell" @click="openEdit(row)">
                  <span
                    v-if="!row.cover_url"
                    class="cover"
                    :style="{ background: coverGradient(i) }"
                    >{{ row.title.slice(0, 1) }}</span
                  >
                  <img v-else class="cover" :src="row.cover_url" :alt="row.title" />
                  <span><b>{{ row.title }}</b><small>#{{ row.id }}</small></span>
                </button>
              </td>
              <td>
                <div class="tags">
                  <span v-for="t in row.tags.slice(0, 3)" :key="t.id" class="pill">{{ t.name }}</span>
                  <span v-if="row.tags.length > 3" class="pill">+{{ row.tags.length - 3 }}</span>
                  <span v-if="!row.tags.length" class="text-muted">—</span>
                </div>
              </td>
              <td>
                <span v-if="row.badge" class="pill blue">{{ row.badge.keyword }}</span>
                <span v-else class="text-muted">—</span>
              </td>
              <td><span class="code">{{ row.language?.code ?? '—' }}</span></td>
              <td>{{ row.episodes_num }} / {{ row.free_episodes }}</td>
              <td>
                <span class="pill" :class="statusPillClass(row.status)">{{ row.status_label }}</span>
              </td>
              <td>{{ formatDate(row.updated_at) }}</td>
              <td>
                <div class="row-actions">
                  <button @click="openEdit(row)">{{ canWrite ? '编辑' : '查看' }}</button>
                  <button v-if="canWrite" @click="toggleStatus(row)">
                    {{ row.status === 1 ? '下架' : '上架' }}
                  </button>
                  <button v-if="canWrite" class="negative" @click="remove(row)">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="8" class="empty">暂无匹配的剧集</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <footer class="pagination">
      <span>共 {{ total }} 条</span>
      <select v-model.number="size" aria-label="每页记录数">
        <option :value="10">10 条/页</option>
        <option :value="20">20 条/页</option>
        <option :value="50">50 条/页</option>
      </select>
      <button :disabled="page <= 1" @click="page--">上一页</button>
      <span>{{ page }} / {{ lastPage }}</span>
      <button :disabled="page >= lastPage" @click="page++">下一页</button>
    </footer>
  </section>

  <!-- 剧集编辑抽屉 -->
  <el-drawer
    v-model="drawerVisible"
    :title="`${isNew ? '新建' : '编辑'}剧集`"
    size="560px"
    :close-on-click-modal="false"
  >
    <el-tabs v-model="tab">
      <el-tab-pane label="基本信息" name="基本信息">
        <div class="form-grid">
          <label>
            剧名
            <input v-model="draft.title" placeholder="如 The CEO's Trap" maxlength="200" />
          </label>
          <label>
            简介
            <textarea v-model="draft.synopsis" rows="4" placeholder="选填" />
          </label>
          <div class="row2">
            <label>
              语种
              <select v-model.number="draft.language_id">
                <option v-for="lang in languages" :key="lang.id" :value="lang.id">
                  {{ lang.flag_emoji }} {{ lang.native_name }}
                </option>
              </select>
            </label>
            <label>
              角标
              <select v-model="draft.badge_id">
                <option :value="null">无</option>
                <option v-for="b in badges" :key="b.id" :value="b.id">{{ b.keyword }}</option>
              </select>
            </label>
          </div>
          <div class="row2">
            <label>
              免费集数
              <input v-model.number="draft.free_episodes" type="number" min="0" step="1" />
            </label>
            <label>
              状态
              <select v-model.number="draft.status">
                <option v-for="s in statusOptions" :key="s.value" :value="s.value">
                  {{ s.label }}
                </option>
              </select>
            </label>
          </div>
          <label>
            封图 URL
            <input v-model="draft.cover_url" placeholder="https://…" maxlength="1024" />
          </label>
          <label>
            预告 / 花絮 URL
            <input v-model="draft.video_url" placeholder="https://…" maxlength="1024" />
          </label>
          <fieldset>
            <legend>标签</legend>
            <div class="tag-options">
              <label v-for="t in tags" :key="t.id">
                <input v-model="draft.tag_ids" type="checkbox" :value="t.id" />
                {{ t.name }}
              </label>
            </div>
          </fieldset>
        </div>
      </el-tab-pane>

      <el-tab-pane label="分集与视频" name="分集与视频">
        <div class="ep-head">
          <span class="text-muted">共 {{ episodes.length }} 集</span>
          <button v-if="canWrite" class="btn sm" @click="openEpisodeCreate">＋ 新增分集</button>
        </div>
        <div v-if="!episodes.length" class="empty">暂无分集</div>
        <table v-else class="ep-table">
          <thead>
            <tr>
              <th>集号</th>
              <th>标题</th>
              <th>时长</th>
              <th>解锁</th>
              <th>状态</th>
              <th class="operations">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ep in episodes" :key="ep.id">
              <td>EP. {{ String(ep.episode_no).padStart(2, '0') }}</td>
              <td>
                {{ ep.title || '—' }}
                <small v-if="ep.video_url" class="ep-url">{{ ep.video_url }}</small>
              </td>
              <td>{{ formatDuration(ep.duration_sec) }}</td>
              <td>
                <span class="pill" :class="ep.is_pay ? 'warning' : 'positive'">
                  {{ ep.is_pay ? '金币解锁' : '免费' }}
                </span>
              </td>
              <td>
                <span class="pill" :class="statusPillClass(ep.status)">{{ ep.status_label }}</span>
              </td>
              <td>
                <div class="row-actions">
                  <button v-if="canWrite" @click="openEpisodeEdit(ep)">编辑</button>
                  <button v-if="canWrite" class="negative" @click="removeEpisode(ep)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </el-tab-pane>
    </el-tabs>

    <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

    <template #footer>
      <el-button @click="drawerVisible = false">取消</el-button>
      <template v-if="canWrite">
        <el-button :loading="saving" @click="save(0)">保存草稿</el-button>
        <el-button :loading="saving" @click="save(1)">上架</el-button>
        <el-button type="primary" :loading="saving" @click="save()">保存修改</el-button>
      </template>
    </template>
  </el-drawer>

  <!-- 分集编辑弹窗 -->
  <el-dialog
    v-model="episodeDialog"
    :title="episodeDraft.id ? '编辑分集' : '新增分集'"
    width="480px"
    :close-on-click-modal="false"
  >
    <div class="form-grid">
      <div class="row2">
        <label>
          集号
          <input v-model.number="episodeDraft.episode_no" type="number" min="1" step="1" />
        </label>
        <label>
          时长（秒）
          <input v-model.number="episodeDraft.duration_sec" type="number" min="0" step="1" />
        </label>
      </div>
      <label>
        标题
        <input v-model="episodeDraft.title" placeholder="选填" maxlength="200" />
      </label>
      <div class="row2">
        <label>
          状态
          <select v-model.number="episodeDraft.status">
            <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </label>
        <label>
          解锁方式
          <select v-model.number="episodeDraft.is_pay">
            <option :value="0">免费</option>
            <option :value="1">金币解锁</option>
          </select>
        </label>
      </div>
      <label>
        播放源 URL
        <input v-model="episodeDraft.video_url" placeholder="m3u8 / mp4" maxlength="1024" />
      </label>
      <label>
        封面 URL
        <input v-model="episodeDraft.poster_url" placeholder="选填" maxlength="1024" />
      </label>
    </div>
    <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
    <template #footer>
      <el-button @click="episodeDialog = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveEpisode">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.form-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-grid label {
  display: grid;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 500;
}
.form-grid input,
.form-grid select,
.form-grid textarea {
  height: 34px;
  border: 1px solid var(--line2);
  border-radius: 8px;
  background: var(--surface);
  padding: 0 10px;
  color: var(--fg);
  font: inherit;
  font-weight: 400;
}
.form-grid textarea {
  height: auto;
  padding: 8px 10px;
  resize: vertical;
}
.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
fieldset {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  margin: 0;
}
legend {
  padding: 0 6px;
  font-size: 12.5px;
  font-weight: 500;
}
.tag-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.tag-options label {
  display: flex;
  grid-auto-flow: column;
  justify-content: start;
  align-items: center;
  gap: 5px;
  padding: 6px 9px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface2);
  font-size: 12px;
  cursor: pointer;
}
.tag-options input {
  width: auto;
  height: auto;
  accent-color: var(--accent);
}
.ep-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 12.5px;
}
.ep-table {
  font-size: 12.5px;
}
.ep-url {
  display: block;
  max-width: 220px;
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
