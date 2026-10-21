/**
 * 时间格式化工具
 *
 * 后端在下列表中都把日期序列化为 Unix 时间戳（秒）：
 *   - 整个 `flickme-api` 里所有 admin_* 表（AdminUser/AdminRole/AdminMenu/
 *     AdminPermission/AdminOperationLog 等）都 use App\\Models\\Concerns\\HasUnixTimestamps
 *     它把 $date->getTimestamp() 直接写到 JSON 里
 *   - admin_users.login_at 是 bigint unix 秒
 *
 * 前端不应该假设拿到的是 ISO 字符串，把它当 Date.parse('2025-10-21') 解析
 * 会被解释为 UTC 0 点，从而少 8 小时。所以提供一个支持两种格式的 helper：
 *   1. Unix 秒（数字或数字字符串）→ 乘 1000
 *   2. ISO / RFC822（兼容旧接口或前端本地时间）→ 原样 parse
 */

const MS = 1000;

/**
 * 把任意时间字段归一为 Date 对象；空值返回 null。
 *
 * 判定规则：
 *   - 数字 / 纯数字字符串：> 一万年才认作毫秒，否则一律按秒
 *     （普通时间戳乘 1000 后会超过 1e12，安全）
 *   - 其他：走 Date.parse
 */
export function toDate(value: number | string | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    // > 1e12 ≈ 2001-09-09 之后的毫秒时间戳；否则按秒解释
    return new Date(value > 1e12 ? value : value * MS);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // 纯数字字符串也走秒/毫秒分支
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (n <= 0) return null;
    return new Date(n > 1e12 ? n : n * MS);
  }

  // ISO / 其他日期字符串直接 parse
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 兼容 Unix 秒和 ISO 字符串，格式化为本地时间。
 * 例如：formatUnix(1760995472) -> '2025/10/21 11:24:32'
 */
export function formatUnix(
  value: number | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  },
): string {
  const d = toDate(value);
  if (!d) return '-';
  // toLocaleString 在 zh-CN 下输出 'YYYY/MM/DD HH:mm:ss'，是控制台日志常用的格式
  return d.toLocaleString('zh-CN', options).replace(/\//g, '-');
}

/**
 * 只显示日期。
 */
export function formatDateOnly(value: number | string | null | undefined): string {
  return formatUnix(value, { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).replace(
    /-\d{2}:\d{2}:\d{2}$/,
    '',
  );
}

/**
 * 友好显示：今天 HH:mm，其它日期 YYYY-MM-DD HH:mm。
 */
export function formatFriendly(value: number | string | null | undefined): string {
  const d = toDate(value);
  if (!d) return '-';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
  }
  return formatUnix(value);
}
