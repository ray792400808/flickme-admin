const { chromium } = require('../.tools/ui-check/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [],
      writes = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('dialog', (d) => d.accept());
    page.on('request', (r) => {
      if (r.url().includes('/tasks/') && r.method() !== 'GET') writes.push(r.url());
    });
    await page.goto('http://127.0.0.1:5173/');
    await page.locator('input[type=email]').fill('admin@flickme.com');
    await page.locator('input[type=password]').fill('admin123');
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/#/dashboard');
    await page.goto('http://127.0.0.1:5173/#/checkin');
    await page.getByRole('heading', { name: '签到奖励', exact: true }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 7);
    assert.equal(
      await page.getByRole('button', { name: '保存草稿', exact: true }).isDisabled(),
      true,
    );
    await page.getByRole('button', { name: '编辑', exact: true }).first().click();
    await page.getByLabel('奖励金币', { exact: true }).fill('42');
    await page.getByRole('button', { name: '应用到预览' }).click();
    assert.match(await page.locator('tbody tr').first().innerText(), /42/);
    await page.screenshot({ path: '.tools/task-checkin.png', fullPage: true });
    await page.goto('http://127.0.0.1:5173/#/taskcfg');
    await page.getByRole('heading', { name: '任务配置', exact: true }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 8);
    await page.getByRole('button', { name: '下一页' }).click();
    assert.equal(await page.locator('tbody tr').count(), 5);
    await page.getByLabel('任务分组', { exact: true }).selectOption('观看任务');
    assert.equal(await page.locator('tbody tr').count(), 5);
    await page.getByRole('button', { name: '新增任务' }).click();
    await page.getByLabel('分组', { exact: true }).selectOption('观看任务');
    await page.getByLabel('累计播放秒数', { exact: true }).fill('1200');
    await page.getByLabel('奖励金币', { exact: true }).fill('50');
    await page.getByRole('button', { name: '应用到预览' }).click();
    assert.equal(await page.getByText('Watch dramas for 20 min', { exact: true }).count(), 1);
    await page.screenshot({ path: '.tools/task-config.png', fullPage: true });
    await page.goto('http://127.0.0.1:5173/#/watch');
    await page.getByRole('heading', { name: '实时观看奖励', exact: true }).waitFor();
    await page.getByLabel('每满(秒)', { exact: true }).fill('10');
    await page.getByRole('button', { name: '还原', exact: true }).click();
    assert.equal(await page.getByLabel('每满(秒)', { exact: true }).inputValue(), '5');
    await page.screenshot({ path: '.tools/task-watch.png', fullPage: true });
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    console.log(
      'PASS: checkin editing; task filtering, pagination and creation; watch reset; offline writes disabled; no runtime errors',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
