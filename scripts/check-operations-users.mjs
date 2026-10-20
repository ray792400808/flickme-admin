import { chromium } from '../.tools/ui-check/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5182';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [],
  writes = [],
  creationKeys = [];
let readonly = false,
  failCreation = true,
  conflictNextSave = false;
page.on('pageerror', (error) => errors.push(error.message));
const names = (en) => ({ en, 'zh-Hans': '', 'zh-Hant': '', es: '', pt: '', id: '', th: '' });
const data = {
  'chips:short': [
    {
      id: 'fixed',
      key: 'for_you',
      type: 'system',
      names: names('For you'),
      enabled: true,
      locked: true,
      starts_at: null,
      ends_at: null,
    },
  ],
  'chips:stories': [
    {
      id: 'fixed-stories',
      key: 'for_you',
      type: 'system',
      names: names('For you'),
      enabled: true,
      locked: true,
      starts_at: null,
      ends_at: null,
    },
  ],
  hot: {
    pool_size: 50,
    refresh_hours: 1,
    short_count: 9,
    stories_count: 8,
    page_size: 20,
    overrides: [{ drama_id: 1, title: 'Test drama', heat: 12, pinned: false, blocked: false }],
  },
  launch: { enabled: false, fallback_drama_id: null, cover_url: '', button_text: names('Watch') },
  words: [],
  filters: [],
  recs: [
    {
      id: 'rec1',
      name: '返回推荐',
      placement: 'player_exit',
      source: 'trending',
      count: 8,
      fallback: 'none',
      pinned_drama_id: null,
      enabled: true,
    },
  ],
};
const docs = Object.fromEntries(
  Object.entries(data).map(([key, draft]) => [
    key,
    { revision: 1, published_revision: 1, published_at: '2026-10-20T00:00:00Z', draft },
  ]),
);
const user = {
  id: 'u1',
  uid: '000123',
  login_provider: 'Apple',
  member_coins: 100,
  bonus: 20,
  membership: 'weekly',
  unlocked_episodes: 3,
  status: 'active',
  registered_at: '2026-10-20T00:00:00Z',
  ban_reason: null,
  version: 1,
};
const adjustment = (id, requester_id) => ({
  id,
  uid: user.uid,
  currency: 'bonus',
  amount: 10,
  reason: '纠错',
  status: 'pending',
  requester_id,
  requester_name: 'Applicant ' + requester_id,
  reviewer_name: null,
  review_reason: null,
  created_at: '2026-10-20T00:00:00Z',
  version: 1,
  can_review: true,
});
const adjustments = [adjustment('own', 42), adjustment('other', 7)];
const paged = (rows) => ({
  data: rows,
  current_page: 1,
  per_page: 10,
  total: rows.length,
  last_page: 1,
});
await page.addInitScript(() =>
  sessionStorage.setItem(
    'flickme-admin-session',
    JSON.stringify({ accessToken: 'test-only', expiresAt: Date.now() + 600000 }),
  ),
);
await page.route('**/admin/v1/**', async (route) => {
  const request = route.request(),
    url = new URL(request.url()),
    path = url.pathname.replace('/admin/v1', ''),
    method = request.method();
  const ok = (data) => route.fulfill({ json: { data } });
  if (path === '/auth/me')
    return ok({
      id: 42,
      name: '测试管理员',
      email: 'test@example.test',
      role: 'admin',
      permissions: { ops: readonly ? 'r' : 'rw', users: readonly ? 'r' : 'rw', overview: 'r' },
    });
  if (path === '/health') return ok({ status: 'ok' });
  if (path.startsWith('/ops/')) {
    const module = path.split('/')[2],
      key = module === 'chips' ? module + ':' + url.searchParams.get('channel') : module;
    if (method === 'GET') return ok(docs[key]);
    const body = request.postDataJSON();
    writes.push({ path, method, body });
    if (conflictNextSave && method === 'PUT') {
      conflictNextSave = false;
      docs[key].revision++;
      return route.fulfill({ status: 409, json: { message: '版本冲突，请重新加载' } });
    }
    if (body.revision !== docs[key].revision)
      return route.fulfill({ status: 409, json: { message: '版本冲突' } });
    if (method === 'PUT') {
      docs[key].draft = body.draft;
      docs[key].revision++;
    } else {
      assert.ok(request.headers()['idempotency-key']);
      docs[key].published_revision = docs[key].revision;
    }
    return ok(docs[key]);
  }
  if (path === '/users') return ok(paged([user]));
  if (path === '/users/u1') return ok(user);
  if (path === '/users/u1/status') {
    const body = request.postDataJSON();
    writes.push({ path, body });
    user.status = body.status;
    user.ban_reason = body.reason;
    user.version++;
    return ok(user);
  }
  if (path === '/coin-adjustments' && method === 'GET') return ok(paged(adjustments));
  if (path === '/coin-adjustments' && method === 'POST') {
    assert.deepEqual(Object.keys(request.postDataJSON()).sort(), ['amount','currency','reason','uid']);
    creationKeys.push(request.headers()['idempotency-key']);
    if (failCreation) {
      failCreation = false;
      return route.abort('failed');
    }
    const body = request.postDataJSON();
    writes.push({ path, body });
    const row = { ...adjustment('new', 42), ...body };
    adjustments.unshift(row);
    return ok(row);
  }
  if (path === '/coin-adjustments/other/review') {
    const body = request.postDataJSON();
    writes.push({ path, body });
    assert.ok(request.headers()['idempotency-key']);
    adjustments.find((row) => row.id === 'other').status =
      body.decision === 'approve' ? 'approved' : 'rejected';
    return ok(adjustments.find((row) => row.id === 'other'));
  }
  return route.fulfill({ status: 404, json: { message: 'Unexpected test endpoint ' + path } });
});
try {
  const pages = {
    chips: '首页分类 Chips',
    hot: '热门池与排序',
    launch: '启动弹窗',
    words: '搜索推荐词',
    filters: 'Stories 筛选标签',
    recs: '推荐位配置',
    userlist: '用户列表',
    coinadj: '金币调整',
  };
  for (const [id, title] of Object.entries(pages)) {
    await page.goto(`${base}/#/${id}`);
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.workspace-host').count(), 0);
    await page.screenshot({ path: `.tools/reference-${id}.png`, fullPage: true });
    console.log('PASS native page ' + id);
  }
  await page.goto(`${base}/#/chips`);
  await page.getByRole('button', { name: '新增分类', exact: true }).click();
  await page.getByLabel('tagKey', { exact: true }).fill('romance');
  await page.getByLabel('多语言名称（en）', { exact: true }).fill('Romance');
  await page.locator('.op-drawer[open]').getByRole('button', { name: '保存', exact: true }).click();
  await page.getByText('已保存', { exact: true }).waitFor();
  assert.equal(docs['chips:short'].draft.length, 2);
  await page.getByRole('button', { name: '发布更改', exact: true }).click();
  await page
    .locator('.confirm-dialog[open]')
    .getByRole('button', { name: '发布', exact: true })
    .click();
  await page.getByText('已发布 v2', { exact: true }).waitFor();
  await page.goto(`${base}/#/words`);
  await page.getByRole('button', { name: '新增推荐词', exact: true }).click();
  await page.getByLabel('推荐词', { exact: true }).fill('Romance');
  await page
    .locator('.op-drawer[open]')
    .getByRole('button', { name: '保存草稿', exact: true })
    .click();
  await page.getByText('已保存为草稿', { exact: true }).waitFor();
  assert.equal(docs.words.draft[0].sort, 5);
  await page.goto(`${base}/#/coinadj`);
  const approve = page.getByRole('button', { name: '批准', exact: true });
  await approve.first().waitFor();
  assert.equal(await approve.first().isDisabled(), true);
  await approve.nth(1).click();
  await page
    .locator('.confirm-dialog[open]')
    .getByRole('button', { name: '确认', exact: true })
    .click();
  await page.getByText('已批准', { exact: true }).waitFor();
  await page.getByRole('button', { name: '发起调整', exact: true }).click();
  assert.equal(await page.locator('.op-drawer[open]').getByRole('button',{name:'保存草稿',exact:true}).count(),0);
  await page.getByLabel('用户 UID', { exact: true }).fill('000123');
  await page.getByLabel('变动数量', { exact: true }).fill('-10');
  await page.getByLabel('原因(必填)', { exact: true }).fill('补偿核对');
  await page.getByRole('button', { name: '提交审批', exact: true }).click();
  await page
    .locator('.op-drawer[open]')
    .getByText('网络连接失败，请检查服务是否可用', { exact: true })
    .waitFor();
  assert.equal(await page.getByLabel('变动数量').getAttribute('readonly'), '');
  await page.getByRole('button', { name: '提交审批', exact: true }).click();
  await page.getByText('已提交,等待第二位管理员审批', { exact: true }).waitFor();
  assert.equal(creationKeys.length, 2);
  assert.equal(creationKeys[0], creationKeys[1]);
  assert.equal(user.member_coins, 100);
  assert.deepEqual(errors, []);
  console.log(
    'PASS real request boundary, save/publish, drafts, approval restrictions and idempotent retry',
  );
} catch (error) {
  console.error(page.url(), errors);
  console.error((await page.locator('body').innerText()).slice(-3500));
  await page.screenshot({ path: '.tools/operations-failure.png', fullPage: true });
  throw error;
} finally {
  await browser.close();
}
