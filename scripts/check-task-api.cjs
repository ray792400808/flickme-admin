const { chromium } = require('../.tools/ui-check/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let state = {
      revision: 1,
      published_revision: 1,
      published_at: null,
      draft: { sec: 5, coins: 2, cap: 600 },
      published: { sec: 5, coins: 2, cap: 600 },
    };
    let conflict = false,
      publishes = 0;
    await page.route('**/admin/tasks/**', async (route) => {
      const req = route.request();
      const body = req.method() === 'GET' ? null : req.postDataJSON();
      if (conflict && req.method() === 'PUT') {
        await route.fulfill({ status: 409, json: { message: '版本冲突' } });
        return;
      }
      if (req.method() === 'PUT') {
        assert.equal(body.revision, state.revision);
        state = { ...state, revision: state.revision + 1, draft: body.draft };
      }
      if (req.url().endsWith('/publish')) {
        assert.ok(body.idempotency_key);
        assert.equal(body.revision, state.revision);
        publishes++;
        state = { ...state, published_revision: state.revision, published: { ...state.draft } };
      }
      await route.fulfill({ json: { data: state } });
    });
    await page.goto('http://127.0.0.1:5174/');
    await page.locator('input[type=email]').fill('admin@flickme.com');
    await page.locator('input[type=password]').fill('admin123');
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/#/dashboard');
    await page.goto('http://127.0.0.1:5174/#/watch');
    await page.getByLabel('每满(秒)', { exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('fieldset').disabled);
    await page.getByLabel('每满(秒)', { exact: true }).fill('10');
    await page.getByRole('button', { name: '保存草稿', exact: true }).click();
    await page.getByText('草稿已保存，尚未发布', { exact: true }).waitFor();
    assert.equal(state.published.sec, 5);
    assert.equal(state.draft.sec, 10);
    await page.getByRole('button', { name: '发布', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: '发布', exact: true }).click();
    await page.getByText('配置已发布，以服务端生效时间为准', { exact: true }).waitFor();
    assert.equal(publishes, 1);
    assert.equal(state.published.sec, 10);
    await page.reload();
    await page.waitForFunction(
      () => document.querySelector('fieldset') && !document.querySelector('fieldset').disabled,
    );
    assert.equal(await page.getByLabel('每满(秒)', { exact: true }).inputValue(), '10');
    conflict = true;
    await page.getByLabel('每满(秒)', { exact: true }).fill('20');
    await page.getByRole('button', { name: '保存草稿', exact: true }).click();
    await page.getByText('配置已被其他管理员更新，请重新加载后再编辑。', { exact: true }).waitFor();
    assert.equal(
      await page.getByRole('button', { name: '保存草稿', exact: true }).isDisabled(),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      'PASS: mocked API save, draft isolation, publish, reload, and 409 conflict. Not a real backend integration test.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
