export const locales = ['en', 'zh-Hans', 'zh-Hant', 'es', 'pt', 'id', 'th'] as const;
export type Locale = (typeof locales)[number];
export type LocalizedText = Record<Locale, string>;
export const emptyLocalizedText = (): LocalizedText => ({
  en: '',
  'zh-Hans': '',
  'zh-Hant': '',
  es: '',
  pt: '',
  id: '',
  th: '',
});
export type Channel = 'short' | 'stories';
export interface HomeCategory {
  id: string;
  key: string;
  type: 'system' | 'tag';
  names: LocalizedText;
  enabled: boolean;
  locked: boolean;
  starts_at: string | null;
  ends_at: string | null;
}
export interface HotPoolItem {
  drama_id: number;
  title: string;
  heat: number;
  pinned: boolean;
  blocked: boolean;
}
export interface HotPoolConfig {
  pool_size: number;
  refresh_hours: 1 | 6 | 24;
  short_count: number;
  stories_count: number;
  page_size: number;
  overrides: HotPoolItem[];
}
export interface LaunchConfig {
  enabled: boolean;
  fallback_drama_id: number | null;
  cover_url: string;
  button_text: LocalizedText;
}
export interface SearchWord {
  id: string;
  names: LocalizedText;
  enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort: number;
  status: 'draft' | 'published';
}
export interface StoryFilter {
  id: string;
  key: string;
  names: LocalizedText;
  tag_keys: string[];
  enabled: boolean;
  order: number;
}
export interface Recommendation {
  id: string;
  name: string;
  placement: string;
  description?: string;
  source: 'personalized' | 'trending' | 'similar' | 'recent';
  count: number;
  fallback: 'trending' | 'none';
  pinned_drama_id: number | null;
  enabled: boolean;
}
export interface OperationsDocuments {
  chips: HomeCategory[];
  hot: HotPoolConfig;
  launch: LaunchConfig;
  words: SearchWord[];
  filters: StoryFilter[];
  recs: Recommendation[];
}
export type OperationsModule = keyof OperationsDocuments;
export interface ConfigDocument<T> {
  revision: number;
  published_revision: number | null;
  published_at: string | null;
  draft: T;
  published?: T;
  options?: { dramas: { id: number; title: string; cover_url?: string | null }[] };
}
