<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import FormDrawer from '../common/FormDrawer.vue';
import { emptyDrama, validateDrama } from '../../features/dramas/validation';
import type { Drama, DramaInput } from '../../features/dramas/types';
const props = defineProps<{
  open: boolean;
  drama: Drama | null;
  busy: boolean;
  writable: boolean;
  error?: string;
}>();
const emit = defineEmits<{ close: []; save: [input: DramaInput] }>();
const form = ref<DramaInput>(emptyDrama());
const tagText = ref('');
const errors = ref<Partial<Record<keyof DramaInput, string>>>({});
const dirty = ref(false);
const closing = ref(false);
const disabled = computed(() => !props.writable || props.busy);
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    const drama = props.drama;
    form.value = drama
      ? {
          title: drama.title,
          synopsis: drama.synopsis,
          tags: [...drama.tags],
          badge: drama.badge,
          freeEpisodes: drama.freeEpisodes,
          scheduledAt: drama.scheduledAt,
        }
      : emptyDrama();
    tagText.value = form.value.tags.join(', ');
    errors.value = {};
    dirty.value = false;
    closing.value = false;
  },
);
function close() {
  if (props.busy) return;
  if (dirty.value) closing.value = true;
  else emit('close');
}
function submit() {
  if (disabled.value) return;
  const input = {
    ...form.value,
    title: form.value.title.trim(),
    tags: [
      ...new Set(
        tagText.value
          .split(/[,，]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ],
  };
  errors.value = validateDrama(input);
  if (Object.keys(errors.value).length) return;
  emit('save', input);
}
</script>
<template>
  <FormDrawer :open="open" :title="drama ? '编辑剧集' : '新建剧集'" :busy="busy" @close="close">
    <form
      id="drama-editor"
      class="native-form"
      @submit.prevent="submit"
      @input="dirty = true"
      @change="dirty = true"
    >
      <fieldset :disabled="disabled">
        <label
          >剧名<input
            v-model="form.title"
            required
            maxlength="200"
            :aria-invalid="!!errors.title"
          /><small v-if="errors.title" class="form-error">{{ errors.title }}</small></label
        >
        <label>简介<textarea v-model="form.synopsis" rows="5" /></label>
        <label>标签<input v-model="tagText" placeholder="多个标签用逗号分隔" /></label>
        <label
          >免费集数<input
            v-model.number="form.freeEpisodes"
            type="number"
            min="0"
            step="1"
            required
          /><small v-if="errors.freeEpisodes" class="form-error">{{
            errors.freeEpisodes
          }}</small></label
        >
        <label
          >角标<select v-model="form.badge">
            <option value="">无</option>
            <option>HOT</option>
            <option>NEW</option>
            <option>EXCLUSIVE</option>
          </select></label
        >
        <label
          >定时上架时间<input v-model="form.scheduledAt" type="datetime-local" /><small
            v-if="errors.scheduledAt"
            class="form-error"
            >{{ errors.scheduledAt }}</small
          ></label
        >
      </fieldset>
      <p v-if="error" role="alert" class="form-error">{{ error }}</p>
      <div v-if="closing" class="discard-warning" role="alert">
        <p>有未保存的修改，是否放弃？</p>
        <button type="button" @click="closing = false">继续编辑</button
        ><button type="button" @click="emit('close')">放弃修改</button>
      </div>
    </form>
    <template #footer
      ><button :disabled="busy" @click="close">取消</button
      ><button class="primary" type="submit" form="drama-editor" :disabled="disabled">
        {{ busy ? '保存中…' : '保存' }}
      </button></template
    >
  </FormDrawer>
</template>
