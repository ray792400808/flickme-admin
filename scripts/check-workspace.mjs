import { chromium } from '../.tools/ui-check/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5180';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const pages = [
  'overview',
  'dramas',
  'characters',
  'cands',
  'tags',
  'comments',
  'chips',
  'hot',
  'launch',
  'words',
  'filters',
  'recs',
  'userlist',
  'coinadj',
  'plans',
  'packs',
  'coupons',
  'rules',
  'orders',
  'models',
  'memory',
  'safety',
  'checkin',
  'taskcfg',
  'watch',
  'pushtasks',
  'liveact',
  'pushdef',
  'feedback',
  'accounts',
  'roles',
  'logs',
  'legal',
];
try {
  for (const id of pages) {
    await page.goto(`${base}/#/preview/${id}`);
    await page.locator('.workspace-host #view h1').waitFor();
    const heading = await page.locator('.workspace-host #view h1').innerText();
    assert.ok(heading.length, `${id}: missing title`);
    assert.equal(
      await page
        .locator('.workspace-host #view')
        .innerText()
        .then((text) => text.includes('undefined')),
      false,
      `${id}: undefined content`,
    );
    console.log(`PASS ${id}: ${heading}`);
  }

  await page.goto(`${base}/#/preview/dramas`);
  await page.locator('[data-act="pg"][data-page="2"]').first().click();
  assert.equal(await page.locator('#view tbody tr').count(), 2, 'drama pagination');
  await page.locator('#q').fill("The CEO's Trap");
  assert.equal(await page.locator('#view tbody tr').count(), 1, 'search resets pagination');
  await page.locator('#q').fill('no-result-for-this-query');
  assert.ok(
    (await page.locator('#view tbody').innerText()).includes('没有符合条件'),
    'empty state',
  );

  await page.goto(`${base}/#/preview/cands`);
  await page.getByRole('button', { name: '从短剧生成角色', exact: true }).click();
  await page.locator('[name="n"]').fill('2');
  await page.getByRole('button', { name: '开始生成', exact: true }).click();
  await page.locator('.workspace-body:not(.dopen)').waitFor();
  assert.equal(await page.locator('#view tbody tr').count(), 6, 'generate candidates');
  await page.locator('[data-act="ract"]').filter({ hasText: '加入角色库' }).first().click();
  await page.goto(`${base}/#/preview/characters`);
  assert.ok(
    (await page.locator('#view').innerText()).includes('待审核'),
    'candidate goes to review',
  );

  await page.goto(`${base}/#/preview/words`);
  await page.getByRole('button', { name: '新增推荐词', exact: true }).click();
  await page.locator('[name="word"]').fill('Workspace smoke test');
  await page.getByRole('button', { name: '发布', exact: true }).click();
  await page.reload();
  await page.locator('#q').fill('Workspace smoke test');
  assert.ok(
    (await page.locator('#view tbody').innerText()).includes('Workspace smoke test'),
    'data persists after reload',
  );

  await page.goto(`${base}/#/preview/chips`);
  await page.getByRole('button', { name: '新增分类', exact: true }).click();
  await page.locator('[name="tagKey"]').fill('test-category');
  await page.locator('[name="names.en"]').fill('Test category');
  await page.getByRole('button', { name: '简体中文', exact: true }).click();
  await page.locator('[name="names.zh-Hans"]').fill('测试分类');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  assert.ok(
    (await page.locator('#clist').innerText()).includes('Test category'),
    'multilingual category',
  );
  await page
    .locator('#clist .li')
    .filter({ hasText: 'Test category' })
    .getByRole('button', { name: '编辑' })
    .click();
  await page.getByRole('button', { name: '简体中文', exact: true }).click();
  assert.equal(
    await page.locator('[name="names.zh-Hans"]').inputValue(),
    '测试分类',
    'translations survive reopening',
  );
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '发布更改', exact: true }).click();
  await page.locator('[data-act="mok"]').click();
  assert.equal(await page.locator('.banner.warn').count(), 0, 'publish category');

  await page.getByRole('button', { name: '切换深色主题', exact: true }).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await page.locator('.workspace-host').getAttribute('data-theme'), 'dark');
  assert.equal(
    await page
      .locator('.workspace-host .workspace-body')
      .evaluate((element) => getComputedStyle(element).backgroundColor),
    'rgb(17, 15, 16)',
    'workspace uses the dark palette',
  );
  await page.screenshot({ path: '.tools/workspace-dark.png', fullPage: true });
  await page.getByRole('button', { name: '切换浅色主题', exact: true }).click();
  await page.goto(`${base}/#/preview/cands`);
  await page.locator('#view h1').waitFor();
  await page.screenshot({ path: '.tools/workspace-cands.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '打开菜单', exact: true }).click();
  assert.ok(await page.locator('.admin-side.is-open').isVisible());
  await page.getByRole('button', { name: '关闭菜单', exact: true }).click();
  assert.equal(await page.locator('.admin-side.is-open').count(), 0);
  await page.screenshot({ path: '.tools/workspace-mobile.png', fullPage: true });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    'no mobile horizontal overflow',
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route('**/admin/v1/**', async (route) => {
    if (route.request().url().endsWith('/auth/me'))
      return route.fulfill({
        json: {
          data: {
            id: 42,
            email: 'reader@example.test',
            name: '只读测试',
            role: 'content',
            permissions: { content: 'r' },
          },
        },
      });
    return route.fulfill({ json: { data: { status: 'ok' } } });
  });
  await page.evaluate(() =>
    sessionStorage.setItem(
      'flickme-admin-session',
      JSON.stringify({ accessToken: 'test-only', expiresAt: Date.now() + 60000 }),
    ),
  );
  await page.reload();
  await page.locator('.workspace-host #view h1').waitFor();
  await page.goto(`${base}/#/cands`);
  await page.getByText('只读测试', { exact: true }).waitFor({ timeout: 5000 });
  await page.getByText('业务接口尚未接入', { exact: true }).waitFor();
  assert.equal(
    await page.getByRole('button', { name: '从短剧生成角色', exact: true }).count(),
    0,
    'formal workspace never exposes prototype generation',
  );
  assert.equal(
    await page.getByRole('link', { name: '评论管理', exact: true }).count(),
    0,
    'comments require service permission',
  );
  await page.goto(`${base}/#/plans`);
  await page.waitForURL('**/#/forbidden');
  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log(
    `PASS ${pages.length} pages, pagination, search, AI workflow, persistence, multilingual form, theme, mobile navigation`,
  );
} catch (error) {
  console.error('BROWSER ERRORS:', errors);
  console.error('URL:', page.url());
  console.error('BODY:', (await page.locator('body').innerText()).slice(0, 2000));
  await page.screenshot({ path: '.tools/workspace-failure.png', fullPage: true });
  throw error;
} finally {
  await browser.close();
}
