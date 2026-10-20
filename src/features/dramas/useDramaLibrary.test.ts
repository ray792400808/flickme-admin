import { effectScope, inject } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDramaLibrary } from './useDramaLibrary';
import { unavailableDramaRepository } from './repository';
import { emptyDrama } from './validation';
import type { DramaPage, DramaRepository } from './types';
vi.mock('vue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue')>()),
  inject: vi.fn(),
}));
const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
  vi.restoreAllMocks();
});
function library(repository: DramaRepository) {
  vi.mocked(inject).mockReturnValue(repository);
  const scope = effectScope();
  scopes.push(scope);
  return scope.run(useDramaLibrary)!;
}
function repository(overrides: Partial<DramaRepository> = {}): DramaRepository {
  return {
    available: true,
    list: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 }),
    create: vi.fn(),
    update: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    ...overrides,
  };
}
describe('drama library requests', () => {
  it('does not query or report successful saves without an integrated repository', async () => {
    const list = vi.fn();
    const model = library({ ...unavailableDramaRepository, list });
    await model.load();
    expect(list).not.toHaveBeenCalled();
    expect(await model.save(emptyDrama())).toBe(false);
    expect(model.rows.value).toEqual([]);
  });
  it('does not replace newer search results with an older response', async () => {
    const requests: ((value: DramaPage) => void)[] = [];
    const model = library(
      repository({
        list: vi.fn(() => new Promise<DramaPage>((resolve) => requests.push(resolve))),
      }),
    );
    const old = model.load();
    model.query.search = 'new';
    const current = model.load();
    requests[1]!({ items: [], total: 2, page: 1, pageSize: 10 });
    await current;
    requests[0]!({ items: [], total: 100, page: 1, pageSize: 10 });
    await old;
    expect(model.total.value).toBe(2);
    expect(model.loading.value).toBe(false);
  });
  it('shows write errors and prevents overlapping saves', async () => {
    let fail!: (error: Error) => void;
    const create = vi.fn(
      () =>
        new Promise<never>((_, reject) => {
          fail = reject;
        }),
    );
    const model = library(repository({ create }));
    const first = model.save({ ...emptyDrama(), title: '剧集' });
    expect(await model.save(emptyDrama())).toBe(false);
    fail(new Error('服务端验证失败'));
    expect(await first).toBe(false);
    expect(create).toHaveBeenCalledTimes(1);
    expect(model.error.value).toBe('服务端验证失败');
    expect(model.saving.value).toBe(false);
  });
});
