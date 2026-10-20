/** Proposed domain contract. No backend endpoint is assumed until it is agreed. */
export type DramaStatus = 'draft' | 'published' | 'unpublished';
export type DramaBadge = '' | 'HOT' | 'NEW' | 'EXCLUSIVE';
export interface Drama {
  id: number;
  title: string;
  synopsis: string;
  tags: string[];
  badge: DramaBadge;
  status: DramaStatus;
  freeEpisodes: number;
  episodeCount: number;
  publishedEpisodeCount: number;
  coverUrl: string | null;
  scheduledAt: string | null;
  updatedAt: string;
}
export interface DramaInput {
  title: string;
  synopsis: string;
  tags: string[];
  badge: DramaBadge;
  freeEpisodes: number;
  scheduledAt: string | null;
}
export interface DramaQuery {
  search: string;
  status: DramaStatus | '';
  badge: DramaBadge;
  page: number;
  pageSize: number;
}
export interface DramaPage {
  items: Drama[];
  total: number;
  page: number;
  pageSize: number;
}
export interface DramaRepository {
  available: boolean;
  list(query: DramaQuery): Promise<DramaPage>;
  create(input: DramaInput): Promise<Drama>;
  update(id: number, input: DramaInput): Promise<Drama>;
  publish(id: number): Promise<Drama>;
  unpublish(id: number): Promise<Drama>;
}
