import type { InjectionKey } from 'vue';
import type { DramaRepository } from './types';

export const DRAMA_INTEGRATION_MESSAGE =
  '当前后端尚未提供剧库接口。列表查询、保存及上下架暂不可用。';
export const dramaRepositoryKey: InjectionKey<DramaRepository> = Symbol('DramaRepository');

/** Replace with an API adapter only after confirming the backend contract. */
const unavailable = () => Promise.reject(new Error(DRAMA_INTEGRATION_MESSAGE));
export const unavailableDramaRepository: DramaRepository = {
  available: false,
  list: unavailable,
  create: unavailable,
  update: unavailable,
  publish: unavailable,
  unpublish: unavailable,
};
