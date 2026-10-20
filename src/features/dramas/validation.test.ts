import { describe, expect, it } from 'vitest';
import { emptyDrama, validateDrama } from './validation';
describe('drama input validation', () => {
  it('requires a title and an integer free-episode count', () => {
    expect(validateDrama({ ...emptyDrama(), title: '   ', freeEpisodes: 1.5 })).toMatchObject({
      title: expect.any(String),
      freeEpisodes: expect.any(String),
    });
    expect(validateDrama({ ...emptyDrama(), title: '剧集', freeEpisodes: -1 })).toHaveProperty(
      'freeEpisodes',
    );
  });
  it('rejects invalid scheduling without rejecting an unset schedule', () => {
    expect(
      validateDrama({ ...emptyDrama(), title: '剧集', scheduledAt: 'invalid' }),
    ).toHaveProperty('scheduledAt');
    expect(validateDrama({ ...emptyDrama(), title: '剧集' })).toEqual({});
  });
});
