import type { Episode, Row } from '../types/content';
export function getEpisodes(row: Row): Episode[] {
  return (
    row.episodeItems ??
    Array.from({ length: row.episodes }, (_, i) => ({
      number: i + 1,
      filename: i < row.ready ? `ep${String(i + 1).padStart(2, '0')}.mp4` : '',
      size: i < row.ready ? '42 MB' : '—',
      ready: i < row.ready,
      published: row.status === '上架' && i < row.ready,
    }))
  );
}
export function syncEpisodes(row: Row): void {
  if (!row.episodeItems) return;
  row.episodes = row.episodeItems.length;
  row.ready = row.episodeItems.filter((e) => e.ready).length;
}
export function canPublish(row: Row): boolean {
  const episodes = getEpisodes(row);
  return (
    episodes.length > 0 &&
    episodes.slice(0, Math.min(row.free, episodes.length)).every((e) => e.ready)
  );
}
