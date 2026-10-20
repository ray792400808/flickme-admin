export type Row = {
  cover?: string;
  publishAt?: string;
  episodeItems?: Episode[];
  id: string;
  name: string;
  tags: string[];
  author: string;
  chats: string;
  status: string;
  episodes: number;
  ready: number;
  free: number;
  badge: string;
  views: string;
  description: string;
  opening: string;
  q1: string;
  q2: string;
  reason: string;
};

export interface Episode {
  number: number;
  filename: string;
  size: string;
  ready: boolean;
  published: boolean;
}
