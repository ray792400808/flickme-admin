// Run against the local development API with an administrator account.
const base = process.env.ADMIN_API_URL || 'http://127.0.0.1:5173/admin';
const login = await fetch(`${base}/auth/login`, {
  method: 'POST',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL || 'admin@flickme.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  }),
});
const session = await login.json();
if (!login.ok) throw new Error(session.message || `Login failed: ${login.status}`);
async function api(path, body) {
  const response = await fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.data.token}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));
  return result.data;
}
const tree = await api('/menus');
const flat = [];
function walk(nodes) {
  for (const node of nodes) { flat.push(node); walk(node.children || []); }
}
walk(tree);
async function ensure(title, path, parentId, component, sort, icon) {
  const existing = flat.find(menu => menu.path === path);
  if (existing) { console.log(`Existing: ${title} (${existing.id})`); return existing; }
  const created = await api('/menus', {
    title, path, parent_id: parentId, component, sort, icon,
    name: path.slice(1), is_hidden: false, is_affix: false, is_keep_alive: false,
  });
  flat.push(created);
  console.log(`Created: ${title} (${created.id})`);
  return created;
}
const group = flat.find(menu => menu.title === '激励任务')
  || await ensure('激励任务', '/tasks', null, null, 60, 'Present');
await ensure('签到奖励', '/checkin', group.id, '/tasks/CheckinView', 10, 'Calendar');
await ensure('任务配置', '/taskcfg', group.id, '/tasks/TaskConfigView', 20, 'List');
await ensure('实时观看奖励', '/watch', group.id, '/tasks/WatchRewardsView', 30, 'VideoPlay');
