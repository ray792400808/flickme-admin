export interface MenuGroup {
  id: string;
  title: string;
  icon: string;
  pages: [string, string][];
}

export const menuGroups: MenuGroup[] = [
  { id: 'overview', title: '数据概览', icon: 'chart', pages: [['overview', '数据概览']] },
  {
    id: 'content',
    title: '内容管理',
    icon: 'film',
    pages: [
      ['dramas', 'Short 剧库'],
      ['characters', 'Stories 角色库'],
      ['cands', 'AI 角色备选库'],
      ['tags', '标签与合集'],
      ['comments', '评论管理'],
    ],
  },
  {
    id: 'ops',
    title: '运营位',
    icon: 'grid',
    pages: [
      ['chips', '首页分类 Chips'],
      ['hot', '热门池与排序'],
      ['launch', '启动弹窗'],
      ['words', '搜索推荐词'],
      ['filters', 'Stories 筛选标签'],
      ['recs', '推荐位配置'],
    ],
  },
  {
    id: 'users',
    title: '用户管理',
    icon: 'user',
    pages: [
      ['userlist', '用户列表'],
      ['coinadj', '金币调整'],
    ],
  },
  {
    id: 'commerce',
    title: '商业化',
    icon: 'coin',
    pages: [
      ['plans', '会员套餐'],
      ['packs', '充值包'],
      ['coupons', '优惠券'],
      ['rules', '金币规则'],
      ['orders', '订单与流水'],
    ],
  },
  {
    id: 'ai',
    title: 'AI 配置',
    icon: 'spark',
    pages: [
      ['models', '模型管理'],
      ['memory', '记忆档位'],
      ['safety', '内容安全'],
    ],
  },
  {
    id: 'tasks',
    title: '激励任务',
    icon: 'gift',
    pages: [
      ['checkin', '签到奖励'],
      ['taskcfg', '任务配置'],
      ['watch', '实时观看奖励'],
    ],
  },
  {
    id: 'push',
    title: '消息与推送',
    icon: 'bell',
    pages: [
      ['pushtasks', '推送任务'],
      ['liveact', 'Live Activity 模板'],
      ['pushdef', '通知默认与频控'],
    ],
  },
  { id: 'service', title: '客服与反馈', icon: 'chat', pages: [['feedback', '反馈与举报工单']] },
  {
    id: 'system',
    title: '系统设置',
    icon: 'gear',
    pages: [
      ['accounts', '账号管理'],
      ['roles', '角色与权限'],
      ['logs', '操作日志'],
      ['legal', '协议管理'],
    ],
  },
];

export const icons: Record<string, string> = {
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 10h4M4 14h4M16 10h4M16 14h4',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  coin: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v10M9.5 9.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4',
  spark: 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z',
  gift: 'M4 9h16v4H4zM6 13v7h12v-7M12 9v11M12 9c-2 0-4-1-4-3s3-2 4 3zm0 0c2 0 4-1 4-3s-3-2-4 3z',
  bell: 'M6 16V11a6 6 0 1112 0v5l2 2H4zM10 21h4',
  chat: 'M4 5h16v11H9l-5 4z',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 00-2-1.2L14 3h-4l-.6 2.6a7 7 0 00-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 002 1.2L10 21h4l.6-2.6a7 7 0 002-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
};

export const permissionFor = (id: string) =>
  id === 'comments'
    ? 'service'
    : menuGroups.find((group) => group.pages.some((page) => page[0] === id))?.id;
export const pathFor = (id: string) =>
  id === 'overview' ? '/dashboard' : id === 'logs' ? '/audit-logs' : '/' + id;
export const pageForPath = (path: string) =>
  path === '/dashboard' ? 'overview' : path === '/audit-logs' ? 'logs' : path.replace(/^\//, '');
