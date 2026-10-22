import { vi } from 'vitest';

/**
 * 项目未安装 jsdom，这里用最小 stub 提供 localStorage / location。
 *
 * client 读写 token 与 trace_id 都依赖 localStorage，不打这个桩的话
 * setAccessToken() 会静默失败，断言 Authorization 头时就会莫名其妙地挂掉。
 */
export function stubBrowser(search = ''): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  });
  vi.stubGlobal('window', { location: { search } });
  return store;
}
