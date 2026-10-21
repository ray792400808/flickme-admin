const { chromium } = require('../.tools/ui-check/node_modules/playwright');
const assert = require('node:assert/strict');
const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
const clone = (v) => JSON.parse(JSON.stringify(v));
const initial = () => ({
  '/check-in-rewards': {
    revision: 1,
    published_revision: null,
    published_at: null,
    published: null,
    draft: Array.from({ length: 7 }, (_, i) => ({
      id: `CK${i + 1}`,
      day: `Day ${i + 1}`,
      reward: 10 + i,
    })),
  },
  '/tasks': {
    revision: 1,
    published_revision: null,
    published_at: null,
    published: null,
    draft: [
      {
        id: 'opaque/task-id',
        group: '日常任务',
        name: 'Daily task',
        reward: 5,
        reset: '每日',
        en: true,
      },
    ],
  },
  '/watch-rewards': {
    revision: 1,
    published_revision: 1,
    published_at: 1700000000,
    published: { sec: 5, coins: 2, cap: 600 },
    draft: { sec: 5, coins: 2, cap: 600 },
  },
});
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    async function session(permissions = ['tasks.*']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      const errors = [],
        requests = [],
        keys = [];
      let docs = initial(),
        failPublish = true,
        failWrite = '',
        gets = 0;
      const menus = ['签到奖励', '任务配置', '实时观看奖励'].map((title, i) => ({
        id: i + 1,
        path: ['/checkin', '/taskcfg', '/watch'][i],
        component: ['/tasks/CheckinView', '/tasks/TaskConfigView', '/tasks/WatchRewardsView'][i],
        meta: { title, isHidden: false },
      }));
      const user = {
        id: 99,
        name: 'Contract test',
        email: 'test@example.com',
        is_super_admin: false,
        permissions,
        roles: [],
        menus,
      };
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('dialog', (d) => d.accept());
      await page.addInitScript(() => localStorage.setItem('flickme_admin_token', 'mock-token'));
      await page.route('**/admin/**', async (route) => {
        const req = route.request(),
          url = new URL(req.url()),
          path = url.pathname.slice('/admin'.length),
          method = req.method();
        if (path === '/auth/me') return route.fulfill({ json: { code: 200, data: user } });
        if (path === '/health')
          return route.fulfill({ json: { code: 200, data: { status: 'ok' } } });
        requests.push({ path, method });
        const resource = path.startsWith('/check-in-rewards')
          ? '/check-in-rewards'
          : path.startsWith('/watch-rewards')
            ? '/watch-rewards'
            : '/tasks';
        if (method === 'GET') {
          gets++;
          return route.fulfill({ json: { code: 200, data: docs[resource] } });
        }
        const body = req.postDataJSON();
        if (failWrite) {
          const status = Number(failWrite);
          failWrite = '';
          return route.fulfill({
            status,
            json: {
              code: status === 409 ? 1003 : status,
              message: status === 409 ? '版本过期' : '校验失败',
              data: { errors: { 'draft.cap': ['每日上限不能小于奖励'] } },
            },
          });
        }
        if (path.endsWith('/publish')) {
          const key = req.headers()['idempotency-key'];
          assert.ok(key);
          assert.deepEqual(Object.keys(body), ['revision']);
          keys.push(key);
          if (failPublish) {
            failPublish = false;
            return route.abort('failed');
          }
          assert.equal(body.revision, docs[resource].revision);
          docs[resource].published = clone(docs[resource].draft);
          docs[resource].published_revision = docs[resource].revision;
          docs[resource].published_at = 1700000000;
        } else {
          assert.equal(body.revision, docs[resource].revision);
          if (resource === '/tasks') {
            assert.equal(method === 'PUT', false);
            if (body.task) assert.equal('id' in body.task, false);
            if (method === 'POST')
              docs[resource].draft.push({
                ...body.task,
                id: 'server-generated',
                name:
                  body.task.group === '观看任务'
                    ? `Watch dramas for ${Math.round(body.task.sec / 6) / 10} min`
                    : body.task.name,
              });
            else {
              const id = decodeURIComponent(path.slice('/tasks/'.length)),
                idx = docs[resource].draft.findIndex((r) => r.id === id);
              assert.ok(idx >= 0);
              if (method === 'DELETE') docs[resource].draft.splice(idx, 1);
              else docs[resource].draft[idx] = { ...docs[resource].draft[idx], ...body.task };
            }
          } else docs[resource].draft = body.draft;
          docs[resource].revision++;
          if (resource === '/watch-rewards') {
            docs[resource].published = clone(body.draft);
            docs[resource].published_revision = docs[resource].revision;
            docs[resource].published_at = 1700000000;
          }
        }
        return route.fulfill({ json: { code: 200, message: 'ok', data: docs[resource] } });
      });
      await page.goto(base + '/#/checkin');
      await page.getByRole('heading', { name: '签到奖励', exact: true }).waitFor();
      return {
        page,
        errors,
        requests,
        keys,
        docs,
        setFailure: (v) => (failWrite = v),
        getCount: () => gets,
      };
    }
    const s = await session(),
      p = s.page;
    await p.getByRole('button', { name: '编辑', exact: true }).first().click();
    await p.getByLabel('奖励金币', { exact: true }).fill('42');
    await p.getByRole('button', { name: '应用到草稿' }).click();
    await p.getByRole('button', { name: '保存草稿', exact: true }).click();
    await p.getByText('草稿已保存，尚未发布', { exact: true }).waitFor();
    assert.equal(s.docs['/check-in-rewards'].published, null);
    await p.getByRole('button', { name: '发布', exact: true }).click();
    await p.getByRole('dialog').getByRole('button', { name: '发布', exact: true }).click();
    await p
      .getByRole('dialog')
      .getByText('网络连接失败，请检查服务是否可用', { exact: true })
      .waitFor();
    await p.getByRole('dialog').getByRole('button', { name: '发布', exact: true }).click();
    await p.getByText('配置已发布', { exact: true }).waitFor();
    assert.equal(s.keys[0], s.keys[1]);
    assert.equal(s.docs['/check-in-rewards'].published[0].reward, 42);
    await p.goto(base + '/#/taskcfg');
    await p.getByRole('heading', { name: '任务配置', exact: true }).waitFor();
    await p.getByLabel('任务分组', { exact: true }).selectOption('观看任务');
    await p.getByRole('button', { name: '新增任务' }).click();
    await p.getByLabel('分组', { exact: true }).selectOption('观看任务');
    await p.getByLabel('累计播放秒数', { exact: true }).fill('240');
    await p.getByLabel('奖励金币', { exact: true }).fill('12');
    await p.getByRole('dialog').getByRole('button', { name: '保存草稿', exact: true }).click();
    await p.getByText('Watch dramas for 4 min', { exact: true }).waitFor();
    assert.equal(await p.locator('tbody tr').count(), 1);
    await p.getByRole('switch').click();
    await p.getByRole('switch').waitFor();
    await p.waitForFunction(() => !document.querySelector('[role=switch]').checked);
    assert.equal(s.docs['/tasks'].draft[1].en, false);
    await p.getByRole('button', { name: '删除', exact: true }).click();
    await p.getByRole('dialog').getByRole('button', { name: '删除', exact: true }).click();
    await p.getByText('没有符合条件的记录', { exact: true }).waitFor();
    assert.equal(s.docs['/tasks'].draft.length, 1);
    await p.goto(base + '/#/watch');
    await p.getByLabel('每满(秒)', { exact: true }).waitFor();
    await p.waitForFunction(() => !document.querySelector('fieldset').disabled);
    assert.equal(await p.getByRole('button', { name: '发布', exact: true }).count(), 0);
    await p.getByLabel('每满(秒)', { exact: true }).fill('10');
    await p.getByRole('button', { name: '保存并生效' }).click();
    await p.getByText('已保存并生效', { exact: true }).waitFor();
    assert.equal(s.docs['/watch-rewards'].published.sec, 10);
    s.setFailure('422');
    await p.getByLabel('每满(秒)', { exact: true }).fill('12');
    await p.getByRole('button', { name: '保存并生效' }).click();
    await p
      .getByText(/每日上限: 每日上限不能小于奖励/)
      .first()
      .waitFor();
    assert.equal(await p.getByLabel('每满(秒)', { exact: true }).inputValue(), '12');
    s.setFailure('409');
    await p.getByRole('button', { name: '保存并生效' }).click();
    await p
      .getByText('当前版本或请求结果需要核实，请重新加载后再编辑。', { exact: true })
      .waitFor();
    assert.equal(await p.getByRole('button', { name: '保存并生效' }).isDisabled(), true);
    await p.getByRole('button', { name: '重新加载' }).click();
    await p.waitForFunction(() => !document.querySelector('fieldset').disabled);
    assert.equal(await p.getByLabel('每满(秒)', { exact: true }).inputValue(), '10');
    s.setFailure('500');
    await p.getByLabel('每满(秒)', { exact: true }).fill('15');
    await p.getByRole('button', { name: '保存并生效' }).click();
    await p.getByText(/请求结果尚未确认/).first().waitFor();
    assert.equal(await p.getByRole('button', { name: '保存并生效' }).isDisabled(), true);
    await p.getByRole('button', { name: '重新加载' }).click();
    await p.waitForFunction(() => !document.querySelector('fieldset').disabled);
    s.setFailure('403');
    await p.getByLabel('每满(秒)', { exact: true }).fill('16');
    await p.getByRole('button', { name: '保存并生效' }).click();
    await p.getByText(/每日上限: 每日上限不能小于奖励/).first().waitFor();
    assert.equal(s.docs['/watch-rewards'].draft.sec, 10);
    await p.getByRole('button', { name: '还原', exact: true }).click();
    assert.deepEqual(s.errors, []);
    await p.screenshot({ path: '.tools/task-api-watch.png' });
    const read = await session(['tasks.view']);
    await read.page.getByText('Day 1', { exact: true }).waitFor();
    assert.equal(
      await read.page.getByRole('button', { name: '编辑', exact: true }).first().isDisabled(),
      true,
    );
    assert.equal(
      await read.page.getByRole('button', { name: '发布', exact: true }).isDisabled(),
      true,
    );
    await read.page.close();
    const none = await session([]);
    await none.page.getByText('没有查看激励任务配置的权限。', { exact: true }).waitFor();
    assert.equal(none.getCount(), 0);
    await none.page.close();
    const edit = await session(['tasks.view', 'tasks.edit']);
    await edit.page.getByText('Day 1', { exact: true }).waitFor();
    assert.equal(
      await edit.page.getByRole('button', { name: '编辑', exact: true }).first().isEnabled(),
      true,
    );
    assert.equal(
      await edit.page.getByRole('button', { name: '发布', exact: true }).isDisabled(),
      true,
    );
    await edit.page.close();
    const pub = await session(['tasks.view', 'tasks.publish']);
    await pub.page.getByText('Day 1', { exact: true }).waitFor();
    assert.equal(
      await pub.page.getByRole('button', { name: '编辑', exact: true }).first().isDisabled(),
      true,
    );
    assert.equal(
      await pub.page.getByRole('button', { name: '发布', exact: true }).isEnabled(),
      true,
    );
    await pub.page.close();
    console.log(
      'PASS: real-contract mocked endpoints, full checkin save, idempotent publication retry, task creation/toggle/delete/filter, watch immediate save, 422/409, read/edit/publish/no-read permissions. No backend configuration written.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
