const TOKEN_KEY = 'flickme_admin_token';
const TRACE_KEY = 'flickme_admin_trace_id';
let unauthorizedHandler: (() => void) | undefined;

function readStored(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** 生成 32 位随机 trace_id（与后端 Str::random(32) 长度一致） */
function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const hasWindow = () => typeof window !== 'undefined';

/**
 * 取当前 trace_id：
 *   1. URL 上显式带 ?trace_id=xxx 时复用它（便于把整段排查看板指向同一条链路）
 *   2. 否则沿用本次会话已生成的 id，让同一页面的多个请求归到同一条链路
 *   3. 都没有则生成新的 32 位 id 并缓存
 */
export function getTraceId(): string {
  try {
    if (hasWindow()) {
      const fromQuery = new URLSearchParams(window.location.search).get('trace_id');
      if (fromQuery) {
        localStorage.setItem(TRACE_KEY, fromQuery);
        return fromQuery;
      }
    }
    const stored = localStorage.getItem(TRACE_KEY);
    if (stored) return stored;
    const created = generateTraceId();
    localStorage.setItem(TRACE_KEY, created);
    return created;
  } catch {
    /* 隐私模式 / 无 localStorage 环境下退化为一次性 id */
    return generateTraceId();
  }
}

/** 重新生成 trace_id（例如切换环境或需要排查全新链路时） */
export const resetTraceId = () => {
  try {
    localStorage.removeItem(TRACE_KEY);
  } catch {
    /* 忽略 */
  }
};

export function getToken(): string | null {
  return readStored();
}

export const setAccessToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 隐私模式下忽略 */
  }
};

export const onUnauthorized = (handler: () => void) => {
  unauthorizedHandler = handler;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: Record<string, string[]>,
    /** 后端业务码（App\Common\ResponseDef），失败时必带；成功恒为 200 */
    public readonly code?: number,
    /** 后端返回的 trace_id，排查问题时附在工单里 */
    public readonly traceId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export async function requestApi<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  // 每次发请求时从 localStorage 读最新 token（MCP 浏览器每次导航模块重新执行）
  const token = readStored();
  // 后端 TraceIdMiddleware 优先读取该头，用于串联「前端 → nginx → php-fpm → 日志」
  const traceId = getTraceId();

  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/admin'}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Trace-Id': traceId,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new ApiError(
      error instanceof DOMException && error.name === 'TimeoutError'
        ? '请求超时，请重试'
        : '网络连接失败，请检查服务是否可用',
      0,
    );
  }

  // 登录接口的 401 表示「账号或密码错误」，不是会话过期，
  // 不能触发全局登出，否则登录页会被误跳走。
  const isLoginRequest = path.startsWith('/auth/login');
  if (response.status === 401 && !isLoginRequest) {
    setAccessToken(null);
    unauthorizedHandler?.();
  }

  const payload = await response.json().catch(() => null);

  // 统一响应体：{ code, message, data, trace_id? }
  // 失败时 HTTP 状态码与业务 code 通常一致，但以 code 为准做业务分支。
  if (!response.ok) {
    throw new ApiError(
      payload?.message || `请求失败 (${response.status})`,
      response.status,
      // 校验失败时后端把 errors 放在 data 里
      payload?.data?.errors ?? payload?.errors,
      payload?.code,
      payload?.trace_id ?? traceId,
    );
  }

  if (!payload || !('data' in payload)) throw new ApiError('接口返回格式异常', response.status);
  // 后端保证失败时不会用 2xx；但如果将来某个接口返回 code !== 200，这里兜住。
  // code 缺省（老接口 / 探针）时按成功处理。
  if (typeof payload.code === 'number' && payload.code !== 200) {
    throw new ApiError(payload.message || '请求失败', response.status, payload.data?.errors, payload.code, payload.trace_id);
  }
  return payload.data as T;
}
