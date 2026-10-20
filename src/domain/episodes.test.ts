import { describe, expect, it } from 'vitest';
import { make } from './content';
import { canPublish, getEpisodes, syncEpisodes } from './episodes';
describe('episode publishing rules', () => {
  it('requires at least one episode even when all episodes are free', () => {
    expect(canPublish(make('', '', '草稿', [], { free: 0 }))).toBe(false);
  });
  it('checks the actual free episodes rather than the total ready count', () => {
    const row = make('D1', 'Test', '草稿', [], {
      free: 1,
      episodeItems: [
        { number: 1, filename: 'first.mp4', size: '1 MB', ready: false, published: false },
        { number: 2, filename: 'second.mp4', size: '1 MB', ready: true, published: false },
      ],
    });
    syncEpisodes(row);
    expect(row.ready).toBe(1);
    expect(row.episodes).toBe(2);
    expect(canPublish(row)).toBe(false);
    row.episodeItems![0]!.ready = true;
    expect(canPublish(row)).toBe(true);
  });
  it('normalizes seed rows into independent episode records', () => {
    const row = make('D1', 'Test', '上架', [], { episodes: 3, ready: 2, free: 2 });
    const episodes = getEpisodes(row);
    expect(episodes).toHaveLength(3);
    expect(episodes[0]?.published).toBe(true);
    expect(episodes[2]?.ready).toBe(false);
    expect(canPublish(row)).toBe(true);
  });
});
