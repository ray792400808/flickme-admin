let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | undefined;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const onUnauthorized = (handler: () => void) => {
  unauthorizedHandler = handler;
};
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export async function requestApi<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/admin/v1'}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
  if (response.status === 401 && accessToken) {
    accessToken = null;
    unauthorizedHandler?.();
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      payload?.message || `请求失败 (${response.status})`,
      response.status,
      payload?.errors,
    );
  if (!payload || !('data' in payload)) throw new ApiError('接口返回格式异常', response.status);
  return payload.data as T;
}
