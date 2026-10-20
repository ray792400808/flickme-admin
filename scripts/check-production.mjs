import { chromium } from '../.tools/ui-check/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

// Check the production artifact, not the development-only reference route.
const assets = await readdir(new URL('../dist/assets/', import.meta.url));
assert.equal(
  assets.some((name) => /WorkspaceView|runtime|ContentWorkspace/.test(name)),
  false,
  'prototype chunk must not ship',
);
for (const name of assets.filter((name) => name.endsWith('.js'))) {
  const code = await readFile(new URL('../dist/assets/' + name, import.meta.url), 'utf8');
  assert.equal(code.includes('flickme-workspace-v1:'), false, 'prototype storage must not ship');
  assert.equal(code.includes("The CEO's Trap"), false, 'business seed data must not ship');
}
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5181';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const unexpected = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'flickme-admin-session',
      JSON.stringify({ accessToken: 'test-only', expiresAt: Date.now() + 60000 }),
    ),
  );
  await page.route('**/admin/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me'))
      return route.fulfill({
        json: {
          data: {
            id: 42,
            email: 'tester@example.test',
            name: '验收管理员',
            role: 'admin',
            permissions: {
              overview: 'r',
              content: 'rw',
              system: 'rw',
              commerce: 'rw',
              ops: 'rw',
              users: 'rw',
            },
          },
        },
      });
    if (path.endsWith('/health'))
      return route.fulfill({ json: { data: { status: 'ok', service: 'flickme-admin-api' } } });
    unexpected.push(path);
    return route.fulfill({ status: 404, json: { message: 'Not available' } });
  });
  await page.goto(`${base}/#/dramas`);
  await page.getByRole('heading', { name: 'Short 剧库', exact: true }).waitFor();
  assert.equal(
    await page.locator('.workspace-host').count(),
    0,
    'no Shadow DOM workspace in production',
  );
  assert.equal(
    await page.getByRole('button', { name: '新建剧集', exact: true }).isDisabled(),
    true,
  );
  assert.equal(await page.locator('.native-table tbody tr').count(), 0);
  assert.ok(await page.getByText('剧库接口尚未接入', { exact: true }).isVisible());
  await page.screenshot({ path: '.tools/production-dramas.png', fullPage: true });
  await page.goto(`${base}/#/dashboard`);
  await page.getByText('统计接口尚未接入', { exact: true }).waitFor();
  await page.getByText('API 服务正常', { exact: true }).waitFor();
  assert.equal(await page.locator('.metrics').count(), 0, 'no mock KPIs');
  await page.goto(`${base}/#/cands`);
  await page.getByRole('heading', { name: 'AI 角色备选库', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: '从短剧生成角色', exact: true }).count(), 0);
  await page.goto(`${base}/#/preview/cands`);
  await page.getByRole('heading', { name: '页面不存在', exact: false }).waitFor();
  await page.goto(`${base}/#/login`);
  // Existing authenticated users are redirected; use a fresh context for the login check.
  const guest = await browser.newPage();
  await guest.goto(`${base}/#/login`);
  await guest.getByRole('heading', { name: 'Flickme 管理员登录' }).waitFor();
  assert.equal(await guest.getByRole('link', { name: /原型/ }).count(), 0);
  await guest.close();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [id, title] of Object.entries({
    chips: '首页分类 Chips',
    hot: '热门池与排序',
    launch: '启动弹窗',
    words: '搜索推荐词',
    filters: 'Stories 筛选标签',
    recs: '推荐位配置',
    userlist: '用户列表',
    coinadj: '金币调整',
  })) {
    await page.goto(`${base}/#/${id}`);
    await page.getByRole('heading', { name: title, exact: true }).waitFor();
    const action = {
      chips: '新增分类',
      hot: '发布',
      launch: '发布',
      words: '新增推荐词',
      filters: '新增分组',
    }[id];
    if (action)
      assert.equal(
        await page.getByRole('button', { name: action, exact: true }).isDisabled(),
        true,
      );
    if (id === 'coinadj')
      assert.equal(
        await page.getByRole('button', { name: '发起调整', exact: true }).isDisabled(),
        true,
      );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
  }
  await page.goto(`${base}/#/dramas`);
  await page.getByRole('heading', { name: 'Short 剧库', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(unexpected, [], 'no requests to invented business endpoints');
  assert.deepEqual(errors, []);
  console.log(
    'PASS production isolation, no seeded data, native Vue pages, disabled unavailable actions, real health response, mobile layout',
  );
} catch (error) {
  console.error('URL:', page.url(), 'Browser errors:', errors);
  console.error((await page.locator('body').innerText()).slice(0, 2000));
  throw error;
} finally {
  await browser.close();
}
