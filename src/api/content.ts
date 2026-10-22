import { requestApi } from './client';
import type { PageData } from './admin';

// ============================================================
// 共享类型
// ============================================================

export interface Language {
  id: number;
  code: string;
  name: string;
  native_name: string;
  flag_emoji: string | null;
  enabled: number;
  sort: number;
  created_at: number | null;
  updated_at: number | null;
}

/** 语言下拉选项（/languages/options 返回的精简结构） */
export interface LanguageOption {
  id: number;
  code: string;
  name: string;
  native_name: string;
  flag_emoji: string | null;
}

export interface Badge {
  id: number;
  keyword: string;
  label: string | null;
  sort: number;
  enabled: number;
  created_at: number | null;
  updated_at: number | null;
}

/** 角标下拉选项（/badges/options 返回的精简结构） */
export interface BadgeOption {
  id: number;
  keyword: string;
  label: string | null;
}

export interface TagTranslation {
  id: number;
  language_id: number;
  language_code: string;
  name: string;
  description: string | null;
}

export interface Tag {
  id: number;
  code: string;
  type: number;
  type_label: string;
  name: string;
  description: string | null;
  language_id: number;
  language_code: string;
  language: { id: number; code: string; name: string } | null;
  status: number;
  status_label: string;
  translations: TagTranslation[];
  created_at: number | null;
  updated_at: number | null;
}

export interface DramaEpisode {
  id: number;
  drama_id: number;
  episode_no: number;
  title: string | null;
  duration_sec: number;
  status: number;
  status_label: string;
  is_pay: number;
  video_url: string | null;
  poster_url: string | null;
  created_at: number | null;
  updated_at: number | null;
}

export interface Drama {
  id: number;
  title: string;
  synopsis: string | null;
  cover_url: string | null;
  video_url: string | null;
  status: number;
  status_label: string;
  badge_id: number | null;
  badge: { id: number; keyword: string; label: string | null } | null;
  language_id: number;
  language: { id: number; code: string; name: string } | null;
  free_episodes: number;
  episodes_num: number;
  creator_admin_id: number | null;
  creator: { id: number; name: string } | null;
  updated_by: number | null;
  published_at: number | null;
  created_at: number | null;
  updated_at: number | null;
  tags: Array<{ id: number; code: string; name: string }>;
  episodes?: DramaEpisode[];
}

/** 分页响应体：与 Laravel paginator 一致 */
export type PagedResponse<T> = PageData<T>;

function toQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

// ============================================================
// 语言
// ============================================================

export const languageApi = {
  list: (params?: { keyword?: string; enabled?: number; page?: number; per_page?: number }) =>
    requestApi<PagedResponse<Language>>(`/languages${toQuery(params ?? {})}`),

  options: () => requestApi<LanguageOption[]>('/languages/options'),

  create: (body: Partial<Language>) => requestApi<Language>('/languages', 'POST', body),

  show: (id: number) => requestApi<Language>(`/languages/${id}`),

  update: (id: number, body: Partial<Language>) =>
    requestApi<Language>(`/languages/${id}`, 'PATCH', body),

  delete: (id: number) => requestApi<{ deleted: boolean }>(`/languages/${id}`, 'DELETE'),
};

// ============================================================
// 角标
// ============================================================

export const badgeApi = {
  list: (params?: { keyword?: string; enabled?: number; page?: number; per_page?: number }) =>
    requestApi<PagedResponse<Badge>>(`/badges${toQuery(params ?? {})}`),

  options: () => requestApi<BadgeOption[]>('/badges/options'),

  create: (body: Partial<Badge>) => requestApi<Badge>('/badges', 'POST', body),

  show: (id: number) => requestApi<Badge>(`/badges/${id}`),

  update: (id: number, body: Partial<Badge>) => requestApi<Badge>(`/badges/${id}`, 'PATCH', body),

  delete: (id: number) => requestApi<{ deleted: boolean }>(`/badges/${id}`, 'DELETE'),
};

// ============================================================
// 标签与合集
// ============================================================

export const tagApi = {
  list: (params?: {
    keyword?: string;
    type?: number;
    status?: number;
    lang?: string;
    page?: number;
    per_page?: number;
  }) => requestApi<PagedResponse<Tag>>(`/tags${toQuery(params ?? {})}`),

  options: (params?: { type?: number; lang?: string }) =>
    requestApi<Array<{ id: number; code: string; name: string }>>(
      `/tags/options${toQuery(params ?? {})}`,
    ),

  stats: () => requestApi<Record<string, number>>('/tags/stats'),

  create: (body: Record<string, unknown>) => requestApi<Tag>('/tags', 'POST', body),

  show: (id: number) => requestApi<Tag>(`/tags/${id}`),

  update: (id: number, body: Record<string, unknown>) =>
    requestApi<Tag>(`/tags/${id}`, 'PATCH', body),

  delete: (id: number) => requestApi<{ deleted: boolean }>(`/tags/${id}`, 'DELETE'),
};

// ============================================================
// 剧库
// ============================================================

export const dramaApi = {
  list: (params?: {
    q?: string;
    status?: number;
    badge_id?: number;
    tag_id?: number;
    sort?: string;
    dir?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
  }) => requestApi<PagedResponse<Drama>>(`/dramas${toQuery(params ?? {})}`),

  show: (id: number) => requestApi<Drama>(`/dramas/${id}`),

  create: (body: Record<string, unknown>) => requestApi<Drama>('/dramas', 'POST', body),

  update: (id: number, body: Record<string, unknown>) =>
    requestApi<Drama>(`/dramas/${id}`, 'PATCH', body),

  delete: (id: number) => requestApi<{ deleted: boolean }>(`/dramas/${id}`, 'DELETE'),

  // ── 分集 ──
  listEpisodes: (id: number) => requestApi<DramaEpisode[]>(`/dramas/${id}/episodes`),

  createEpisode: (id: number, body: Record<string, unknown>) =>
    requestApi<DramaEpisode>(`/dramas/${id}/episodes`, 'POST', body),

  updateEpisode: (id: number, episodeId: number, body: Record<string, unknown>) =>
    requestApi<DramaEpisode>(`/dramas/${id}/episodes/${episodeId}`, 'PATCH', body),

  deleteEpisode: (id: number, episodeId: number) =>
    requestApi<{ deleted: boolean }>(`/dramas/${id}/episodes/${episodeId}`, 'DELETE'),
};

export type { PageData };
