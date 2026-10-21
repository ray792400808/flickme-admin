// Reference workflow renderer, isolated in a ShadowRoot to preserve its design tokens.
// Business APIs remain in src/api; this renderer only manages explicitly labelled local examples.
export function mountWorkspace(root, options) {
  const timers = new Set();
  const setTimeout = (callback, delay) => {
    const timer = globalThis.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
    return timer;
  };
  const clearTimeout = (timer) => {
    timers.delete(timer);
    globalThis.clearTimeout(timer);
  };
  const document = {
    querySelector: root.querySelector.bind(root),
    querySelectorAll: root.querySelectorAll.bind(root),
    createElement: root.ownerDocument.createElement.bind(root.ownerDocument),
    addEventListener: root.addEventListener.bind(root),
    body: root.querySelector('.workspace-body'),
    documentElement: root.host,
  };
  const location = {
    get hash() {
      return '#' + options.page;
    },
    set hash(value) {
      options.navigate(value.replace(/^#/, ''));
    },
  };
  const history = {
    replaceState(_state, _title, hash) {
      options.navigate(hash.replace(/^#/, ''));
    },
  };
  const window = {
    addEventListener() {},
    scrollTo() {
      root.host.ownerDocument.defaultView.scrollTo({ top: 0 });
    },
  };
  const matchMedia = root.ownerDocument.defaultView.matchMedia.bind(root.ownerDocument.defaultView);
  const storageKey = 'flickme-workspace-v1:' + options.userKey;
  function persist() {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ data: D, nextId: ID, chipDirty: UI.chipDirty }),
      );
    } catch {
      /* Browsers may disable local storage; the current session still works. */
    }
  }

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  const ICON = {
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
    chev: 'M9 6l6 6-6 6',
  };
  const ic = (n, c) => `<svg viewBox="0 0 24 24" class="${c || ''}"><path d="${ICON[n]}"/></svg>`;

  /* ---------- navigation & permissions ---------- */
  const NAV = [
    { id: 'overview', t: '数据概览', ic: 'chart', p: [['overview', '数据概览']] },
    {
      id: 'content',
      t: '内容管理',
      ic: 'film',
      p: [
        ['dramas', 'Short 剧库'],
        ['characters', 'Stories 角色库'],
        ['cands', 'AI 角色备选库'],
        ['tags', '标签与合集'],
        ['comments', '评论管理'],
      ],
    },
    {
      id: 'ops',
      t: '运营位',
      ic: 'grid',
      p: [
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
      t: '账户管理',
      ic: 'user',
      p: [
        ['userlist', '用户列表'],
        ['coinadj', '金币调整'],
      ],
    },
    {
      id: 'commerce',
      t: '商业化',
      ic: 'coin',
      p: [
        ['plans', '会员套餐'],
        ['packs', '充值包'],
        ['coupons', '优惠券'],
        ['rules', '金币规则'],
        ['orders', '订单与流水'],
      ],
    },
    {
      id: 'ai',
      t: 'AI 配置',
      ic: 'spark',
      p: [
        ['models', '模型管理'],
        ['memory', '记忆档位'],
        ['safety', '内容安全'],
      ],
    },
    {
      id: 'tasks',
      t: '激励任务',
      ic: 'gift',
      p: [
        ['checkin', '签到奖励'],
        ['taskcfg', '任务配置'],
        ['watch', '实时观看奖励'],
      ],
    },
    {
      id: 'push',
      t: '消息与推送',
      ic: 'bell',
      p: [
        ['pushtasks', '推送任务'],
        ['liveact', 'Live Activity 模板'],
        ['pushdef', '通知默认与频控'],
      ],
    },
    { id: 'service', t: '客服与反馈', ic: 'chat', p: [['feedback', '反馈与举报工单']] },
    {
      id: 'system',
      t: '系统设置',
      ic: 'gear',
      p: [
        ['accounts', '账号管理'],
        ['roles', '角色与权限'],
        ['logs', '操作日志'],
        ['legal', '协议管理'],
      ],
    },
  ];
  const ROLES = {
    admin: { n: '超级管理员', s: '超', p: '*' },
    ops: {
      n: '运营',
      s: '运',
      p: { overview: 'r', content: 'r', ops: 'rw', tasks: 'rw', push: 'rw', service: 'r' },
    },
    content: { n: '内容', s: '内', p: { overview: 'r', content: 'rw', ops: 'r', service: 'r' } },
    service: { n: '客服', s: '客', p: { users: 'r', service: 'rw', content: 'r' } },
    finance: { n: '财务', s: '财', p: { overview: 'r', commerce: 'rw', users: 'r' } },
  };
  const PAGE_PERM = { comments: 'service' };
  const groupOf = (pid) => NAV.find((g) => g.p.some((x) => x[0] === pid));
  const UI = { role: 'admin', open: { content: true }, drag: null };
  function can(pid) {
    const g = groupOf(pid);
    if (!g) return null;
    const key = PAGE_PERM[pid] || g.id;
    return options.can(key, true) ? 'rw' : options.can(key) ? 'r' : null;
  }
  const visibleGroups = () =>
    NAV.map((g) => ({ ...g, p: g.p.filter((x) => can(x[0])) })).filter((g) => g.p.length);

  /* ---------- sample data (示例数据) ---------- */
  let ID = 100;
  const nid = () => 'N' + ++ID;
  const L7 = [
    ['en', 'English'],
    ['zh-Hans', '简体中文'],
    ['zh-Hant', '繁體中文'],
    ['es', 'Español'],
    ['pt', 'Português'],
    ['id', 'Bahasa Indonesia'],
    ['th', 'ไทย'],
  ];
  const mlv = (en, zh) => ({
    en,
    'zh-Hans': zh || '',
    'zh-Hant': '',
    es: '',
    pt: '',
    id: '',
    th: '',
  });
  const TAGS_S = [
    'Romance',
    'Thriller',
    'Revenge',
    'Historical',
    'Mystery',
    'Fantasy',
    'Drama',
    'CEO',
    'Mafia',
    'Werewolf',
  ];
  const D = {
    dramas: [
      {
        id: 'D1001',
        title: "The CEO's Trap",
        tags: ['Romance', 'CEO'],
        eps: 75,
        free: 6,
        badge: 'HOT',
        views: '12.4M',
        heat: 98,
        status: '上架',
        upd: '10-18',
        syn: 'A quiet merger turns into a war of secrets.',
      },
      {
        id: 'D1002',
        title: "The Other Woman's Secret",
        tags: ['Drama', 'Thriller'],
        eps: 68,
        free: 6,
        badge: 'NEW',
        views: '8.9M',
        heat: 91,
        status: '上架',
        upd: '10-17',
        syn: "The CEO's new advisor learns who he really is.",
      },
      {
        id: 'D1003',
        title: 'Court of Vultures',
        tags: ['Historical', 'Drama'],
        eps: 52,
        free: 6,
        badge: '',
        views: '6.1M',
        heat: 84,
        status: '上架',
        upd: '10-12',
        syn: 'Every smile hides a blade.',
      },
      {
        id: 'D1004',
        title: 'Rise from the Ashes',
        tags: ['Revenge', 'Drama'],
        eps: 60,
        free: 6,
        badge: 'HOT',
        views: '9.7M',
        heat: 88,
        status: '上架',
        upd: '10-10',
        syn: 'She returns to take back everything.',
      },
      {
        id: 'D1005',
        title: 'Moonlit Sword',
        tags: ['Historical', 'Fantasy'],
        eps: 48,
        free: 6,
        badge: '',
        views: '3.8M',
        heat: 70,
        status: '上架',
        upd: '10-02',
        syn: 'A sword, a vow and a hidden prince.',
      },
      {
        id: 'D1006',
        title: 'Midnight Kiss with the Devil',
        tags: ['Fantasy', 'Romance'],
        eps: 44,
        free: 6,
        badge: 'EXCLUSIVE',
        views: '5.2M',
        heat: 80,
        status: '上架',
        upd: '09-28',
        syn: 'One midnight kiss. One bargain.',
      },
      {
        id: 'D1007',
        title: "The Lycan King's Forbidden Mate",
        tags: ['Werewolf', 'Fantasy'],
        eps: 56,
        free: 6,
        badge: 'NEW',
        views: '4.6M',
        heat: 77,
        status: '上架',
        upd: '09-25',
        syn: 'Choose between two packs.',
      },
      {
        id: 'D1008',
        title: 'Forbidden Heir',
        tags: ['Romance', 'Mystery'],
        eps: 40,
        free: 4,
        badge: '',
        views: '2.2M',
        heat: 61,
        status: '下架',
        upd: '09-14',
        syn: 'A secret heir hides in plain sight.',
      },
      {
        id: 'D1009',
        title: 'Sworn to the Mafia Boss',
        tags: ['Mafia', 'Romance'],
        eps: 62,
        free: 6,
        badge: 'HOT',
        views: '7.3M',
        heat: 86,
        status: '上架',
        upd: '09-09',
        syn: 'A debt, a contract, a wedding.',
      },
      {
        id: 'D1010',
        title: 'Whispers in the Manor',
        tags: ['Mystery', 'Thriller'],
        eps: 36,
        free: 6,
        badge: '',
        views: '1.9M',
        heat: 55,
        status: '草稿',
        upd: '10-19',
        syn: 'Seven guests. One missing heir.',
      },
    ],
    chars: [
      {
        id: 'C2001',
        name: 'Lucas',
        author: '@mintfox',
        tags: ['Romance', 'CEO'],
        chats: '268.7K',
        status: '上架',
        open: 'Lucas leans on the doorframe, tie loosened. "Have dinner with me and tell me why."',
        q1: 'Accept',
        q2: 'Tease him',
      },
      {
        id: 'C2002',
        name: 'Midnight Kiss with the Devil',
        author: '@ember',
        tags: ['Mafia', 'Fantasy'],
        chats: '88.6K',
        status: '上架',
        open: 'The clock strikes twelve and the candles go out together.',
        q1: 'Make a wish',
        q2: 'Ask the price',
      },
      {
        id: 'C2003',
        name: "The Lycan King's Forbidden Mate",
        author: '@lotus',
        tags: ['Werewolf', 'Fantasy'],
        chats: '64.1K',
        status: '上架',
        open: 'The war horns stop at your gate.',
        q1: 'Kneel',
        q2: 'Stand tall',
      },
      {
        id: 'C2004',
        name: 'Court of Vultures',
        author: '@prince',
        tags: ['Historical', 'Drama'],
        chats: '41.0K',
        status: '上架',
        open: 'A new consort enters a palace where every smile hides a blade.',
        q1: 'Smile back',
        q2: 'Stay silent',
      },
      {
        id: 'C2005',
        name: 'Emma',
        author: '@flickme',
        tags: ['Romance'],
        chats: '152.3K',
        status: '上架',
        open: 'Where were you last night? I waited.',
        q1: 'Apologize',
        q2: 'Change the subject',
      },
      {
        id: 'C2006',
        name: 'Viktor',
        author: '@nightowl',
        tags: ['Mafia', 'Revenge'],
        chats: '30.2K',
        status: '待审核',
        open: 'You are late. Sit.',
        q1: 'Sit',
        q2: 'Leave',
      },
    ],
    tags: [
      {
        id: 'T01',
        key: 'romance',
        name: mlv('Romance', '爱情'),
        kind: '标签',
        count: 312,
        en: true,
        status: '已发布',
      },
      {
        id: 'T02',
        key: 'thriller',
        name: mlv('Thriller', '惊悚'),
        kind: '标签',
        count: 148,
        en: true,
        status: '已发布',
      },
      {
        id: 'T03',
        key: 'revenge',
        name: mlv('Revenge', '复仇'),
        kind: '标签',
        count: 201,
        en: true,
        status: '已发布',
      },
      {
        id: 'T04',
        key: 'ceo',
        name: mlv('CEO', '总裁'),
        kind: '标签',
        count: 176,
        en: true,
        status: '已发布',
      },
      {
        id: 'T05',
        key: 'forbidden-love',
        name: mlv('Forbidden Love', '禁忌之恋'),
        kind: '合集',
        count: 24,
        en: true,
        status: '已发布',
      },
      {
        id: 'T06',
        key: 'billionaire-heirs',
        name: mlv('Billionaire Heirs', '豪门继承人'),
        kind: '合集',
        count: 18,
        en: true,
        status: '已发布',
      },
      {
        id: 'T07',
        key: 'werewolf',
        name: mlv('Werewolf', '狼人'),
        kind: '标签',
        count: 63,
        en: true,
        status: '已发布',
      },
      {
        id: 'T08',
        key: 'secret-identity',
        name: mlv('Secret Identity', '隐藏身份'),
        kind: '合集',
        count: 0,
        en: false,
        status: '草稿',
      },
    ],
    comments: [
      {
        id: 'M01',
        user: 'amy_k',
        text: 'Episode 12 gave me chills, cannot wait for 13!',
        drama: "The CEO's Trap",
        reports: 0,
        status: '待审核',
        time: '10:42',
      },
      {
        id: 'M02',
        user: 'user_88421',
        text: 'Click my profile for free coins!!',
        drama: 'Rise from the Ashes',
        reports: 7,
        status: '待审核',
        time: '10:31',
      },
      {
        id: 'M03',
        user: 'j_ortiz',
        text: 'The acting in this one is so good.',
        drama: 'Court of Vultures',
        reports: 0,
        status: '已通过',
        time: '09:58',
      },
      {
        id: 'M04',
        user: 'lina',
        text: 'This ending makes no sense, total waste of time.',
        drama: 'Moonlit Sword',
        reports: 2,
        status: '待审核',
        time: '09:12',
      },
      {
        id: 'M05',
        user: 'tom_w',
        text: 'Where can I watch the sequel?',
        drama: 'Midnight Kiss with the Devil',
        reports: 0,
        status: '已通过',
        time: '08:40',
      },
    ],
    chips: {
      short: [
        ['For you', 'system', '', 1],
        ['Romance', 'tag', 'romance', 1],
        ['Thriller', 'tag', 'thriller', 1],
        ['Revenge', 'tag', 'revenge', 1],
        ['Historical', 'tag', 'historical', 1],
        ['Mystery', 'tag', 'mystery', 1],
        ['Fantasy', 'tag', 'fantasy', 1],
        ['Drama', 'tag', 'drama', 1],
      ],
      stories: [
        ['For you', 'system', '', 1],
        ['Explore', 'system', '', 1],
        ['Romance', 'tag', 'romance', 1],
        ['CEO', 'tag', 'ceo', 1],
        ['Revenge', 'tag', 'revenge', 1],
        ['Mafia', 'tag', 'mafia', 1],
        ['Werewolf', 'tag', 'werewolf', 1],
        ['Historical', 'tag', 'historical', 1],
        ['Fantasy', 'tag', 'fantasy', 1],
      ],
    },
    words: [
      {
        id: 'W1',
        word: "The CEO's Trap",
        sort: 1,
        en: true,
        start: '2026-10-01 00:00',
        end: '2026-12-31 00:00',
        status: '已发布',
      },
      {
        id: 'W2',
        word: 'Court of Vultures',
        sort: 2,
        en: true,
        start: '2026-10-01 00:00',
        end: '2026-12-31 00:00',
        status: '已发布',
      },
      {
        id: 'W3',
        word: 'Rise from the Ashes',
        sort: 3,
        en: true,
        start: '2026-10-01 00:00',
        end: '2026-12-31 00:00',
        status: '已发布',
      },
      {
        id: 'W4',
        word: 'Moonlit Sword',
        sort: 4,
        en: true,
        start: '2026-10-01 00:00',
        end: '2026-12-31 00:00',
        status: '已发布',
      },
    ],
    filters: [
      {
        id: 'F1',
        group: 'Roles & Identities',
        tags: 'CEO, Prince, Doctor, Soldier, Alpha, Vampire',
        order: 1,
        en: true,
      },
      {
        id: 'F2',
        group: 'Personality',
        tags: 'Cold, Gentle, Possessive, Playful, Mysterious',
        order: 2,
        en: true,
      },
      {
        id: 'F3',
        group: 'Relationships',
        tags: 'Enemies to Lovers, Fake Marriage, Second Chance, Forbidden',
        order: 3,
        en: true,
      },
      {
        id: 'F4',
        group: 'Plot Tropes',
        tags: 'Secret Identity, Revenge, Contract Love, Time Loop',
        order: 4,
        en: true,
      },
    ],
    users: [
      {
        id: '28461057',
        uid: '28461057',
        login: 'Apple',
        coins: 1280,
        bonus: 120,
        vip: 'Weekly',
        reg: '2026-09-02',
        unlocked: 34,
        status: '正常',
      },
      {
        id: '28460912',
        uid: '28460912',
        login: 'Google',
        coins: 0,
        bonus: 0,
        vip: '无',
        reg: '2026-09-30',
        unlocked: 6,
        status: '正常',
      },
      {
        id: '28459331',
        uid: '28459331',
        login: '访客',
        coins: 260,
        bonus: 40,
        vip: '无',
        reg: '2026-10-11',
        unlocked: 3,
        status: '正常',
      },
      {
        id: '28455102',
        uid: '28455102',
        login: 'Apple',
        coins: 5400,
        bonus: 900,
        vip: 'Yearly',
        reg: '2026-07-18',
        unlocked: 212,
        status: '正常',
      },
      {
        id: '28441877',
        uid: '28441877',
        login: 'Google',
        coins: 90,
        bonus: 0,
        vip: 'Monthly',
        reg: '2026-08-21',
        unlocked: 57,
        status: '封禁',
      },
    ],
    adj: [
      {
        id: 'A01',
        uid: '28460912',
        coin: 'Member coins',
        delta: 300,
        reason: '支付成功但未到账(订单 O-8841)',
        by: '客服 Mia',
        status: '待审批',
      },
      {
        id: 'A02',
        uid: '28455102',
        coin: 'Bonus',
        delta: -200,
        reason: '异常任务领取回收',
        by: '运营 Leo',
        status: '已发布',
      },
      {
        id: 'A03',
        uid: '28459331',
        coin: 'Bonus',
        delta: 100,
        reason: '活动补发',
        by: '运营 Leo',
        status: '驳回',
      },
    ],
    plans: [
      {
        id: 'P1',
        name: 'Weekly VIP',
        price: 19.99,
        intro: 11.99,
        period: '周',
        coins: '750 / 周',
        ios: 'flk.vip.weekly',
        and: 'vip_weekly',
        en: true,
        status: '已发布',
      },
      {
        id: 'P2',
        name: 'Monthly VIP',
        price: 35.99,
        intro: null,
        period: '月',
        coins: '3,000 / 月',
        ios: 'flk.vip.monthly',
        and: 'vip_monthly',
        en: true,
        status: '已发布',
      },
      {
        id: 'P3',
        name: 'Yearly VIP',
        price: 129.99,
        intro: null,
        period: '年',
        coins: '3,000 / 月',
        ios: 'flk.vip.yearly',
        and: 'vip_yearly',
        en: true,
        status: '已发布',
      },
    ],
    packs: [
      [1000, 100, 9.99],
      [700, 0, 6.99],
      [2000, 500, 19.99],
      [2500, 875, 24.99],
      [5000, 2500, 49.99],
      [10000, 10000, 99.99],
    ].map((p, i) => ({
      id: 'K' + (i + 1),
      coins: p[0],
      bonus: p[1],
      price: p[2],
      sort: i + 1,
      en: true,
      status: '已发布',
    })),
    coupons: [
      {
        id: 'CP1',
        name: 'Weekly Membership Coupon',
        off: 8,
        plan: 'Weekly',
        mins: 10,
        limit: '每账号 1 次',
        trigger: '进入会员页',
        en: true,
        status: '已发布',
        used: '1,284 / 9,402',
      },
    ],
    orders: [
      {
        id: 'O-8841',
        uid: '28460912',
        item: 'Coin pack 1000 +100',
        amt: 9.99,
        pay: 'Apple',
        time: '10-19 09:12',
        status: '成功',
      },
      {
        id: 'O-8840',
        uid: '28455102',
        item: 'Yearly VIP',
        amt: 129.99,
        pay: 'Apple',
        time: '10-19 08:50',
        status: '成功',
      },
      {
        id: 'O-8839',
        uid: '28459331',
        item: 'Weekly VIP (intro)',
        amt: 11.99,
        pay: 'Google',
        time: '10-19 08:21',
        status: '成功',
      },
      {
        id: 'O-8838',
        uid: '28441877',
        item: 'Coin pack 5000 +2500',
        amt: 49.99,
        pay: 'Google',
        time: '10-18 23:40',
        status: '失败',
      },
      {
        id: 'O-8837',
        uid: '28461057',
        item: 'Weekly VIP',
        amt: 19.99,
        pay: 'Apple',
        time: '10-18 21:03',
        status: '成功',
      },
      {
        id: 'O-8836',
        uid: '28460001',
        item: 'Coin pack 2000 +500',
        amt: 19.99,
        pay: 'Apple',
        time: '10-18 20:11',
        status: '退款',
      },
    ],
    models: [
      {
        id: 'MD1',
        name: 'Auto',
        kind: 'FREE',
        est: 9,
        cap: 10,
        tag: 'Picks the best style for each scene',
        en: true,
        isnew: true,
        status: '已发布',
      },
      {
        id: 'MD2',
        name: 'Swing Ride',
        kind: 'FREE',
        est: 6,
        cap: 10,
        tag: 'Short · tender · slow-burn',
        en: true,
        isnew: false,
        status: '已发布',
      },
      {
        id: 'MD3',
        name: 'Ferris Wheel',
        kind: 'VIP',
        est: 15,
        cap: 0,
        tag: 'Electric chemistry · fated entanglement',
        en: true,
        isnew: false,
        status: '已发布',
      },
      {
        id: 'MD4',
        name: 'After Dark',
        kind: 'VIP',
        est: 22,
        cap: 0,
        tag: 'Brooding · intense · high stakes',
        en: true,
        isnew: false,
        status: '已发布',
      },
    ],
    memory: [
      { id: 'MM1', cap: '8K', vip: '免费', mult: 1, def: false },
      { id: 'MM2', cap: '128K', vip: '免费', mult: 1.2, def: true },
      { id: 'MM3', cap: '512K', vip: 'VIP', mult: 1.6, def: false },
      { id: 'MM4', cap: '30M', vip: 'VIP', mult: 2, def: false },
    ],
    checkin: [10, 15, 20, 25, 30, 50, 100].map((r, i) => ({
      id: 'CK' + (i + 1),
      day: 'Day ' + (i + 1),
      reward: r,
    })),
    taskcfg: [
      {
        id: 'TK1',
        group: '新手任务',
        name: 'Log in to Flickme',
        reward: 30,
        reset: '一次性',
        en: true,
      },
      {
        id: 'TK2',
        group: '新手任务',
        name: 'Link your WhatsApp account',
        reward: 50,
        reset: '一次性',
        en: true,
      },
      {
        id: 'TK3',
        group: '新手任务',
        name: 'Bind your email',
        reward: 30,
        reset: '一次性',
        en: true,
      },
      {
        id: 'TK4',
        group: '新手任务',
        name: 'Follow Flickme on Facebook',
        reward: 20,
        reset: '一次性',
        en: true,
      },
      {
        id: 'TK5',
        group: '新手任务',
        name: 'Follow Flickme on YouTube',
        reward: 20,
        reset: '一次性',
        en: true,
      },
      {
        id: 'TK6',
        group: '观看任务',
        name: 'Watch dramas for 3 min',
        sec: 180,
        reward: 5,
        reset: '每日',
        en: true,
      },
      {
        id: 'TK7',
        group: '观看任务',
        name: 'Watch dramas for 5 min',
        sec: 300,
        reward: 10,
        reset: '每日',
        en: true,
      },
      {
        id: 'TK8',
        group: '观看任务',
        name: 'Watch dramas for 8 min',
        sec: 480,
        reward: 15,
        reset: '每日',
        en: true,
      },
      {
        id: 'TK9',
        group: '观看任务',
        name: 'Watch dramas for 12 min',
        sec: 720,
        reward: 25,
        reset: '每日',
        en: true,
      },
      {
        id: 'TK10',
        group: '观看任务',
        name: 'Watch dramas for 15 min',
        sec: 900,
        reward: 40,
        reset: '每日',
        en: true,
      },
      {
        id: 'TK11',
        group: '日常任务',
        name: 'Watch an ad (每日 10 次)',
        reward: 5,
        reset: '每日',
        en: true,
      },
      { id: 'TK12', group: '日常任务', name: 'Rate a drama', reward: 5, reset: '每日', en: true },
      { id: 'TK13', group: '日常任务', name: 'Share a drama', reward: 10, reset: '每日', en: true },
    ],
    push: [
      {
        id: 'PS1',
        type: 'New Series',
        title: mlv("New Series: The Other Woman's Secret", '新剧上线'),
        audience: '开启新剧提醒的用户',
        land: '播放器第 1 集',
        at: '2026-10-20 12:00',
        status: '待审批',
      },
      {
        id: 'PS2',
        type: 'Hot Deals',
        title: mlv('Hot Deals: 50% off Membership today', '会员五折'),
        audience: '非 VIP 活跃用户',
        land: '会员页',
        at: '2026-10-21 20:00',
        status: '草稿',
      },
      {
        id: 'PS3',
        type: 'Continue',
        title: mlv('Continue: Ep {n} · {m} left', '继续观看'),
        audience: '中断观看 24 小时用户',
        land: '播放器续播',
        at: '自动触发',
        status: '已发布',
      },
      {
        id: 'PS4',
        type: 'Reward',
        title: mlv('Your daily check-in is waiting', '签到提醒'),
        audience: '开启奖励提醒的用户',
        land: 'Reward bonus',
        at: '每日 10:00',
        status: '已发布',
      },
    ],
    live: [
      {
        id: 'LA1',
        name: '锁屏卡片',
        state: 'Now Playing',
        fields: '封面 · 剧名 · EP x / y · 进度 · Continue watching',
        en: true,
      },
      {
        id: 'LA2',
        name: '灵动岛 紧凑',
        state: '播放中',
        fields: '播放图标 · 进度条 · EPxx',
        en: true,
      },
      {
        id: 'LA3',
        name: '灵动岛 展开',
        state: '播放中',
        fields: '封面 · 剧名 · 进度 · 上一集 / 暂停 / 下一集',
        en: true,
      },
    ],
    fb: [
      {
        id: 'FB1',
        src: '播放',
        reason: "Video won't play",
        uid: '28459331',
        detail: 'EP.14 卡在加载,重启无效',
        status: '待处理',
        time: '10:36',
      },
      {
        id: 'FB2',
        src: 'Chat',
        reason: 'Out of character',
        uid: '28460912',
        detail: 'Lucas 回复风格不符合设定',
        status: '待处理',
        time: '10:05',
      },
      {
        id: 'FB3',
        src: '播放',
        reason: 'Subtitle issue',
        uid: '28455102',
        detail: '第 7 集字幕错位',
        status: '已处理',
        time: '09:20',
      },
      {
        id: 'FB4',
        src: '评论举报',
        reason: 'Inappropriate content',
        uid: '28441877',
        detail: '广告引流评论',
        status: '待处理',
        time: '08:55',
      },
    ],
    logs: [
      {
        id: 'L1',
        time: '10-19 09:58',
        who: '超级管理员',
        role: '超管',
        act: '发布',
        obj: '首页分类 Chips · Short',
        diff: '新增 Drama,位置 8',
      },
      {
        id: 'L2',
        time: '10-19 09:41',
        who: 'Leo',
        role: '运营',
        act: '编辑',
        obj: '搜索推荐词 · W2',
        diff: '结束时间 12-31',
      },
      {
        id: 'L3',
        time: '10-19 09:12',
        who: 'Mia',
        role: '客服',
        act: '提交审批',
        obj: '金币调整 · A01',
        diff: '+300 Member coins',
      },
      {
        id: 'L4',
        time: '10-18 18:30',
        who: 'Ann',
        role: '财务',
        act: '编辑',
        obj: '充值包 · K3',
        diff: '赠送 400 → 500',
      },
      {
        id: 'L5',
        time: '10-18 15:02',
        who: 'Kai',
        role: '内容',
        act: '下架',
        obj: 'Short 剧库 · D1008',
        diff: '上架 → 下架',
      },
    ],
    legal: [
      { id: 'G1', name: 'Membership Agreement', ver: '1.0', eff: '待填写', status: '占位待替换' },
      { id: 'G2', name: 'Payment Agreement', ver: '1.0', eff: '待填写', status: '占位待替换' },
      { id: 'G3', name: 'Privacy Policy', ver: '1.0', eff: '待填写', status: '占位待替换' },
      { id: 'G4', name: 'Terms of Service', ver: '1.0', eff: '待填写', status: '占位待替换' },
    ],
    forms: {},
  };
  const dn = (id) => (D.dramas.find((x) => x.id === id) || {}).title;

  /* ---------- small helpers ---------- */
  const PILL = {
    上架: 'good',
    已发布: 'good',
    成功: 'good',
    已通过: 'good',
    已处理: 'good',
    正常: 'good',
    启用: 'good',
    草稿: 'warn',
    待审核: 'warn',
    待处理: 'warn',
    占位待替换: 'warn',
    待审批: 'info',
    下架: 'bad',
    失败: 'bad',
    驳回: 'bad',
    已删除: 'bad',
    封禁: 'bad',
    退款: 'bad',
    待选: 'info',
    已入库: 'good',
    已忽略: '',
    停用: 'bad',
    待激活: 'warn',
    转码中: 'info',
    已转码: 'good',
    未上传: 'warn',
    转码失败: 'bad',
  };
  const pill = (t, c) => `<span class="pill ${c || PILL[t] || ''}">${esc(t)}</span>`;
  const grad = (s) => {
    let h = 0;
    for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `linear-gradient(160deg,hsl(${(h % 40) + 345} 70% 38%),hsl(${(h % 40) + 345} 60% 14%))`;
  };
  const sw = (on, act, id, k, dis) =>
    `<button class="sw ${on ? 'on' : ''}" ${dis ? 'disabled' : ''} data-act="${act}" data-id="${id}" data-k="${k}" aria-pressed="${!!on}"></button>`;
  function toast(m) {
    const t = $('#toast');
    t.textContent = m;
    t.classList.add('on');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('on'), 2200);
  }
  function confirmBox(title, msg, ok, okLabel) {
    const m = $('#modal');
    m.innerHTML = `<div class="box"><h3>${esc(title)}</h3><p>${esc(msg)}</p><div class="f"><button class="btn" data-act="mclose">取消</button><button class="btn pri" data-act="mok">${esc(okLabel || '确认')}</button></div></div>`;
    m.classList.add('on');
    confirmBox.ok = ok;
  }
  function addLog(act, obj, diff) {
    const r = { n: options.userName };
    D.logs.unshift({ id: nid(), time: '刚刚', who: r.n, role: r.n, act, obj, diff: diff || '—' });
  }

  /* ---------- form engine ---------- */
  function fieldHtml(f, v, ro) {
    const val = v[f.k],
      dis = ro || f.t === 'ro' ? 'readonly' : '';
    let inner = '';
    if (f.t === 'text')
      inner = `<input class="in" name="${f.k}" value="${esc(val)}" ${dis} placeholder="${esc(f.ph || '')}">`;
    else if (f.t === 'num')
      inner = `<input class="in" type="number" step="any" name="${f.k}" value="${esc(val)}" ${dis}>`;
    else if (f.t === 'ro') inner = `<input class="in" name="${f.k}" value="${esc(val)}" readonly>`;
    else if (f.t === 'dt')
      inner = `<input class="in" name="${f.k}" value="${esc(val)}" placeholder="YYYY-MM-DD HH:mm" ${dis}>`;
    else if (f.t === 'area')
      inner = `<textarea class="in" name="${f.k}" ${dis}>${esc(val)}</textarea>`;
    else if (f.t === 'select')
      inner = `<select class="in" name="${f.k}" ${ro ? 'disabled' : ''}>${f.o.map((o) => `<option ${o == val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else if (f.t === 'sw')
      inner = `<label class="sf"><input type="checkbox" name="${f.k}" ${val ? 'checked' : ''} ${ro ? 'disabled' : ''}> <span>${esc(f.sl || '启用')}</span></label>`;
    else if (f.t === 'multi')
      inner = `<div class="chips">${f.o.map((o) => `<button type="button" class="chip ${(val || []).includes(o) ? 'on' : ''}" data-multi="${f.k}" data-v="${esc(o)}" ${ro ? 'disabled' : ''} data-act="chip">${esc(o)}</button>`).join('')}</div>`;
    else if (f.t === 'ml') {
      const o = val || {};
      inner =
        `<div class="lt">${L7.map(([c, n], i) => `<button type="button" class="${i ? '' : 'on'}" data-act="mltab" data-c="${c}">${n}</button>`).join('')}</div>` +
        L7.map(
          ([c], i) =>
            `<input class="in" name="${f.k}.${c}" data-ml="${c}" value="${esc(o[c])}" ${ro ? 'readonly' : ''} ${i ? 'hidden' : ''}>`,
        ).join('');
    }
    return `<div class="fld"><label>${esc(f.l)}</label>${inner}${f.h ? `<span class="hint">${esc(f.h)}</span>` : ''}</div>`;
  }
  function readForm(fields, root) {
    const v = {};
    fields.forEach((f) => {
      const q = (n) => root.querySelector(`[name="${n}"]`);
      if (f.t === 'ml') {
        v[f.k] = {};
        L7.forEach(([c]) => (v[f.k][c] = q(f.k + '.' + c).value));
      } else if (f.t === 'multi')
        v[f.k] = [...root.querySelectorAll(`[data-multi="${f.k}"].on`)].map((e) => e.dataset.v);
      else if (f.t === 'sw') v[f.k] = q(f.k).checked;
      else if (f.t === 'num') v[f.k] = +q(f.k).value;
      else if (f.t !== 'ro') v[f.k] = q(f.k).value;
    });
    return v;
  }

  /* ---------- drawer ---------- */
  let CUR = null;
  function openDrawer(o) {
    $('#drawer').innerHTML =
      `<div class="dh"><div><h2>${esc(o.title)}</h2>${o.sub ? `<p>${esc(o.sub)}</p>` : ''}</div><button class="ic" data-act="dclose" aria-label="关闭">×</button></div><div class="db" id="dbody">${o.body}</div><div class="df">${o.foot || ''}</div>`;
    document.body.classList.add('dopen');
    $('#drawer').setAttribute('role', 'dialog');
    $('#drawer').setAttribute('aria-modal', 'true');
    $('#drawer').setAttribute('aria-label', o.title);
    $('#drawer').setAttribute('tabindex', '-1');
    $('#drawer').focus();
  }
  function closeDrawer() {
    document.body.classList.remove('dopen');
    CUR = null;
  }

  /* ---------- CRUD page ---------- */
  function cell(c, r) {
    if (c.r) return c.r(r);
    const v = r[c.k];
    if (typeof v === 'boolean') return sw(v, 'sw', r.id, c.k, can(PAGE.id) !== 'rw');
    if (Array.isArray(v))
      return `<span class="tg">${v.map((x) => `<span class="pill">${esc(x)}</span>`).join('')}</span>`;
    if (v && typeof v === 'object') return esc(v.en || '');
    if (c.k === 'status') return pill(v);
    if (c.mono) return `<span class="mono">${esc(v)}</span>`;
    return esc(v == null ? '—' : v);
  }
  function crud(c) {
    const st = UI['f_' + c.id] || (UI['f_' + c.id] = { q: '', f: {}, page: 1 }),
      rw = can(c.id) === 'rw';
    PAGE = c;
    let rows = c
      .rows()
      .filter(
        (r) =>
          (!st.q || JSON.stringify(r).toLowerCase().includes(st.q.toLowerCase())) &&
          Object.entries(st.f).every(([k, v]) => !v || String(r[k]) === v),
      );
    const pageSize = 8,
      total = rows.length,
      pages = Math.max(1, Math.ceil(total / pageSize));
    st.page = Math.min(st.page || 1, pages);
    rows = rows.slice((st.page - 1) * pageSize, st.page * pageSize);
    const acts = c.actions || [];
    return `<div class="ph"><div><h1>${c.title}</h1><p>${c.desc || ''}</p></div><div class="act">${rw ? '' : pill('当前角色只读', 'warn')}${c.newBtn ? `<button class="btn pri" data-act="new" ${rw ? '' : 'disabled'}>${c.newBtn}</button>` : ''}</div></div>
  ${c.pre ? c.pre() : ''}
  ${(() => {
    const b = typeof c.banner === 'function' ? c.banner() : c.banner;
    return b ? `<div class="banner ${b[0]}">${b[1]}</div>` : '';
  })()}
  <div class="card"><div class="tb"><input type="search" id="q" placeholder="搜索" value="${esc(st.q)}">${(c.filters || []).map((f) => `<select data-act="flt" data-k="${f.k}"><option value="">${f.l}:全部</option>${f.o.map((o) => `<option ${st.f[f.k] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`).join('')}<span class="n">共 ${total} 条</span></div>
  <div class="tw"><table><thead><tr>${c.cols.map((x) => `<th>${x.l}</th>`).join('')}${acts.length ? '<th>操作</th>' : ''}</tr></thead><tbody>${
    rows
      .map(
        (r) =>
          `<tr class="${c.fields || c.onOpen ? 'rw' : ''}" data-act="${c.fields || c.onOpen ? 'open' : ''}" data-id="${r.id}">${c.cols.map((x) => `<td class="${x.n ? 'num' : ''}">${cell(x, r)}</td>`).join('')}${
            acts.length
              ? `<td>${acts
                  .filter((a) => !a.show || a.show(r))
                  .map(
                    (a, i) =>
                      `<button class="btn sm ${a.c || ''}" data-act="ract" data-id="${r.id}" data-i="${acts.indexOf(a)}" ${rw && (!a.only || a.only === UI.role) ? '' : 'disabled'}>${a.l}</button>`,
                  )
                  .join(' ')}</td>`
              : ''
          }</tr>`,
      )
      .join('') ||
    `<tr><td colspan="${c.cols.length + 1}" class="empty">没有符合条件的记录</td></tr>`
  }</tbody></table></div>
  <div class="pg"><span>共 ${total} 条 · 第 ${st.page} / ${pages} 页</span><button data-act="pg" data-page="${st.page - 1}" ${st.page === 1 ? 'disabled' : ''} aria-label="上一页">‹</button>${Array.from({ length: pages }, (_, i) => `<button data-act="pg" data-page="${i + 1}" class="${i + 1 === st.page ? 'on' : ''}">${i + 1}</button>`).join('')}<button data-act="pg" data-page="${st.page + 1}" ${st.page === pages ? 'disabled' : ''} aria-label="下一页">›</button></div></div>`;
  }
  function openRow(c, id) {
    const rw = can(c.id) === 'rw',
      isNew = !id,
      row = isNew ? JSON.parse(JSON.stringify(c.blank || {})) : c.rows().find((r) => r.id === id);
    if (!row) return;
    CUR = { c, row, isNew };
    if (isNew && c.tempId) row.id = c.tempId();
    const sv = c.sv || { d: '草稿', p: '已发布' },
      hasPub =
        c.fields.some((f) => f.k === 'status') || (c.publish !== false && row.status !== undefined);
    let body =
      (rw ? '' : `<div class="banner warn">当前角色对此页面只读。</div>`) +
      (c.approval && rw ? `<div class="banner">此对象的发布需要另一位管理员审批。</div>` : '');
    const extra = c.tabs || [];
    if (extra.length) {
      body += `<div class="tabs" style="margin-bottom:0">${[['基本信息']]
        .concat(extra.map((t) => [t.t]))
        .map(
          (t, i) =>
            `<button class="${i ? '' : 'on'}" data-act="dtab" data-i="${i}">${t[0]}</button>`,
        )
        .join('')}</div>`;
    }
    body += `<div id="dform" style="display:flex;flex-direction:column;gap:16px">${c.fields.map((f) => fieldHtml(f, row, !rw)).join('')}</div>`;
    extra.forEach(
      (t, i) => (body += `<div class="dtab" data-i="${i + 1}" hidden>${t.r(row)}</div>`),
    );
    if (c.note && !isNew)
      body = body.replace(
        '<div id="dform"',
        `<div class="banner ${c.note(row)[0]}">${c.note(row)[1]}</div><div id="dform"`,
      );
    const foot = c.footFn
      ? c.footFn(row, rw, isNew)
      : rw
        ? `<button class="btn" data-act="dclose">取消</button>${c.noDraft ? '' : `<button class="btn" data-act="save" data-m="d">保存草稿</button>`}<button class="btn pri" data-act="save" data-m="p">${c.approval ? '提交审批' : c.pubLabel || '发布'}</button>`
        : `<button class="btn" data-act="dclose">关闭</button>`;
    openDrawer({
      title: isNew
        ? c.newBtn || '新建'
        : row.title || row.name || row.word || row.group || row.key || row.id,
      sub: isNew ? '' : 'ID ' + row.id,
      body,
      foot,
    });
  }
  function saveRow(m) {
    const { c, row, isNew } = CUR,
      v = readForm(c.fields, $('#dform')),
      sv = c.sv || { d: '草稿', p: '已发布' };
    const required = c.fields.filter(
      (f) =>
        ['text', 'ml', 'area'].includes(f.t) &&
        !/可空|可选|备注|补充|定时|提示|tagKey|快捷回复|顺序/.test(f.l),
    );
    if (
      m === 'p' &&
      required.some((f) =>
        f.t === 'ml'
          ? !Object.values(v[f.k] || {}).some((x) => String(x).trim())
          : !String(v[f.k] || '').trim(),
      )
    ) {
      toast('请填写完整的必填内容');
      return;
    }
    if (
      c.fields.some(
        (f) => f.t === 'num' && (!Number.isFinite(v[f.k]) || (v[f.k] < 0 && f.k !== 'delta')),
      )
    ) {
      toast('请填写有效的非负数值');
      return;
    }
    const err = c.guard && c.guard(Object.assign({}, row, v), m, isNew);
    if (err) {
      toast(err);
      return;
    }
    Object.assign(row, v);
    if (c.fix) c.fix(row);
    if (m !== 'k' && !c.keepStatus && ('status' in row || isNew)) {
      row.status = m === 'd' ? sv.d : c.approval ? '待审批' : sv.p;
    }
    if (isNew) {
      row.id = row.id || nid();
      c.list().unshift(row);
    }
    if (m === 'p' && c.onPub) c.onPub(row);
    addLog(
      m === 'k' ? '编辑' : m === 'd' ? '保存草稿' : c.approval ? '提交审批' : '发布',
      c.title + ' · ' + row.id,
      '',
    );
    toast(
      c.saveMsg
        ? c.saveMsg(row, isNew)
        : m === 'k'
          ? '已保存'
          : m === 'd'
            ? '已保存为草稿'
            : c.approval
              ? '已提交,等待第二位管理员审批'
              : '已发布,线上配置将在缓存到期后生效',
    );
    closeDrawer();
    render();
  }

  /* ---------- form page ---------- */
  function formPage(c) {
    const rw = can(c.id) === 'rw';
    PAGE = c;
    const v = D.forms[c.id] || (D.forms[c.id] = c.init || {});
    return `<div class="ph"><div><h1>${c.title}</h1><p>${c.desc || ''}</p></div><div class="act">${rw ? '' : pill('当前角色只读', 'warn')}</div></div>
  ${c.banner ? `<div class="banner ${c.banner[0]}">${c.banner[1]}</div>` : ''}
  <div class="card" id="fp">${c.sections.map((s) => `<div class="sec"><h3>${s.t}</h3><p>${s.d || ''}</p><div class="fg2">${s.f.map((f) => fieldHtml(f, v, !rw)).join('')}</div></div>`).join('')}
  ${c.extra ? `<div class="sec">${c.extra(rw)}</div>` : ''}
  <div class="sec" style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" data-act="fpreset" ${rw ? '' : 'disabled'}>还原</button><button class="btn pri" data-act="fpsave" ${rw ? '' : 'disabled'}>${c.approval ? '提交审批' : '发布'}</button></div></div>`;
  }

  /* ---------- page configs ---------- */

  /* ---------- episodes ---------- */
  D.epd = {};
  function eps(id) {
    if (!D.epd[id]) {
      const d = D.dramas.find((x) => x.id === id),
        n = d ? d.eps : 0,
        arr = [];
      for (let i = 1; i <= n; i++) {
        const ok = d.status === '草稿' ? i <= 3 : true;
        arr.push({
          n: i,
          video: ok ? '已转码' : '未上传',
          size: ok ? 34 + ((i * 7) % 31) + ' MB' : '—',
          dur: ok ? '01:' + String(10 + ((i * 13) % 45)).padStart(2, '0') : '—',
          status: d.status === '上架' && ok ? '上架' : '下架',
        });
      }
      D.epd[id] = arr;
    }
    return D.epd[id];
  }
  function epTab(r) {
    const a = eps(r.id),
      rw = can('dramas') === 'rw',
      d = rw ? '' : 'disabled',
      ready = a.filter((e) => e.video === '已转码').length,
      on = a.filter((e) => e.status === '上架').length;
    return `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><button class="btn sm pri" data-act="epimp" ${d}>导入视频</button><button class="btn sm" data-act="epbatch" ${d}>按集号批量导入</button><button class="btn sm" data-act="epadd" ${d}>新增分集</button><span style="margin-left:auto;color:var(--muted);font-size:12px">共 ${a.length} 集 · 转码完成 ${ready} · 上架 ${on}</span></div>
 <div class="tw" style="max-height:420px;overflow-y:auto"><table style="min-width:0"><thead><tr><th>集</th><th>视频</th><th>类型</th><th>上架</th><th></th></tr></thead><tbody>${a.map((e) => `<tr><td>EP.${e.n}</td><td><div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start">${pill(e.video)}<span class="mono" style="white-space:nowrap">${e.size} · ${e.dur}</span></div></td><td>${e.n <= (r.free || 0) ? pill('免费', 'good') : pill('付费')}</td><td>${sw(e.status === '上架', 'epsw', r.id, e.n, !rw || e.video !== '已转码')}</td><td style="white-space:nowrap"><button class="btn sm" data-act="eprep" data-n="${e.n}" ${d}>替换</button> <button class="btn sm dg" data-act="epdel" data-n="${e.n}" ${d}>删除</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">还没有分集。点击"导入视频",一次选择多个文件,按文件名顺序对应集号。</td></tr>'}</tbody></table></div>
 <p style="margin-top:8px;color:var(--muted);font-size:12px">支持 MP4 / MOV,单集不超过 500MB。上传后自动转码为 720P 与 1080P,转码完成后才能上架。字幕支持 SRT / VTT。</p>`;
  }
  function refreshEp() {
    const el = document.querySelector('.dtab[data-i="1"]');
    if (el && CUR && CUR.c && CUR.c.id === 'dramas') {
      el.innerHTML = epTab(CUR.row);
    }
  }
  function epDone(list, id) {
    setTimeout(() => {
      list.forEach((e) => {
        e.video = '已转码';
        e.dur = '01:' + String(10 + ((e.n * 13) % 45)).padStart(2, '0');
      });
      if (CUR && CUR.row && CUR.row.id === id) refreshEp();
      else render();
    }, 1400);
  }
  function pickFiles(multi, cb) {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = 'video/*';
    i.multiple = multi;
    i.onchange = () => {
      const f = [...i.files].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );
      if (f.length) cb(f);
    };
    i.click();
  }
  const mb = (f) => Math.max(1, Math.round(f.size / 1048576)) + ' MB';

  /* ---------- AI candidate roles ---------- */
  const hsh = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const NAMES = [
    'Adrian',
    'Evelyn',
    'Damian',
    'Sophia',
    'Kai',
    'Mira',
    'Victor',
    'Elena',
    'Leo',
    'Isla',
    'Nolan',
    'Ivy',
    'Rhett',
    'Sienna',
  ];
  const ARCH = [
    {
      k: 'CEO',
      role: 'Billionaire CEO',
      trait: 'Charming, restless, secretly lonely',
      act: 'closes the laptop without looking up',
      line: 'You are the only one who never laughs at my jokes.',
      q: ['Accept the dinner', 'Tease him'],
    },
    {
      k: 'Revenge',
      role: 'The Avenger',
      trait: 'Patient, precise, carrying an old wound',
      act: 'sets a single photograph on the table',
      line: 'You have something I want back.',
      q: ['Ask what', 'Walk away'],
    },
    {
      k: 'Mafia',
      role: 'Mafia Boss',
      trait: 'Controlled, dangerous, strangely honest',
      act: 'turns the ring on his finger',
      line: 'Sit. Everyone who stands has a reason.',
      q: ['Sit', 'Stand your ground'],
    },
    {
      k: 'Werewolf',
      role: 'Lycan King',
      trait: 'Fierce, loyal, torn between two packs',
      act: 'kneels at your gate',
      line: 'I was told to hate you.',
      q: ['Kneel with him', 'Ask about the war'],
    },
    {
      k: 'Historical',
      role: 'Imperial Prince',
      trait: 'Composed, strategic, hiding a soft side',
      act: 'lowers his fan',
      line: 'Every smile in this palace hides a blade.',
      q: ['Smile back', 'Stay silent'],
    },
    {
      k: 'Mystery',
      role: 'Private Detective',
      trait: 'Sharp, sleepless, notices everything',
      act: 'studies your hands',
      line: 'You lied twice already.',
      q: ['Confess', 'Deflect'],
    },
    {
      k: 'Fantasy',
      role: 'Cursed Immortal',
      trait: 'Ancient, wry, bound by a bargain',
      act: 'lights a candle with a glance',
      line: 'One wish. The price is never the one I name first.',
      q: ['Make a wish', 'Ask the price'],
    },
    {
      k: 'Thriller',
      role: 'The Witness',
      trait: 'Nervous, observant, running out of time',
      act: 'checks the door again',
      line: 'Do not turn around.',
      q: ['Turn around', 'Whisper back'],
    },
    {
      k: 'Romance',
      role: 'Childhood Friend',
      trait: 'Gentle, patient, finally brave',
      act: 'holds out a folded note',
      line: 'I rehearsed this for ten years.',
      q: ['Read it', 'Hold his hand'],
    },
    {
      k: 'Drama',
      role: 'The Rival',
      trait: 'Proud, wounded, unexpectedly kind',
      act: 'pauses in the doorway',
      line: 'We never got to finish that conversation.',
      q: ['Finish it', 'Stay quiet'],
    },
  ];
  function genOne(d, i, style) {
    const pool = ARCH.filter((a) => d.tags.includes(a.k)).concat(
        ARCH.filter((a) => a.k === 'Drama'),
      ),
      A = pool[i % pool.length];
    const used = new Set(D.cands.concat(D.chars).map((x) => x.name));
    let k = hsh(d.title) + i * 3,
      name;
    do {
      name = NAMES[k++ % NAMES.length];
    } while (used.has(name) && k < hsh(d.title) + i * 3 + 40);
    const suf =
      style === '偏浪漫'
        ? ', with slow-burn tension'
        : style === '偏暗黑'
          ? ', with a darker edge'
          : '';
    return {
      id: nid(),
      name,
      drama: d.title,
      tags: [A.k].concat(d.tags.filter((t) => t !== A.k)).slice(0, 3),
      intro: A.role + ' in "' + d.title + '". ' + A.trait + suf + '.',
      open: '*' + name + ' ' + A.act + '.* “' + A.line + '”',
      q1: A.q[0],
      q2: A.q[1],
      prompt:
        'Portrait of ' +
        name +
        ', ' +
        A.role.toLowerCase() +
        ', cinematic lighting, deep crimson palette',
      score: 72 + (hsh(name + d.title) % 27),
      status: '待选',
    };
  }
  function genFor(d, n, style) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(genOne(d, i, style));
    return out;
  }
  D.cands = [];
  D.cands.push(
    ...genFor(D.dramas[0], 2, ''),
    ...genFor(D.dramas[3], 1, ''),
    ...genFor(D.dramas[1], 1, ''),
  );
  D.cands[2].status = '已忽略';
  [
    ['C2002', 'Midnight Kiss with the Devil'],
    ['C2003', "The Lycan King's Forbidden Mate"],
    ['C2004', 'Court of Vultures'],
  ].forEach(([id, t]) => {
    D.chars.find((c) => c.id === id).from = t;
  });
  function moveCand(r, viaForm) {
    D.chars.unshift({
      id: 'C' + (3000 + ++ID),
      name: r.name,
      author: '@flickme',
      tags: r.tags,
      chats: '0',
      status: '待审核',
      open: r.open,
      q1: r.q1,
      q2: r.q2,
      from: r.drama,
    });
    r.status = '已入库';
  }
  function regenCand(r) {
    const d = D.dramas.find((x) => x.title === r.drama),
      n = genOne(d, (r.v = (r.v || 0) + 1), '');
    Object.assign(r, n, { id: r.id, status: '待选', v: r.v });
  }
  function openGen() {
    const rw = can('cands') === 'rw',
      row = {
        drama: D.dramas.filter((d) => d.status === '上架')[0].title,
        n: 3,
        style: '忠于原剧',
        extra: '',
      };
    CUR = {
      gen: true,
      fields: [
        { t: 'select', k: 'drama', l: '来源短剧', o: D.dramas.map((d) => d.title) },
        { t: 'num', k: 'n', l: '生成数量(1–5)' },
        { t: 'select', k: 'style', l: '风格倾向', o: ['忠于原剧', '偏浪漫', '偏暗黑'] },
        { t: 'area', k: 'extra', l: '补充要求(可空)', h: '例如:偏重反派、增加一个女性角色' },
      ],
    };
    openDrawer({
      title: '从短剧生成角色',
      sub: '基于剧集简介、标签与分集字幕',
      body: `<div class="banner">生成结果进入备选库,状态为"待选"。上架前请人工核对角色名、设定与是否涉及真实人物或版权角色。</div><div id="dform" style="display:flex;flex-direction:column;gap:16px">${CUR.fields.map((f) => fieldHtml(f, row, !rw)).join('')}</div>`,
      foot: `<button class="btn" data-act="dclose">取消</button><button class="btn pri" id="gobtn" data-act="gengo" ${rw ? '' : 'disabled'}>开始生成</button>`,
    });
  }
  function runGen(list, msg) {
    const b = $('#gobtn');
    if (b) {
      b.disabled = true;
      b.textContent = '生成中…';
    }
    toast('AI 正在生成角色…');
    setTimeout(() => {
      list.forEach((x) => D.cands.unshift(...x));
      addLog('生成', 'AI 角色备选库', '新增 ' + list.reduce((n, x) => n + x.length, 0) + ' 个候选');
      closeDrawer();
      render();
      toast(msg(list.reduce((n, x) => n + x.length, 0)));
    }, 1200);
  }

  /* ---------- accounts & permissions ---------- */
  const roleKey = (n) => Object.keys(ROLES).find((k) => ROLES[k].n === n);
  const permOf = (rk, gid) => {
    const p = ROLES[rk].p;
    return p === '*' ? 'rw' : p[gid] || '';
  };
  const permPill = (p) =>
    p
      ? pill(p === 'rw' ? '读写' : '只读', p === 'rw' ? 'good' : '')
      : '<span class="mono">—</span>';
  function permTable(n) {
    const rk = roleKey(n);
    return `<table style="min-width:0"><thead><tr><th>菜单</th><th>权限</th></tr></thead><tbody>${NAV.map((g) => `<tr><td>${g.t}</td><td>${permPill(permOf(rk, g.id))}</td></tr>`).join('')}</tbody></table><p style="margin-top:8px;color:var(--muted);font-size:12px">权限由角色决定,在"角色与权限"中调整。评论管理按"客服与反馈"权限控制。</p>`;
  }
  D.accounts = [
    {
      id: 'U1',
      name: '超级管理员',
      email: 'admin@flickme.app',
      role: '超级管理员',
      tfa: true,
      last: '刚刚',
      status: '启用',
      self: true,
      note: '',
    },
    {
      id: 'U2',
      name: 'Owen',
      email: 'owen@flickme.app',
      role: '超级管理员',
      tfa: true,
      last: '10-18 21:10',
      status: '启用',
      note: '技术负责人',
    },
    {
      id: 'U3',
      name: 'Leo',
      email: 'leo@flickme.app',
      role: '运营',
      tfa: true,
      last: '10-19 09:41',
      status: '启用',
      note: '',
    },
    {
      id: 'U4',
      name: 'Zoe',
      email: 'zoe@flickme.app',
      role: '运营',
      tfa: true,
      last: '10-15 17:22',
      status: '停用',
      note: '已离岗',
    },
    {
      id: 'U5',
      name: 'Kai',
      email: 'kai@flickme.app',
      role: '内容',
      tfa: true,
      last: '10-18 15:02',
      status: '启用',
      note: '',
    },
    {
      id: 'U6',
      name: 'Mia',
      email: 'mia@flickme.app',
      role: '客服',
      tfa: false,
      last: '10-19 09:12',
      status: '启用',
      note: '',
    },
    {
      id: 'U7',
      name: 'Ann',
      email: 'ann@flickme.app',
      role: '财务',
      tfa: true,
      last: '10-18 18:30',
      status: '启用',
      note: '',
    },
    {
      id: 'U8',
      name: 'Nina',
      email: 'nina@flickme.app',
      role: '内容',
      tfa: true,
      last: '—',
      status: '待激活',
      note: '新入职',
    },
  ];
  function accountsPage() {
    const t = UI.acTab || 'list',
      tabs = `<div class="tabs"><button class="${t === 'list' ? 'on' : ''}" data-act="actab" data-t="list">账号列表</button><button class="${t === 'matrix' ? 'on' : ''}" data-act="actab" data-t="matrix">权限分布</button></div>`;
    if (t === 'list') {
      CR.accounts.pre = () => tabs;
      return crud(CR.accounts);
    }
    PAGE = { id: 'accounts' };
    const dist = Object.values(ROLES)
      .map(
        (r) =>
          `<span class="pill">${r.n} ${D.accounts.filter((a) => a.role === r.n).length}</span>`,
      )
      .join('');
    return `<div class="ph"><div><h1>账号管理</h1><p>每个账号在各菜单上的有效权限,由其角色决定。</p></div></div>${tabs}
  <div class="card"><div class="tb"><span class="tg">${dist}</span><span class="n">共 ${D.accounts.length} 个账号</span></div><div class="tw"><table class="mat" style="min-width:980px"><thead><tr><th>账号</th><th>角色</th>${NAV.map((g) => `<th>${g.t}</th>`).join('')}</tr></thead><tbody>${D.accounts
    .map((a) => {
      const rk = roleKey(a.role),
        off = a.status === '停用';
      return `<tr style="${off ? 'opacity:.5' : ''}"><td><b>${esc(a.name)}</b>${off ? ' ' + pill('停用', 'bad') : ''}<small style="display:block;color:var(--muted)">${esc(a.email)}</small></td><td>${pill(a.role)}</td>${NAV.map((g) => `<td>${permPill(permOf(rk, g.id))}</td>`).join('')}</tr>`;
    })
    .join('')}</tbody></table></div></div>`;
  }

  function flowStrip() {
    const n = (x) => D.chars.filter((c) => c.status === x).length,
      cur = (UI.f_characters && UI.f_characters.f.status) || '';
    const b = (x) =>
      `<button class="fs ${cur === x ? 'on' : ''}" data-act="stf" data-s="${x}"><b>${n(x)}</b>${x}</button>`;
    return `<div class="flow"><button class="fs ${cur === '' ? 'on' : ''}" data-act="stf" data-s="">全部</button><span style="width:6px"></span>${b('草稿')}<i>提交审核 →</i>${b('待审核')}<i>通过 →</i>${b('上架')}<i>⇄ 下架 / 重新上架</i>${b('下架')}<span style="width:12px"></span><i>待审核 驳回 →</i>${b('驳回')}</div>`;
  }
  D.chars.push(
    {
      id: 'C2007',
      name: 'Selene',
      author: '@nightowl',
      tags: ['Fantasy'],
      chats: '12.8K',
      status: '下架',
      open: 'The moon is wrong tonight.',
      q1: 'Look up',
      q2: 'Ignore it',
    },
    {
      id: 'C2008',
      name: 'Rowan',
      author: '@flickme',
      tags: ['Romance'],
      chats: '0',
      status: '驳回',
      reason: '开场白含不适宜内容,需修改',
      open: 'Come closer.',
      q1: 'Step forward',
      q2: 'Stay',
    },
    {
      id: 'C2009',
      name: 'Mira',
      author: '@flickme',
      tags: ['Mystery'],
      chats: '0',
      status: '草稿',
      open: '',
      q1: '',
      q2: '',
    },
  );
  D.wt = [
    [180, 5],
    [300, 10],
    [480, 15],
    [720, 25],
    [900, 40],
  ].map((a, i) => ({ id: 'WT' + i, sec: a[0], reward: a[1], en: true }));
  const fmtSec = (n) => {
    n = +n || 0;
    const m = Math.floor(n / 60),
      r = n % 60;
    return (m ? m + ' 分' : '') + (r || !m ? r + ' 秒' : '');
  };
  function wtTable(rw) {
    const d = rw ? '' : 'disabled',
      tot = D.wt.filter((x) => x.en).reduce((n, x) => n + (+x.reward || 0), 0);
    return `<h3>累计观看任务</h3><p style="color:var(--muted);margin:2px 0 12px;font-size:12.5px">按用户当日累计有效播放秒数结算,达标后在 Reward bonus 页领取,奖励计入 Bonus。每日 0 点重置。前台把秒数显示为分钟。</p>
  <div class="tw"><table style="min-width:560px" id="wtt"><thead><tr><th>累计秒数</th><th>前台显示</th><th>奖励(Bonus)</th><th>启用</th><th></th></tr></thead><tbody>${D.wt.map((x, i) => `<tr><td style="width:150px"><input class="in" type="number" min="1" data-wt="sec" data-i="${i}" value="${x.sec}" ${d}></td><td class="num" data-wtlab="${i}">${fmtSec(x.sec)}</td><td style="width:130px"><input class="in" type="number" min="0" data-wt="reward" data-i="${i}" value="${x.reward}" ${d}></td><td>${sw(x.en, 'wtsw', i, 'en', !rw)}</td><td><button class="btn sm dg" data-act="wtdel" data-i="${i}" ${d}>删除</button></td></tr>`).join('')}</tbody></table></div>
  <div style="display:flex;align-items:center;gap:12px;margin-top:10px"><button class="btn sm" data-act="wtadd" ${d}>新增档位</button><span style="color:var(--muted);font-size:12.5px">累计任务每日最多可得 <b id="wttot">${tot}</b> 金币;实时奖励每日最多 <b>${(D.forms.watch || {}).cap || 600}</b> 金币,两者分开计算。</span></div>`;
  }
  function syncWT() {
    document.querySelectorAll('[data-wt]').forEach((i) => {
      D.wt[+i.dataset.i][i.dataset.wt] = +i.value || 0;
    });
    D.wt.sort((a, b) => a.sec - b.sec);
  }
  const curVer = (r) => r.vers.find((v) => v.status === '当前');
  const legalState = (r) => (curVer(r) ? '已发布' : r.vers.length ? '草稿' : '未上传');
  D.legal = [
    {
      id: 'G1',
      name: 'Membership Agreement',
      again: true,
      vers: [
        {
          ver: '1.0',
          file: 'membership_agreement_v1.0.pdf',
          size: '182 KB',
          lang: 'English',
          eff: '2026-09-01',
          by: 'Ann',
          status: '当前',
        },
        {
          ver: '0.9',
          file: 'membership_agreement_v0.9.pdf',
          size: '171 KB',
          lang: 'English',
          eff: '2026-06-01',
          by: 'Ann',
          status: '历史',
        },
      ],
    },
    {
      id: 'G2',
      name: 'Payment Agreement',
      again: true,
      vers: [
        {
          ver: '1.0',
          file: 'payment_agreement_v1.0.pdf',
          size: '204 KB',
          lang: 'English',
          eff: '2026-09-01',
          by: 'Ann',
          status: '当前',
        },
      ],
    },
    {
      id: 'G3',
      name: 'Privacy Policy',
      again: true,
      vers: [
        {
          ver: '1.1',
          file: 'privacy_policy_v1.1.pdf',
          size: '236 KB',
          lang: 'English',
          eff: '2026-11-01',
          by: 'Owen',
          status: '草稿',
        },
        {
          ver: '1.0',
          file: 'privacy_policy_v1.0.pdf',
          size: '221 KB',
          lang: 'English',
          eff: '2026-09-01',
          by: 'Owen',
          status: '当前',
        },
      ],
    },
    { id: 'G4', name: 'Terms of Service', again: false, vers: [] },
  ];
  function nextVer(r) {
    const v = r.vers
      .map((x) => x.ver)
      .sort((a, b) => parseFloat(a) - parseFloat(b))
      .pop();
    if (!v) return '1.0';
    const p = v.split('.');
    return p[0] + '.' + ((+p[1] || 0) + 1);
  }
  function openLegal(id) {
    const r = D.legal.find((x) => x.id === id),
      rw = can('legal') === 'rw',
      c = curVer(r),
      d = rw ? '' : 'disabled';
    CUR = { legal: r };
    const body = `<div class="banner ${c ? '' : 'warn'}">${c ? `当前生效:v${esc(c.ver)} · ${esc(c.file)}` : '还没有生效版本,前台协议页显示为空。请上传并发布。'}</div>
  <div class="fld"><label>上传新版本</label><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label class="btn sm" for="lgfile">选择文件</label><input type="file" id="lgfile" accept=".pdf,.html,.md,.txt,.docx" hidden ${d}><span id="lgname" style="color:var(--muted);font-size:12.5px">支持 PDF / HTML / Markdown / Word,≤ 10MB</span></div></div>
  <div class="row2"><div class="fld"><label>版本号</label><input class="in" id="lgver" value="${nextVer(r)}" ${d}></div><div class="fld"><label>生效日期</label><input class="in" id="lgeff" placeholder="YYYY-MM-DD" value="2026-11-01" ${d}></div></div>
  <div class="row2"><div class="fld"><label>语言</label><select class="in" id="lglang" ${d}>${L7.map((x) => `<option>${x[1]}</option>`).join('')}</select></div><div class="fld"><label>重新同意</label><label class="sf"><input type="checkbox" id="lgagain" ${r.again ? 'checked' : ''} ${d}> <span>发布后要求用户重新确认</span></label></div></div>
  <div class="fld"><label>版本记录</label><div class="tw"><table style="min-width:0"><thead><tr><th>版本</th><th>文件</th><th>生效日期</th><th>状态</th><th></th></tr></thead><tbody>${r.vers.map((v, i) => `<tr><td><span class="mono">v${esc(v.ver)}</span></td><td>${esc(v.file)}<small style="display:block;color:var(--muted)">${esc(v.lang)} · ${v.size} · ${esc(v.by)}</small></td><td>${esc(v.eff)}</td><td>${pill(v.status, v.status === '当前' ? 'good' : v.status === '草稿' ? 'warn' : '')}</td><td style="white-space:nowrap">${v.status === '当前' ? '' : `<button class="btn sm" data-act="lgcur" data-i="${i}" ${d}>${v.status === '草稿' ? '发布' : '回退为当前'}</button> <button class="btn sm dg" data-act="lgdel" data-i="${i}" ${d}>删除</button>`}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">还没有版本</td></tr>'}</tbody></table></div></div>`;
    openDrawer({
      title: r.name,
      sub: '协议附件与版本',
      body,
      foot: rw
        ? `<button class="btn" data-act="dclose">关闭</button><button class="btn" data-act="lgsave" data-m="d">上传为草稿</button><button class="btn pri" data-act="lgsave" data-m="p">上传并发布</button>`
        : '<button class="btn" data-act="dclose">关闭</button>',
    });
  }
  let ASK = null;
  D.recs = [
    {
      id: 'R1',
      name: '播放器返回推荐层',
      where: '用户在播放器点返回时弹出的 More Dramas You\u2019ll Love 轮播,点 Watch 直接播放',
      src: '个性化推荐',
      n: 8,
      fb: '全站热榜',
      pin: '',
      en: true,
      status: '已发布',
    },
    {
      id: 'R2',
      name: '播放器 Related Shows',
      where: '播放器左下角 Related Hits 点开后的相关剧网格',
      src: '与当前剧相近',
      n: 12,
      fb: '全站热榜',
      pin: '',
      en: true,
      status: '已发布',
    },
    {
      id: 'R3',
      name: 'Plays · Most Trending',
      where: 'Plays 的 Following 页,追剧列表下方的热榜',
      src: '全站热榜',
      n: 6,
      fb: '不补位',
      pin: '',
      en: true,
      status: '已发布',
    },
    {
      id: 'R4',
      name: '剧集详情 More Like This',
      where: '剧集详情 Synopsis 页签底部的相近剧',
      src: '与当前剧相近',
      n: 4,
      fb: '全站热榜',
      pin: '',
      en: true,
      status: '已发布',
    },
    {
      id: 'R5',
      name: 'Home Continue 续播小卡',
      where: 'Short 首页左下角悬浮的继续观看卡片',
      src: '用户最近观看',
      n: 1,
      fb: '不补位',
      pin: '',
      en: true,
      status: '已发布',
    },
  ];
  let PAGE = {};
  const ST = ['草稿', '已发布'];
  const CR = {
    dramas: {
      id: 'dramas',
      title: 'Short 剧库',
      desc: '管理剧、分集视频、标签、角标与免费集数。上架前需完成免费集视频转码;下架后前台 Short 分类、搜索与 Topic 均不可见。',
      newBtn: '新建剧集',
      rows: () => D.dramas,
      list: () => D.dramas,
      sv: { d: '草稿', p: '上架' },
      tempId: () => 'D' + (1100 + ++ID),
      blank: {
        title: '',
        tags: [],
        eps: 0,
        free: 6,
        badge: '',
        views: '0',
        heat: 0,
        status: '草稿',
        syn: '',
        pubAt: '',
      },
      guard: (row, m) => {
        if (m !== 'p') return;
        if (!row.title) return '请填写剧名';
        const a = eps(row.id);
        if (!a.length) return '请先在"分集"页签导入视频再上架';
        const need = Math.min(row.free || 0, a.length);
        if (a.filter((e) => e.video === '已转码').length < need)
          return '上架前需完成前 ' + need + ' 集免费集的视频转码';
      },
      onPub: (row) => {
        const a = eps(row.id);
        row.eps = a.length;
        if (a.every((e) => e.status === '下架'))
          a.forEach((e) => {
            if (e.video === '已转码') e.status = '上架';
          });
      },
      filters: [
        { k: 'status', l: '状态', o: ['上架', '下架', '草稿'] },
        { k: 'badge', l: '角标', o: ['HOT', 'NEW', 'EXCLUSIVE'] },
      ],
      cols: [
        {
          l: '剧集',
          r: (r) =>
            `<div class="tt"><span class="cv" style="background:${grad(r.title)}"></span><div><b>${esc(r.title)}</b><small>${r.id}</small></div></div>`,
        },
        { l: '标签', k: 'tags' },
        { l: '角标', r: (r) => (r.badge ? pill(r.badge, 'info') : '—') },
        {
          l: '上架集 / 总集',
          n: 1,
          r: (r) => {
            const a = eps(r.id);
            return a.filter((e) => e.status === '上架').length + ' / ' + a.length;
          },
        },
        { l: '免费集', k: 'free', n: 1 },
        { l: '播放量', k: 'views', n: 1 },
        { l: '状态', k: 'status' },
        { l: '更新', k: 'upd' },
      ],
      actions: [
        {
          l: '上架',
          show: (r) => r.status !== '上架',
          do: (r) => {
            const e = CR.dramas.guard(r, 'p');
            if (e) return e;
            r.status = '上架';
            CR.dramas.onPub(r);
          },
        },
        {
          l: '下架',
          c: 'dg',
          show: (r) => r.status === '上架',
          confirm: (r) =>
            '《' +
            r.title +
            '》下架后,前台 Short 分类、搜索与 Topic 均不可见;已追剧用户的列表显示为已下架;已解锁记录保留。',
          do: (r) => {
            r.status = '下架';
          },
        },
      ],
      fields: [
        { t: 'text', k: 'title', l: '剧名' },
        { t: 'area', k: 'syn', l: '简介' },
        { t: 'multi', k: 'tags', l: '标签', o: TAGS_S, h: '前台卡片最多展示 2 个标签,取前两项' },
        { t: 'ro', k: 'eps', l: '总集数', h: '由分集数决定,在"分集"页签导入' },
        { t: 'num', k: 'free', l: '免费集数', h: '默认 6,可单剧覆盖' },
        { t: 'select', k: 'badge', l: '角标', o: ['', 'HOT', 'NEW', 'EXCLUSIVE'] },
        { t: 'dt', k: 'pubAt', l: '定时上架时间(可空)', h: '到点自动上架;为空则手动上架' },
      ],
      tabs: [
        { t: '分集与视频', r: (r) => epTab(r) },
        {
          t: '封面',
          r: (r) =>
            `<div class="cv" style="width:120px;height:168px;margin:0;background:${grad(r.title)}"></div><p class="hint" style="margin-top:8px;color:var(--muted)">封面 3:4.3,支持 JPG / PNG,≤ 2MB。</p>`,
        },
      ],
    },
    chars: {
      id: 'characters',
      title: 'Stories 角色库',
      desc: '只有"上架"状态的角色会出现在前台 Stories。新角色需先提交审核,通过后上架;上架中的角色可随时下架。',
      newBtn: '新建角色',
      rows: () => D.chars,
      list: () => D.chars,
      sv: { d: '草稿', p: '待审核' },
      blank: {
        name: '',
        author: '@flickme',
        tags: [],
        chats: '0',
        status: '草稿',
        open: '',
        q1: '',
        q2: '',
      },
      pre: () => flowStrip(),
      note: (r) =>
        ({
          草稿: ['', '草稿,仅后台可见。填写完整后点"提交审核"。'],
          待审核: ['warn', '等待审核。审核人可"通过"上架,或"驳回"并填写原因。'],
          驳回: [
            'warn',
            '已驳回' + (r.reason ? ':' + esc(r.reason) : '') + '。修改后可重新提交审核。',
          ],
          上架: ['', '已上架,前台可见。如需调整内容,保存修改即时生效;不再展示请点"下架"。'],
          下架: ['warn', '已下架,前台不可见,聊天记录保留。可重新上架。'],
        })[r.status] || ['', ''],
      footFn: (r, rw, isNew) => {
        if (!rw) return '<button class="btn" data-act="dclose">关闭</button>';
        const x = '<button class="btn" data-act="dclose">取消</button>';
        if (isNew || r.status === '草稿')
          return (
            x +
            '<button class="btn" data-act="save" data-m="d">保存草稿</button><button class="btn pri" data-act="save" data-m="p">提交审核</button>'
          );
        if (r.status === '驳回')
          return (
            x +
            '<button class="btn" data-act="save" data-m="k">保存修改</button><button class="btn pri" data-act="flow" data-to="待审核">重新提交审核</button>'
          );
        if (r.status === '待审核')
          return (
            x +
            '<button class="btn" data-act="save" data-m="k">保存修改</button><button class="btn dg" data-act="flow" data-to="驳回">驳回</button><button class="btn pri" data-act="flow" data-to="上架">通过并上架</button>'
          );
        if (r.status === '上架')
          return (
            x +
            '<button class="btn" data-act="save" data-m="k">保存修改</button><button class="btn dg" data-act="flow" data-to="下架">下架</button>'
          );
        return (
          x +
          '<button class="btn" data-act="save" data-m="k">保存修改</button><button class="btn pri" data-act="flow" data-to="上架">重新上架</button>'
        );
      },
      filters: [{ k: 'status', l: '状态', o: ['草稿', '待审核', '驳回', '上架', '下架'] }],
      cols: [
        {
          l: '角色',
          r: (r) =>
            `<div class="tt"><span class="cv" style="background:${grad(r.name)}"></span><div><b>${esc(r.name)}</b><small>${r.id}${r.from ? ' · 来自 ' + esc(r.from) : ''}</small></div></div>`,
        },
        { l: '作者', k: 'author' },
        { l: '标签', k: 'tags' },
        { l: '聊天数', k: 'chats', n: 1 },
        {
          l: '状态',
          r: (r) =>
            pill(r.status) +
            (r.status === '驳回' && r.reason ? `<span class="rsn">${esc(r.reason)}</span>` : ''),
        },
      ],
      actions: [
        {
          l: '提交审核',
          show: (r) => r.status === '草稿',
          do: (r) => {
            r.status = '待审核';
          },
        },
        {
          l: '通过',
          c: 'pri',
          show: (r) => r.status === '待审核',
          do: (r) => {
            r.status = '上架';
            r.reason = '';
          },
        },
        {
          l: '驳回',
          c: 'dg',
          show: (r) => r.status === '待审核',
          ask: '驳回原因',
          do: (r, c, why) => {
            r.status = '驳回';
            r.reason = why;
          },
        },
        {
          l: '重新提交',
          show: (r) => r.status === '驳回',
          do: (r) => {
            r.status = '待审核';
          },
        },
        {
          l: '下架',
          c: 'dg',
          show: (r) => r.status === '上架',
          confirm: (r) =>
            '角色"' + r.name + '"下架后,前台 Stories 与搜索不再展示;已有聊天记录保留。',
          do: (r) => {
            r.status = '下架';
          },
        },
        {
          l: '重新上架',
          show: (r) => r.status === '下架',
          do: (r) => {
            r.status = '上架';
          },
        },
      ],
      fields: [
        { t: 'text', k: 'name', l: '角色名' },
        { t: 'text', k: 'author', l: '作者' },
        { t: 'multi', k: 'tags', l: '标签', o: TAGS_S },
        { t: 'area', k: 'open', l: '开场白' },
        { t: 'text', k: 'q1', l: '快捷回复 1' },
        { t: 'text', k: 'q2', l: '快捷回复 2' },
      ],
    },
    tags: {
      id: 'tags',
      title: '标签与合集',
      desc: '标签用于分类 Chips 与 Topic 主题页;合集在 For you 的 You May Like 中以合集卡出现,合集数量跟随有效合集数。',
      newBtn: '新建',
      rows: () => D.tags,
      list: () => D.tags,
      blank: { key: '', name: mlv('', ''), kind: '标签', count: 0, en: true, status: '草稿' },
      filters: [{ k: 'kind', l: '类型', o: ['标签', '合集'] }],
      cols: [
        { l: '名称', r: (r) => `<b>${esc(r.name.en)}</b> <span class="mono">${esc(r.key)}</span>` },
        { l: '类型', r: (r) => pill(r.kind, r.kind === '合集' ? 'info' : '') },
        { l: '剧数', k: 'count', n: 1 },
        { l: '启用', k: 'en' },
        { l: '状态', k: 'status' },
      ],
      fields: [
        { t: 'text', k: 'key', l: 'tagKey', h: '稳定标识,创建后不建议修改' },
        { t: 'ml', k: 'name', l: '多语言名称' },
        { t: 'select', k: 'kind', l: '类型', o: ['标签', '合集'] },
        { t: 'sw', k: 'en', l: '启用', sl: '启用(合集无剧时不展示)' },
      ],
    },
    comments: {
      id: 'comments',
      title: '评论管理',
      desc: '审核队列。被举报评论优先展示,可通过或删除。',
      rows: () => D.comments.slice().sort((a, b) => b.reports - a.reports),
      filters: [{ k: 'status', l: '状态', o: ['待审核', '已通过', '已删除'] }],
      cols: [
        {
          l: '评论',
          r: (r) =>
            `<b>${esc(r.user)}</b><small style="display:block;color:var(--muted)">${esc(r.text)}</small>`,
        },
        { l: '剧集', k: 'drama' },
        { l: '举报', r: (r) => (r.reports ? pill(r.reports + ' 次', 'bad') : '0') },
        { l: '时间', k: 'time' },
        { l: '状态', k: 'status' },
      ],
      actions: [
        {
          l: '通过',
          show: (r) => r.status === '待审核',
          do: (r) => {
            r.status = '已通过';
          },
        },
        {
          l: '删除',
          c: 'dg',
          show: (r) => r.status !== '已删除',
          do: (r) => {
            r.status = '已删除';
          },
        },
      ],
    },
    cands: {
      id: 'cands',
      title: 'AI 角色备选库',
      desc: '根据短剧剧情、标签与分集字幕,由 AI 生成角色草案。人工校对后加入 Stories 角色库,进入“待审核”,通过后才对前台可见。',
      newBtn: '从短剧生成角色',
      onNew: () => openGen(),
      rows: () => D.cands,
      list: () => D.cands,
      sv: { d: '待选', p: '已入库' },
      noDraft: false,
      pubLabel: '加入角色库(待审核)',
      onPub: (r) => moveCand(r, true),
      banner: () => {
        const miss = D.dramas.filter(
          (d) =>
            d.status === '上架' &&
            !D.chars.some((c) => c.from === d.title) &&
            !D.cands.some((c) => c.drama === d.title),
        );
        return miss.length
          ? [
              '',
              `<span>${miss.length} 部上架短剧还没有对应角色。</span><button class="btn sm" style="margin-left:auto" data-act="genall">一键各生成 2 个</button>`,
            ]
          : null;
      },
      filters: [{ k: 'status', l: '状态', o: ['待选', '已入库', '已忽略'] }],
      cols: [
        {
          l: '角色',
          r: (r) =>
            `<div class="tt"><span class="cv" style="background:${grad(r.name)};width:30px;height:30px;border-radius:50%"></span><div><b>${esc(r.name)}</b><small>${esc(r.intro).slice(0, 70)}…</small></div></div>`,
        },
        { l: '来源短剧', k: 'drama' },
        { l: '标签', k: 'tags' },
        {
          l: '匹配度',
          r: (r) =>
            `<div class="score"><b>${r.score}</b><div class="bar"><i style="width:${r.score}%"></i></div></div>`,
        },
        { l: '状态', k: 'status' },
      ],
      actions: [
        {
          l: '加入角色库',
          c: 'pri',
          show: (r) => r.status === '待选',
          do: (r) => {
            moveCand(r, false);
          },
        },
        {
          l: '重新生成',
          show: (r) => r.status === '待选',
          do: (r) => {
            regenCand(r);
          },
        },
        {
          l: '忽略',
          c: 'dg',
          show: (r) => r.status === '待选',
          do: (r) => {
            r.status = '已忽略';
          },
        },
        {
          l: '恢复',
          show: (r) => r.status === '已忽略',
          do: (r) => {
            r.status = '待选';
          },
        },
      ],
      fields: [
        { t: 'text', k: 'name', l: '角色名' },
        { t: 'ro', k: 'drama', l: '来源短剧' },
        { t: 'multi', k: 'tags', l: '标签', o: TAGS_S },
        { t: 'area', k: 'intro', l: '角色简介' },
        { t: 'area', k: 'open', l: '开场白' },
        { t: 'text', k: 'q1', l: '快捷回复 1' },
        { t: 'text', k: 'q2', l: '快捷回复 2' },
        { t: 'area', k: 'prompt', l: '形象图描述(用于生成角色形象)' },
      ],
    },
    accounts: {
      id: 'accounts',
      title: '账号管理',
      desc: '后台账号的新增、停用与删除。新增账号会发送邀请邮件,首次登录需设置密码并开启两步验证。权限由角色决定。',
      newBtn: '新增账号',
      keepStatus: true,
      noDraft: true,
      pubLabel: '创建并发送邀请',
      rows: () => D.accounts,
      list: () => D.accounts,
      blank: {
        name: '',
        email: '',
        role: '运营',
        tfa: true,
        last: '—',
        status: '待激活',
        note: '',
      },
      guard: (row, m, isNew) => {
        if (!row.name.trim() || !/^\S+@\S+\.\S+$/.test(row.email)) return '请填写姓名和有效邮箱';
        if (D.accounts.some((a) => a.email === row.email && a.id !== row.id))
          return '该邮箱已存在账号';
      },
      saveMsg: (row, isNew) => (isNew ? '已创建账号,邀请邮件已发送至 ' + row.email : '已保存'),
      filters: [
        { k: 'role', l: '角色', o: Object.values(ROLES).map((r) => r.n) },
        { k: 'status', l: '状态', o: ['启用', '停用', '待激活'] },
      ],
      cols: [
        {
          l: '账号',
          r: (r) =>
            `<div class="tt"><span class="av" style="margin-right:10px">${esc(r.name.slice(0, 1))}</span><div><b>${esc(r.name)}</b>${r.self ? ' ' + pill('当前', 'info') : ''}<small>${esc(r.email)}</small></div></div>`,
        },
        { l: '角色', r: (r) => pill(r.role) },
        {
          l: '可访问菜单',
          n: 1,
          r: (r) => {
            const rk = roleKey(r.role);
            return NAV.filter((g) => permOf(rk, g.id)).length + ' / ' + NAV.length;
          },
        },
        { l: '两步验证', r: (r) => (r.tfa ? pill('已要求', 'good') : pill('未要求', 'warn')) },
        { l: '最近登录', k: 'last' },
        { l: '状态', k: 'status' },
      ],
      actions: [
        {
          l: '停用',
          show: (r) => !r.self && r.status === '启用',
          confirm: (r) => '停用后 ' + r.name + ' 无法登录,已登录会话立即失效。',
          do: (r) => {
            if (
              r.role === '超级管理员' &&
              D.accounts.filter((a) => a.role === '超级管理员' && a.status === '启用').length < 2
            )
              return '至少保留一个启用的超级管理员';
            r.status = '停用';
          },
        },
        {
          l: '启用',
          show: (r) => r.status === '停用',
          do: (r) => {
            r.status = '启用';
          },
        },
        { l: '重发邀请', show: (r) => r.status === '待激活', do: (r) => {} },
        {
          l: '重置密码',
          show: (r) => !r.self && r.status === '启用',
          confirm: (r) => '将向 ' + r.email + ' 发送重置链接,原密码立即失效。',
          do: (r) => {},
        },
        {
          l: '删除',
          c: 'dg',
          show: (r) => !r.self,
          confirm: (r) => '删除账号 ' + r.name + '(' + r.email + ')后不可恢复,其历史操作日志保留。',
          do: (r, c) => {
            if (
              r.role === '超级管理员' &&
              D.accounts.filter((a) => a.role === '超级管理员' && a.id !== r.id).length < 1
            )
              return '至少保留一个超级管理员';
            D.accounts.splice(D.accounts.indexOf(r), 1);
          },
        },
      ],
      fields: [
        { t: 'text', k: 'name', l: '姓名' },
        { t: 'text', k: 'email', l: '邮箱(登录名)' },
        {
          t: 'select',
          k: 'role',
          l: '角色',
          o: Object.values(ROLES).map((r) => r.n),
          h: '角色决定可访问的菜单与读写权限,见"权限预览"页签',
        },
        { t: 'sw', k: 'tfa', l: '两步验证', sl: '强制开启两步验证' },
        { t: 'area', k: 'note', l: '备注' },
      ],
      tabs: [{ t: '权限预览', r: (r) => permTable(r.role) }],
    },
    recs: {
      id: 'recs',
      title: '推荐位配置',
      desc: 'App 里有 5 个"给用户推荐剧"的位置。这里不选具体的剧,只设规则:每个位置展示几部、从哪里挑、数据不够时用什么补。也可以把某部剧固定放在第 1 位。',
      rows: () => D.recs,
      list: () => D.recs,
      publish: true,
      cols: [
        {
          l: '位置',
          r: (r) =>
            `<b>${esc(r.name)}</b><small style="display:block;color:var(--muted);max-width:360px">${esc(r.where)}</small>`,
        },
        { l: '数据来源', k: 'src' },
        { l: '展示数量', k: 'n', n: 1 },
        { l: '不足时补位', k: 'fb' },
        { l: '固定第 1 位', r: (r) => (r.pin ? esc(r.pin) : '—') },
        { l: '启用', k: 'en' },
      ],
      fields: [
        { t: 'ro', k: 'name', l: '位置' },
        { t: 'ro', k: 'where', l: '出现在哪里' },
        {
          t: 'select',
          k: 'src',
          l: '数据来源',
          o: ['个性化推荐', '全站热榜', '与当前剧相近', '用户最近观看'],
          h: '个性化推荐:按用户观看与喜好;相近:按标签重合度',
        },
        { t: 'num', k: 'n', l: '展示数量' },
        {
          t: 'select',
          k: 'fb',
          l: '不足时补位',
          o: ['全站热榜', '不补位'],
          h: '来源数据不够数量时用什么补',
        },
        {
          t: 'select',
          k: 'pin',
          l: '固定第 1 位的剧(可空)',
          o: [''].concat(D.dramas.map((d) => d.title)),
        },
        { t: 'sw', k: 'en', l: '启用' },
      ],
    },
    words: {
      id: 'words',
      title: '搜索推荐词',
      desc: '搜索框占位推荐词,前台每 3 秒轮换一次。支持定时上下线与多语言。',
      newBtn: '新增推荐词',
      rows: () => D.words,
      list: () => D.words,
      blank: { word: '', sort: 5, en: true, start: '', end: '', status: '草稿' },
      cols: [
        { l: '推荐词', k: 'word' },
        { l: '顺序', k: 'sort', n: 1 },
        { l: '生效', r: (r) => `<span class="mono">${r.start} → ${r.end}</span>` },
        { l: '启用', k: 'en' },
        { l: '状态', k: 'status' },
      ],
      fields: [
        { t: 'text', k: 'word', l: '推荐词' },
        { t: 'num', k: 'sort', l: '顺序' },
        { t: 'dt', k: 'start', l: '开始时间' },
        { t: 'dt', k: 'end', l: '结束时间' },
        { t: 'sw', k: 'en', l: '启用' },
      ],
    },
    filters: {
      id: 'filters',
      title: 'Stories 筛选标签',
      desc: '筛选半屏中的 4 组标签,可多选,组内标签之间为"任一匹配"。',
      newBtn: '新增分组',
      rows: () => D.filters,
      list: () => D.filters,
      blank: { group: '', tags: '', order: 5, en: true },
      publish: true,
      cols: [
        { l: '分组', k: 'group' },
        {
          l: '标签',
          r: (r) =>
            `<span class="tg">${r.tags
              .split(',')
              .map((x) => `<span class="pill">${esc(x.trim())}</span>`)
              .join('')}</span>`,
        },
        { l: '顺序', k: 'order', n: 1 },
        { l: '启用', k: 'en' },
      ],
      fields: [
        { t: 'text', k: 'group', l: '分组名称' },
        { t: 'area', k: 'tags', l: '标签(逗号分隔)' },
        { t: 'num', k: 'order', l: '顺序' },
        { t: 'sw', k: 'en', l: '启用' },
      ],
    },
    userlist: {
      id: 'userlist',
      title: '用户列表',
      desc: '按 UID 查询用户,查看余额、会员、解锁与封禁状态。',
      rows: () => D.users,
      list: () => D.users,
      keepStatus: true,
      filters: [
        { k: 'vip', l: '会员', o: ['无', 'Weekly', 'Monthly', 'Yearly'] },
        { k: 'status', l: '状态', o: ['正常', '封禁'] },
      ],
      noDraft: true,
      pubLabel: '保存',
      sv: { d: '正常', p: '正常' },
      cols: [
        { l: 'UID', k: 'uid', mono: 1 },
        { l: '登录方式', k: 'login' },
        { l: 'Member coins', k: 'coins', n: 1 },
        { l: 'Bonus', k: 'bonus', n: 1 },
        { l: '会员', r: (r) => (r.vip === '无' ? '—' : pill(r.vip, 'info')) },
        { l: '已解锁集', k: 'unlocked', n: 1 },
        { l: '注册', k: 'reg' },
        { l: '状态', k: 'status' },
      ],
      fields: [
        { t: 'ro', k: 'uid', l: 'UID' },
        { t: 'ro', k: 'login', l: '登录方式' },
        { t: 'ro', k: 'coins', l: 'Member coins' },
        { t: 'ro', k: 'bonus', l: 'Bonus' },
        { t: 'ro', k: 'vip', l: '会员' },
        {
          t: 'select',
          k: 'status',
          l: '账号状态',
          o: ['正常', '封禁'],
          h: '封禁后用户无法登录与消耗金币,需填写原因并记入日志',
        },
      ],
    },
    coinadj: {
      id: 'coinadj',
      title: '金币调整',
      desc: '手动增减用户金币。所有调整需由另一位管理员审批后生效,并记入操作日志。',
      newBtn: '发起调整',
      approval: true,
      rows: () => D.adj,
      list: () => D.adj,
      blank: {
        uid: '',
        coin: 'Member coins',
        delta: 0,
        reason: '',
        by: '当前账号',
        status: '待审批',
      },
      filters: [{ k: 'status', l: '状态', o: ['待审批', '已发布', '驳回'] }],
      cols: [
        { l: 'UID', k: 'uid', mono: 1 },
        { l: '币种', k: 'coin' },
        {
          l: '变动',
          r: (r) =>
            `<b class="num ${r.delta > 0 ? 'up' : 'dn'}">${r.delta > 0 ? '+' : ''}${r.delta}</b>`,
        },
        { l: '原因', k: 'reason' },
        { l: '发起人', k: 'by' },
        { l: '状态', k: 'status' },
      ],
      fields: [
        { t: 'text', k: 'uid', l: '用户 UID' },
        { t: 'select', k: 'coin', l: '币种', o: ['Member coins', 'Bonus'] },
        { t: 'num', k: 'delta', l: '变动数量', h: '正数增加,负数扣减' },
        { t: 'area', k: 'reason', l: '原因(必填)' },
      ],
      actions: [
        {
          l: '批准',
          only: 'admin',
          show: (r) => r.status === '待审批',
          do: (r) => {
            r.status = '已发布';
          },
        },
        {
          l: '驳回',
          c: 'dg',
          only: 'admin',
          show: (r) => r.status === '待审批',
          do: (r) => {
            r.status = '驳回';
          },
        },
      ],
    },
    plans: {
      id: 'plans',
      title: '会员套餐',
      desc: '套餐与商店商品映射。价格以商店返回为准,此处为运营展示与权益配置。价格变更需审批。',
      approval: true,
      rows: () => D.plans,
      list: () => D.plans,
      cols: [
        { l: '套餐', k: 'name' },
        {
          l: '价格',
          r: (r) =>
            `<b class="num">$${r.price}</b>` +
            (r.intro ? ` <span class="pill info">首周 $${r.intro}</span>` : ''),
        },
        { l: '周期', k: 'period' },
        { l: 'VIP 金币', k: 'coins' },
        { l: 'iOS 商品 ID', k: 'ios', mono: 1 },
        { l: 'Android 商品 ID', k: 'and', mono: 1 },
        { l: '启用', k: 'en' },
        { l: '状态', k: 'status' },
      ],
      fields: [
        { t: 'text', k: 'name', l: '套餐名称' },
        { t: 'num', k: 'price', l: '标准价(USD)' },
        { t: 'num', k: 'intro', l: '首周价(USD)', h: '仅 Weekly;为空表示无首周优惠' },
        { t: 'text', k: 'coins', l: 'VIP 金币发放' },
        { t: 'text', k: 'ios', l: 'iOS 商品 ID' },
        { t: 'text', k: 'and', l: 'Android 商品 ID' },
        { t: 'sw', k: 'en', l: '启用' },
      ],
    },
    packs: {
      id: 'packs',
      title: '充值包',
      desc: '金币充值档位。基础币计入 Member coins,赠送币计入 Bonus。价格变更需审批。',
      approval: true,
      newBtn: '新增档位',
      rows: () => D.packs,
      list: () => D.packs,
      blank: { coins: 0, bonus: 0, price: 0, sort: 7, en: true, status: '草稿' },
      cols: [
        { l: '顺序', k: 'sort', n: 1 },
        { l: '基础币', k: 'coins', n: 1 },
        { l: '赠送币', k: 'bonus', n: 1 },
        { l: '价格(USD)', r: (r) => `<b class="num">$${r.price}</b>` },
        { l: '启用', k: 'en' },
        { l: '状态', k: 'status' },
      ],
      fields: [
        { t: 'num', k: 'coins', l: '基础币' },
        { t: 'num', k: 'bonus', l: '赠送币' },
        { t: 'num', k: 'price', l: '价格(USD)' },
        { t: 'num', k: 'sort', l: '顺序' },
        { t: 'sw', k: 'en', l: '启用' },
      ],
    },
    coupons: {
      id: 'coupons',
      title: '优惠券',
      desc: '会员优惠券。当前为 Weekly 首周券:进入会员页触发,限时倒计时,每账号一次。',
      newBtn: '新建优惠券',
      approval: true,
      rows: () => D.coupons,
      list: () => D.coupons,
      blank: {
        name: '',
        off: 0,
        plan: 'Weekly',
        mins: 10,
        limit: '每账号 1 次',
        trigger: '进入会员页',
        en: true,
        status: '草稿',
        used: '0 / 0',
      },
      cols: [
        { l: '名称', k: 'name' },
        { l: '立减(USD)', r: (r) => `<b class="num">$${r.off}</b>` },
        { l: '适用套餐', k: 'plan' },
        { l: '限时', r: (r) => r.mins + ' 分钟' },
        { l: '领取 / 触发', k: 'used', n: 1 },
        { l: '启用', k: 'en' },
        { l: '状态', k: 'status' },
      ],
      fields: [
        { t: 'text', k: 'name', l: '名称' },
        { t: 'num', k: 'off', l: '立减金额(USD)' },
        { t: 'select', k: 'plan', l: '适用套餐', o: ['Weekly'] },
        { t: 'num', k: 'mins', l: '限时(分钟)' },
        { t: 'select', k: 'trigger', l: '触发场景', o: ['进入会员页'] },
        { t: 'sw', k: 'en', l: '启用' },
      ],
    },
    orders: {
      id: 'orders',
      title: '订单与流水',
      desc: '充值与订阅订单。退款与对账以商店结算为准。',
      rows: () => D.orders,
      filters: [
        { k: 'status', l: '状态', o: ['成功', '失败', '退款'] },
        { k: 'pay', l: '渠道', o: ['Apple', 'Google'] },
      ],
      cols: [
        { l: '订单号', k: 'id', mono: 1 },
        { l: 'UID', k: 'uid', mono: 1 },
        { l: '商品', k: 'item' },
        { l: '金额', r: (r) => `<b class="num">$${r.amt}</b>` },
        { l: '渠道', k: 'pay' },
        { l: '时间', k: 'time' },
        { l: '状态', k: 'status' },
      ],
    },
    models: {
      id: 'models',
      title: '模型管理',
      desc: 'Chat 可选模型。免费模型单条消耗封顶;VIP 模型仅会员可选,VIP 过期后自动回落 Auto。',
      newBtn: '新增模型',
      approval: true,
      rows: () => D.models,
      list: () => D.models,
      blank: {
        name: '',
        kind: 'VIP',
        est: 10,
        cap: 0,
        tag: '',
        en: true,
        isnew: false,
        status: '草稿',
      },
      cols: [
        { l: '模型', k: 'name' },
        { l: '类型', r: (r) => pill(r.kind, r.kind === 'VIP' ? 'warn' : 'good') },
        { l: '预估单条', k: 'est', n: 1 },
        { l: '单条封顶', r: (r) => r.cap || '—' },
        { l: '标语', k: 'tag' },
        { l: 'NEW', k: 'isnew' },
        { l: '启用', k: 'en' },
        { l: '状态', k: 'status' },
      ],
      fields: [
        { t: 'text', k: 'name', l: '名称' },
        { t: 'select', k: 'kind', l: '类型', o: ['FREE', 'VIP'] },
        { t: 'num', k: 'est', l: '预估单条价格(金币)' },
        { t: 'num', k: 'cap', l: '单条封顶', h: '免费模型填 10,VIP 模型填 0 表示不封顶' },
        { t: 'text', k: 'tag', l: '标语' },
        { t: 'sw', k: 'isnew', l: '显示 NEW 标识' },
        { t: 'sw', k: 'en', l: '启用' },
      ],
    },
    memory: {
      id: 'memory',
      title: '记忆档位',
      desc: '记忆上限档位与价格系数。单条价格 = 模型基础价 × 记忆系数 × 回复长度因子。',
      rows: () => D.memory,
      list: () => D.memory,
      approval: true,
      cols: [
        { l: '档位', k: 'cap' },
        { l: '权限', r: (r) => pill(r.vip, r.vip === 'VIP' ? 'warn' : 'good') },
        { l: '价格系数', r: (r) => '×' + r.mult },
        { l: '默认档位', k: 'def' },
      ],
      fields: [
        { t: 'ro', k: 'cap', l: '档位' },
        { t: 'select', k: 'vip', l: '权限', o: ['免费', 'VIP'] },
        { t: 'num', k: 'mult', l: '价格系数' },
      ],
    },
    checkin: {
      id: 'checkin',
      title: '签到奖励',
      desc: '7 天一轮,断签后从 Day 1 重新开始。奖励计入 Bonus。',
      rows: () => D.checkin,
      list: () => D.checkin,
      publish: true,
      cols: [
        { l: '天数', k: 'day' },
        { l: '奖励(Bonus)', r: (r) => `<b class="num">+${r.reward}</b>` },
      ],
      fields: [
        { t: 'ro', k: 'day', l: '天数' },
        { t: 'num', k: 'reward', l: '奖励金币' },
      ],
    },
    taskcfg: {
      id: 'taskcfg',
      title: '任务配置',
      desc: 'Reward bonus 页中的新手、观看、日常任务。奖励计入 Bonus,按重置周期刷新。观看任务按用户当日累计有效播放秒数结算,与播放器实时奖励共用同一份播放时长,奖励分开计算。',
      fix: (r) => {
        if (r.group === '观看任务' && r.sec)
          r.name = 'Watch dramas for ' + Math.round(r.sec / 6) / 10 + ' min';
        if (r.group !== '观看任务') delete r.sec;
      },
      newBtn: '新增任务',
      rows: () => D.taskcfg,
      list: () => D.taskcfg,
      blank: { group: '日常任务', name: '', sec: 0, reward: 5, reset: '每日', en: true },
      publish: true,
      filters: [{ k: 'group', l: '分组', o: ['新手任务', '观看任务', '日常任务'] }],
      cols: [
        { l: '分组', k: 'group' },
        { l: '任务', k: 'name' },
        {
          l: '触发条件',
          r: (r) =>
            r.group === '观看任务' && r.sec
              ? `累计播放 <b class="num">${r.sec}</b> 秒 <span class="mono">${fmtSec(r.sec)}</span>`
              : '—',
        },
        { l: '奖励', r: (r) => `<b class="num">+${r.reward}</b>` },
        { l: '重置', k: 'reset' },
        { l: '启用', k: 'en' },
      ],
      fields: [
        { t: 'select', k: 'group', l: '分组', o: ['新手任务', '观看任务', '日常任务'] },
        { t: 'text', k: 'name', l: '任务名称', h: '观看任务的名称随累计秒数自动生成' },
        {
          t: 'num',
          k: 'sec',
          l: '累计播放秒数(仅观看任务)',
          h: '按用户当日累计有效播放秒数结算,前台显示为分钟',
        },
        { t: 'num', k: 'reward', l: '奖励金币' },
        { t: 'select', k: 'reset', l: '重置周期', o: ['一次性', '每日'] },
        { t: 'sw', k: 'en', l: '启用' },
      ],
    },
    pushtasks: {
      id: 'pushtasks',
      title: '推送任务',
      desc: '运营推送与自动触发推送。群发需审批;每用户每日营销推送不超过 3 条,22:00–08:00 不下发。',
      newBtn: '新建推送',
      approval: true,
      rows: () => D.push,
      list: () => D.push,
      blank: {
        type: 'New Series',
        title: mlv('', ''),
        audience: '全部用户',
        land: '播放器第 1 集',
        at: '',
        status: '草稿',
      },
      filters: [
        {
          k: 'type',
          l: '类型',
          o: ['New Series', 'Continue', 'Hot Deals', 'Reward', 'Chat reply'],
        },
        { k: 'status', l: '状态', o: ['草稿', '待审批', '已发布'] },
      ],
      cols: [
        { l: '类型', r: (r) => pill(r.type, 'info') },
        { l: '文案', r: (r) => esc(r.title.en) },
        { l: '人群', k: 'audience' },
        { l: '落地页', k: 'land' },
        { l: '下发', k: 'at' },
        { l: '状态', k: 'status' },
      ],
      fields: [
        {
          t: 'select',
          k: 'type',
          l: '类型',
          o: ['New Series', 'Continue', 'Hot Deals', 'Reward', 'Chat reply'],
        },
        { t: 'ml', k: 'title', l: '文案(多语言)' },
        {
          t: 'select',
          k: 'audience',
          l: '目标人群',
          o: [
            '全部用户',
            '开启新剧提醒的用户',
            '非 VIP 活跃用户',
            '流失 7 天用户',
            '中断观看 24 小时用户',
            '开启奖励提醒的用户',
          ],
        },
        {
          t: 'select',
          k: 'land',
          l: '落地页',
          o: ['播放器第 1 集', '播放器续播', '会员页', 'Reward bonus', '角色 Chat'],
        },
        { t: 'dt', k: 'at', l: '下发时间' },
      ],
    },
    liveact: {
      id: 'liveact',
      title: 'Live Activity 模板',
      desc: 'iOS 锁屏与灵动岛展示内容。容器由系统提供,这里只配置内容字段。',
      rows: () => D.live,
      list: () => D.live,
      publish: true,
      cols: [
        { l: '模板', k: 'name' },
        { l: '状态', k: 'state' },
        { l: '内容字段', k: 'fields' },
        { l: '启用', k: 'en' },
      ],
      fields: [
        { t: 'text', k: 'name', l: '模板' },
        { t: 'area', k: 'fields', l: '内容字段' },
        { t: 'sw', k: 'en', l: '启用' },
      ],
    },
    feedback: {
      id: 'feedback',
      title: '反馈与举报工单',
      desc: '播放反馈、Chat 点踩反馈和评论举报统一在此处理。',
      rows: () => D.fb,
      filters: [
        { k: 'status', l: '状态', o: ['待处理', '已处理'] },
        { k: 'src', l: '来源', o: ['播放', 'Chat', '评论举报'] },
      ],
      cols: [
        { l: '来源', r: (r) => pill(r.src) },
        { l: '原因', k: 'reason' },
        { l: '说明', k: 'detail' },
        { l: 'UID', k: 'uid', mono: 1 },
        { l: '时间', k: 'time' },
        { l: '状态', k: 'status' },
      ],
      actions: [
        {
          l: '标记已处理',
          show: (r) => r.status === '待处理',
          do: (r) => {
            r.status = '已处理';
          },
        },
      ],
    },
    logs: {
      id: 'logs',
      title: '操作日志',
      desc: '所有写操作记录操作人、时间与变更内容,只读。',
      rows: () => D.logs,
      filters: [{ k: 'act', l: '动作', o: ['发布', '编辑', '保存草稿', '提交审批', '下架'] }],
      cols: [
        { l: '时间', k: 'time' },
        { l: '操作人', r: (r) => esc(r.who) + ' ' + pill(r.role) },
        { l: '动作', k: 'act' },
        { l: '对象', k: 'obj' },
        { l: '变更', k: 'diff' },
      ],
    },
    legal: {
      id: 'legal',
      title: '协议管理',
      desc: '会员协议、支付协议、隐私政策、服务条款以附件上传,按版本管理。发布一个版本即设为当前生效版本;历史版本保留,可随时回退。',
      rows: () => D.legal,
      onOpen: (id) => openLegal(id),
      cols: [
        { l: '协议', r: (r) => `<b>${esc(r.name)}</b>` },
        {
          l: '当前版本',
          r: (r) => {
            const c = curVer(r);
            return c ? `<span class="mono">v${esc(c.ver)}</span>` : '—';
          },
        },
        {
          l: '文件',
          r: (r) => {
            const c = curVer(r);
            return c ? esc(c.file) : '—';
          },
        },
        {
          l: '生效日期',
          r: (r) => {
            const c = curVer(r);
            return c ? esc(c.eff) : '—';
          },
        },
        { l: '版本数', r: (r) => r.vers.length, n: 1 },
        { l: '状态', r: (r) => pill(legalState(r)) },
      ],
    },
  };
  const FP = {
    rules: {
      id: 'rules',
      title: '金币规则',
      desc: '解锁、生成、奖励等金币参数。前台所有价格与上限取自此处。',
      approval: true,
      banner: ['warn', '价格类参数变更需审批,审批通过后按客户端缓存周期逐步生效。'],
      init: {
        unlock: 60,
        free: 6,
        ads: 5,
        img: 30,
        imgfree: 1,
        vid: 100,
        inner: 5,
        tip1: 10,
        tip2: 50,
        tip3: 100,
        bonusm: 12,
        auto: true,
      },
      sections: [
        {
          t: '剧集解锁',
          d: '前 N 集免费,之后每集消耗金币,或通过 VIP / 广告解锁。',
          f: [
            { t: 'num', k: 'unlock', l: '单集解锁价(金币)' },
            { t: 'num', k: 'free', l: '默认免费集数' },
            { t: 'num', k: 'ads', l: '广告解锁每日次数' },
            { t: 'sw', k: 'auto', l: '自动解锁默认值', sl: '新用户默认开启' },
          ],
        },
        {
          t: 'Chat 与生成',
          d: '内心独白、图片、视频的单次价格。',
          f: [
            { t: 'num', k: 'inner', l: '查看内心独白(金币)' },
            { t: 'num', k: 'img', l: '生成图片(金币)' },
            { t: 'num', k: 'imgfree', l: '每账号首次免费图片次数' },
            { t: 'num', k: 'vid', l: '生成视频(金币)' },
          ],
        },
        {
          t: '打赏与有效期',
          d: '打赏快捷档位之外支持自定义金额。',
          f: [
            { t: 'num', k: 'tip1', l: '打赏档位 1' },
            { t: 'num', k: 'tip2', l: '打赏档位 2' },
            { t: 'num', k: 'tip3', l: '打赏档位 3' },
            { t: 'num', k: 'bonusm', l: 'Bonus 有效期(月)' },
          ],
        },
      ],
    },
    watch: {
      id: 'watch',
      title: '实时观看奖励',
      desc: '播放器里的 Watch to earn:边看边得,到账不需要领取。与"累计观看任务"共用同一份有效播放时长(服务端上报,暂停、退出、切后台不计),两类奖励分开计算、各有上限。累计观看任务在"任务配置"中设置。',
      init: { sec: 5, coins: 2, cap: 600 },
      sections: [
        {
          t: '实时奖励',
          d: '每看满一段时间立即得金币,计入 Bonus,有效期 12 个月。每日上限只针对实时奖励,不含任务奖励。',
          f: [
            { t: 'num', k: 'sec', l: '每满(秒)' },
            { t: 'num', k: 'coins', l: '奖励金币' },
            { t: 'num', k: 'cap', l: '每账号每日上限(金币)' },
          ],
        },
      ],
    },
    pushdef: {
      id: 'pushdef',
      title: '通知默认与频控',
      desc: '设置页通知开关默认值与全局推送频控。',
      init: { n1: true, n2: true, n3: false, cap: 3, quiet1: '22:00', quiet2: '08:00', dedupe: 24 },
      sections: [
        {
          t: '默认开关',
          d: '新用户设置页 Notifications 的初始状态。',
          f: [
            { t: 'sw', k: 'n1', l: 'New episode alerts', sl: '默认开' },
            { t: 'sw', k: 'n2', l: 'Live events', sl: '默认开' },
            { t: 'sw', k: 'n3', l: 'Reward reminders', sl: '默认开' },
          ],
        },
        {
          t: '频控',
          d: '营销类推送的全局限制。',
          f: [
            { t: 'num', k: 'cap', l: '每用户每日上限(条)' },
            { t: 'text', k: 'quiet1', l: '免打扰开始(用户本地时间)' },
            { t: 'text', k: 'quiet2', l: '免打扰结束' },
            { t: 'num', k: 'dedupe', l: '同类型去重(小时)' },
          ],
        },
      ],
    },
    safety: {
      id: 'safety',
      title: '内容安全',
      desc: '生成与评论内容的审核策略。',
      init: { gen: true, refund: true, cm: true, sla: 24, words: 'v2026.10.12' },
      sections: [
        {
          t: '审核策略',
          d: '生成内容与评论先审核再展示;生成失败自动退还金币(含免费次数)。',
          f: [
            { t: 'sw', k: 'gen', l: '生成内容审核', sl: '开启' },
            { t: 'sw', k: 'refund', l: '失败自动退款', sl: '开启' },
            { t: 'sw', k: 'cm', l: '评论先审后发', sl: '开启' },
            { t: 'num', k: 'sla', l: '举报处理时限(小时)' },
            { t: 'ro', k: 'words', l: '敏感词库版本' },
          ],
        },
      ],
    },
    hot: {
      id: 'hot',
      title: '热门池与排序',
      desc: '决定 Short 热门区、Stories Explore 与分类 Feed 的数据来源。Explore 为跨题材随机,从热门池取样,会话内稳定。',
      init: { topn: 50, refresh: '每小时', hotn: 9, page: 20, stories: 8 },
      sections: [
        {
          t: '热门池',
          d: '热度由播放量、完播、新增追剧综合计算。',
          f: [
            { t: 'num', k: 'topn', l: '热门池大小 TopN' },
            { t: 'select', k: 'refresh', l: '刷新周期', o: ['每小时', '每 6 小时', '每天'] },
            { t: 'num', k: 'hotn', l: 'For you 热门区数量(3 列)' },
            { t: 'num', k: 'stories', l: 'Stories 横滑行数量' },
            { t: 'num', k: 'page', l: 'Feed 每页数量' },
            {
              t: 'ro',
              k: 'gap',
              l: '合集卡插入规则',
              h: '从首位起,每隔 3、4、3、4 张普通卡插入 1 张合集卡',
            },
          ],
        },
      ],
      extra: (rw) =>
        `<h3>热门池预览</h3><p style="color:var(--muted);margin:2px 0 12px;font-size:12.5px">按热度排序的前 8 部。置顶固定在池首,屏蔽则不进入热门池。</p><div class="tw"><table style="min-width:520px"><thead><tr><th>#</th><th>剧集</th><th>热度</th><th>置顶</th><th>屏蔽</th></tr></thead><tbody>${D.dramas
          .slice()
          .sort((a, b) => b.heat - a.heat)
          .slice(0, 8)
          .map(
            (r, i) =>
              `<tr><td class="num">${i + 1}</td><td>${esc(r.title)}</td><td class="num">${r.heat}</td><td>${sw(r.pin, 'sw', r.id, 'pin', !rw)}</td><td>${sw(r.block, 'sw', r.id, 'block', !rw)}</td></tr>`,
          )
          .join('')}</tbody></table></div>`,
    },
    launch: {
      id: 'launch',
      title: '启动弹窗',
      desc: '冷启动进入 Home 后弹出一次。同一时刻只出现一个弹窗,优先级:启动弹窗 > 会员优惠券 > Daily Dramas。',
      init: {
        on: true,
        drama: "The CEO's Trap",
        cover: '未上传(使用剧封面)',
        trig: '每次冷启动一次',
        btn: 'Start Watching',
      },
      sections: [
        {
          t: '弹窗配置',
          d: '推荐剧由服务端按用户返回,无个性化数据时取热榜第 1;此处为兜底。',
          f: [
            { t: 'sw', k: 'on', l: '启用', sl: '开启' },
            { t: 'select', k: 'drama', l: '兜底推荐剧', o: D.dramas.map((d) => d.title) },
            { t: 'ro', k: 'cover', l: '弹窗封面' },
            { t: 'ro', k: 'trig', l: '触发' },
            { t: 'ro', k: 'btn', l: '按钮文案' },
          ],
        },
      ],
      extra: () =>
        `<h3>预览</h3><p style="color:var(--muted);margin:2px 0 12px;font-size:12.5px">示意,以客户端实际渲染为准。</p><div class="pop"><div class="im"></div><b>Your Next Favorite</b><small>Perfect picks based on your taste!</small><u>Start Watching</u></div>`,
    },
  };
  const SPECIAL = {
    overview: () => overview(),
    chips: () => chipsPage(),
    roles: () => rolesPage(),
  };
  const PAGES = {
    recs: () => crud(CR.recs),
    cands: () => crud(CR.cands),
    accounts: () => accountsPage(),
    dramas: () => crud(CR.dramas),
    characters: () => crud(CR.chars),
    tags: () => crud(CR.tags),
    comments: () => crud(CR.comments),
    words: () => crud(CR.words),
    filters: () => crud(CR.filters),
    userlist: () => crud(CR.userlist),
    coinadj: () => crud(CR.coinadj),
    plans: () => crud(CR.plans),
    packs: () => crud(CR.packs),
    coupons: () => crud(CR.coupons),
    orders: () => crud(CR.orders),
    models: () => crud(CR.models),
    memory: () => crud(CR.memory),
    checkin: () => crud(CR.checkin),
    taskcfg: () => crud(CR.taskcfg),
    pushtasks: () => crud(CR.pushtasks),
    liveact: () => crud(CR.liveact),
    feedback: () => crud(CR.feedback),
    logs: () => crud(CR.logs),
    legal: () => crud(CR.legal),
    rules: () => formPage(FP.rules),
    watch: () => formPage(FP.watch),
    pushdef: () => formPage(FP.pushdef),
    safety: () => formPage(FP.safety),
    hot: () => formPage(FP.hot),
    launch: () => formPage(FP.launch),
    ...SPECIAL,
  };
  CR.chars.id = 'characters';
  const CRBY = {};
  Object.values(CR).forEach((c) => (CRBY[c.id] = c));

  /* ---------- overview ---------- */
  function overview() {
    PAGE = { id: 'overview' };
    const rev = [9.8, 10.4, 11.2, 10.9, 12.6, 14.1, 13.5, 12.2, 13.8, 15.6, 16.9, 15.2, 17.8, 18.4],
      dau = [96, 98, 101, 99, 106, 114, 112, 108, 115, 121, 126, 119, 125, 128];
    const W = 640,
      H = 230,
      pl = 44,
      pr = 16,
      pt = 14,
      pb = 28,
      max = 20,
      x = (i) => pl + (i * (W - pl - pr)) / 13,
      y = (v) => pt + (H - pt - pb) * (1 - v / max);
    const line = (a) =>
      a.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
    const dmax = 140,
      yd = (v) => pt + (H - pt - pb) * (1 - v / dmax);
    const days = ['10-06', '', '', '', '10-10', '', '', '', '10-14', '', '', '', '10-18', ''];
    const svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="近 14 天收入与 DAU 趋势">
   ${[0, 5, 10, 15, 20].map((t) => `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${pl - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">$${t}K</text>`).join('')}
   ${days.map((d, i) => (d ? `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--muted)">${d}</text>` : '')).join('')}
   <path d="${line(dau.map((v) => (v / dmax) * 20))}" fill="none" stroke="var(--info)" stroke-width="1.6" stroke-dasharray="4 3"/>
   <path d="${line(rev)}L${x(13)} ${y(0)}L${x(0)} ${y(0)}Z" fill="var(--accent-soft)" opacity=".8"/>
   <path d="${line(rev)}" fill="none" stroke="var(--accent)" stroke-width="2.2"/>
   <circle cx="${x(13)}" cy="${y(rev[13])}" r="4" fill="var(--accent)"/><text x="${x(13) - 6}" y="${y(rev[13]) - 9}" text-anchor="end" font-size="11.5" fill="var(--fg)" font-weight="600">$18.4K</text></svg>`;
    const k = [
      ['DAU', '128.4K', '+4.1%', 1],
      ['今日收入', '$18,420', '+8.3%', 1],
      ['金币消耗', '2.31M', '+2.7%', 1],
      ['新增付费用户', '1,284', '-1.9%', 0],
      ['次日留存', '41.2%', '+0.6pt', 1],
      ['活跃 VIP', '12.6K', '+3.2%', 1],
    ];
    const src = [
      ['剧集解锁', 58],
      ['Chat 消息', 27],
      ['图片 / 视频生成', 11],
      ['打赏与其他', 4],
    ];
    const todo = [
      ['待审批', '3', '金币调整、价格变更、推送群发', 'coinadj'],
      ['待审核评论', '46', '含 7 条被多次举报', 'comments'],
      ['未处理工单', '18', '播放反馈与 Chat 反馈', 'feedback'],
      ['即将到期配置', '2', '搜索推荐词、优惠券', 'words'],
    ].filter((t) => can(t[3]));
    return `<div class="ph"><div><h1>数据概览</h1><p>核心指标与待办。以下为示例数据。</p></div></div>
  <div class="kpis">${k.map((a) => `<div class="card kpi"><small>${a[0]}</small><b>${a[1]}</b><span class="${a[3] ? 'up' : 'dn'}">${a[2]} 较昨日</span></div>`).join('')}</div>
  <div class="grid2"><div class="card sec"><h3>近 14 天收入与 DAU</h3><p>红色实线为收入(USD),蓝色虚线为 DAU(按右侧 140K 满刻度折算)。</p>${svg}</div>
  <div style="display:flex;flex-direction:column;gap:16px"><div class="card"><div class="sec" style="padding-bottom:6px"><h3>待办</h3></div>${todo.map((t) => `<button class="todo" data-act="nav" data-p="${t[3]}"><b>${t[1]}</b><span>${t[0]}<small>${t[2]}</small></span></button>`).join('') || '<div class="empty">暂无待办</div>'}</div>
  <div class="card sec"><h3>金币消耗构成</h3><p>今日,按场景占比。</p>${src.map((s) => `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><span>${s[0]}</span><b class="num">${s[1]}%</b></div><div class="bar"><i style="width:${s[1]}%"></i></div></div>`).join('')}</div></div></div>`;
  }

  /* ---------- chips page ---------- */
  function chipsPage() {
    PAGE = { id: 'chips' };
    const rw = can('chips') === 'rw',
      tab = UI.chipTab || 'short',
      L = D.chips[tab];
    return `<div class="ph"><div><h1>首页分类 Chips</h1><p>Home 顶部分类标签。For you 固定在首位且不可停用;其余可新增、排序、定时上下线。名称为多语言。客户端缓存 10 分钟,拉取失败使用本地兜底。</p></div><div class="act">${rw ? '' : pill('当前角色只读', 'warn')}<button class="btn" data-act="chipnew" ${rw ? '' : 'disabled'}>新增分类</button><button class="btn pri" data-act="chippub" ${rw ? '' : 'disabled'}>${UI.chipDirty ? '发布更改' : '发布'}</button></div></div>
  ${UI.chipDirty ? `<div class="banner warn">有未发布的更改,线上仍为 v12。</div>` : ''}
  <div class="tabs"><button class="${tab === 'short' ? 'on' : ''}" data-act="chiptab" data-t="short">Short</button><button class="${tab === 'stories' ? 'on' : ''}" data-act="chiptab" data-t="stories">Stories</button></div>
  <div class="two"><div class="card" id="clist">${L.map((c, i) => `<div class="li ${c[2] === '' && c[1] === 'system' && i === 0 ? 'lock' : ''}" ${rw && i ? 'draggable="true"' : ''} data-i="${i}"><span class="hd">${i ? '⋮⋮' : '•'}</span><div class="nm"><b>${esc(c[0])}</b><small>${c[1] === 'system' ? '系统分类' : '标签分类 · ' + esc(c[2])}${i === 0 ? ' · 固定首位' : ''}</small></div>${pill(c[1] === 'system' ? 'system' : 'tag', c[1] === 'system' ? 'info' : '')}<span class="mono">#${i + 1}</span>${i ? `<button class="btn sm" data-act="chipedit" data-i="${i}">编辑</button>` : ''} <button class="sw ${c[3] ? 'on' : ''}" ${!rw || !i ? 'disabled' : ''} data-act="chipsw" data-i="${i}" aria-pressed="${!!c[3]}"></button></div>`).join('')}</div>
  <div class="card sec"><h3>客户端预览</h3><p>${tab === 'short' ? 'Short' : 'Stories'} 页顶部,文字 Tab 形态。</p><div class="phone"><div class="hdr">${tab === 'short' ? 'Short <span>Stories</span>' : '<span>Short</span> Stories'}</div><div class="ch2">${L.filter(
    (c) => c[3],
  )
    .map((c, i) => (i ? `<i>${esc(c[0])}</i>` : `<b>${esc(c[0])}</b>`))
    .join('')}</div><div class="g"><div></div><div></div><div></div></div></div></div></div>`;
  }
  function chipFields() {
    return [
      { t: 'select', k: 'type', l: '类型', o: ['system', 'tag'] },
      { t: 'text', k: 'tagKey', l: 'tagKey', h: 'type=tag 时必填,对应标签库中的稳定标识' },
      { t: 'ml', k: 'names', l: '多语言名称' },
      { t: 'dt', k: 'startAt', l: '开始时间(可空)' },
      { t: 'dt', k: 'endAt', l: '结束时间(可空)' },
    ];
  }
  function openChip(i) {
    const L = D.chips[UI.chipTab || 'short'],
      c = i == null ? ['', 'tag', '', 1] : L[i],
      rw = can('chips') === 'rw';
    CUR = { chip: true, i };
    const row = {
      type: c[1],
      tagKey: c[2],
      names: c[4]?.names || mlv(c[0], ''),
      startAt: c[4]?.startAt || '',
      endAt: c[4]?.endAt || '',
    };
    CUR.fields = chipFields();
    openDrawer({
      title: i == null ? '新增分类' : '编辑分类',
      sub: UI.chipTab === 'stories' ? 'Stories' : 'Short',
      body: `<div id="dform" style="display:flex;flex-direction:column;gap:16px">${CUR.fields.map((f) => fieldHtml(f, row, !rw)).join('')}</div>`,
      foot: `<button class="btn" data-act="dclose">取消</button>${i == null ? '' : '<button class="btn dg" data-act="chipdel">删除</button>'}<button class="btn pri" data-act="chipsave" ${rw ? '' : 'disabled'}>保存</button>`,
    });
  }

  /* ---------- roles ---------- */
  function rolesPage() {
    PAGE = { id: 'roles' };
    const cell = (r, g) => {
      const p = permOf(r, g.id);
      if (r === 'admin') return permPill(p);
      return `<button class="pill ${p === 'rw' ? 'good' : ''}" data-act="rolecell" data-r="${r}" data-g="${g.id}" title="点击切换">${p ? (p === 'rw' ? '读写' : '只读') : '—'}</button>`;
    };
    return `<div class="ph"><div><h1>角色与权限</h1><p>点击单元格在 无 / 只读 / 读写 之间切换,立即生效并记入操作日志。超级管理员固定全部读写。高风险操作(金币调整、价格变更、推送群发)需二人审批。</p></div></div>
  <div class="card"><div class="tw"><table class="mat"><thead><tr><th>菜单</th>${Object.keys(ROLES)
    .map(
      (r) =>
        `<th>${ROLES[r].n}<small style="display:block;font-weight:400">${D.accounts.filter((a) => a.role === ROLES[r].n).length} 个账号</small></th>`,
    )
    .join('')}</tr></thead><tbody>${NAV.map(
    (g) =>
      `<tr><td><b>${g.t}</b></td>${Object.keys(ROLES)
        .map((r) => `<td>${cell(r, g)}</td>`)
        .join('')}</tr>`,
  ).join(
    '',
  )}<tr><td><b>评论管理</b><small style="display:block;color:var(--muted)">按"客服与反馈"权限控制</small></td>${Object.keys(
    ROLES,
  )
    .map((r) => `<td>${permPill(permOf(r, 'service'))}</td>`)
    .join('')}</tr></tbody></table></div></div>
  <div class="card" style="margin-top:16px"><div class="sec"><h3>需要二人审批的操作</h3><p>提交后进入"待审批",由另一位超级管理员批准后生效。</p><div class="tg">${['金币调整', '会员套餐价格', '充值包价格', '优惠券', '模型价格与权限', '金币规则', '推送群发'].map((x) => `<span class="pill info">${x}</span>`).join('')}</div></div></div>`;
  }

  /* ---------- render / router ---------- */
  function renderSide() {
    const cur = location.hash.slice(1) || 'overview',
      cg = groupOf(cur);
    $('#side').innerHTML =
      `<div class="brand"><i><svg viewBox="0 0 24 24"><path d="M8 5l12 7-12 7z"/></svg></i><div>Flickme<small>运营后台</small></div></div><nav class="nav">${visibleGroups()
        .map((g) => {
          if (g.p.length === 1 && g.id === 'overview')
            return `<button class="ni ${cur === g.p[0][0] ? 'on' : ''}" data-act="nav" data-p="${g.p[0][0]}">${ic(g.ic)}${g.t}</button>`;
          const open = UI.open[g.id] || (cg && cg.id === g.id && UI.open[g.id] !== false);
          return `<button class="ng ${open ? 'open' : ''} ${cg && cg.id === g.id ? 'cur' : ''}" data-act="grp" data-g="${g.id}">${ic(g.ic)}${g.t}<svg class="ch" viewBox="0 0 24 24"><path d="${ICON.chev}"/></svg></button><div class="sub ${open ? 'open' : ''}">${g.p.map((x) => `<button class="ni ${cur === x[0] ? 'on' : ''}" data-act="nav" data-p="${x[0]}">${x[1]}</button>`).join('')}</div>`;
        })
        .join('')}</nav>`;
  }
  function render() {
    persist();
    const pid = location.hash.slice(1) || 'overview';
    if (!groupOf(pid) || !can(pid)) {
      $('#view').innerHTML = '<div class="empty" role="status">当前页面不可访问</div>';
      return;
    }
    const g = groupOf(pid),
      pg = g.p.find((x) => x[0] === pid);
    $('#crumb').innerHTML = `${g.t} › <b>${pg[1]}</b>`;
    $('#view').innerHTML = PAGES[pid]();
    renderSide();
  }
  function nav(p) {
    location.hash = p;
    document.body.classList.remove('navopen');
    closeDrawer();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) {
      if (!e.target.closest('.gs')) $('#gsres').classList.remove('on');
      return;
    }
    const k = a.dataset.act,
      id = a.dataset.id;
    if (a.disabled) return;
    if (
      ![
        'nav',
        'grp',
        'menu',
        'theme',
        'dclose',
        'open',
        'chiptab',
        'dtab',
        'mltab',
        'flt',
        'stf',
        'mclose',
        'page',
        'pg',
      ].includes(k) &&
      can(options.page) !== 'rw'
    ) {
      toast('当前账号没有写入权限');
      return;
    }
    const cfg = () => CRBY[location.hash.slice(1) || 'overview'];
    if (a.tagName === 'TR' && e.target.closest('button,input,select')) return;
    switch (k) {
      case 'nav':
        nav(a.dataset.p);
        break;
      case 'pg': {
        const state = UI['f_' + PAGE.id];
        state.page = +a.dataset.page;
        render();
        break;
      }
      case 'grp': {
        const g = a.dataset.g;
        const cg = groupOf(location.hash.slice(1) || 'overview');
        const open = UI.open[g] || (cg && cg.id === g && UI.open[g] !== false);
        UI.open[g] = !open;
        renderSide();
        break;
      }
      case 'menu':
        document.body.classList.toggle('navopen');
        break;
      case 'theme': {
        const r = document.documentElement,
          dark = r.dataset.theme
            ? r.dataset.theme === 'dark'
            : matchMedia('(prefers-color-scheme:dark)').matches;
        r.dataset.theme = dark ? 'light' : 'dark';
        break;
      }
      case 'dclose':
        closeDrawer();
        break;
      case 'open': {
        const c = cfg();
        if (c && c.onOpen) c.onOpen(id);
        else if (c && c.fields) openRow(c, id);
        break;
      }
      case 'new': {
        const c = cfg();
        if (c && c.onNew) c.onNew();
        else if (c) openRow(c, null);
        break;
      }
      case 'save':
        saveRow(a.dataset.m);
        break;
      case 'chip':
        a.classList.toggle('on');
        break;
      case 'mltab': {
        const w = a.closest('.fld');
        w.querySelectorAll('.lt button').forEach((b) => b.classList.toggle('on', b === a));
        w.querySelectorAll('[data-ml]').forEach((i) => (i.hidden = i.dataset.ml !== a.dataset.c));
        break;
      }
      case 'dtab': {
        document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b === a));
        const i = +a.dataset.i;
        $('#dform').hidden = i !== 0;
        document.querySelectorAll('.dtab').forEach((t) => (t.hidden = +t.dataset.i !== i));
        break;
      }
      case 'sw': {
        e.stopPropagation();
        const pid = location.hash.slice(1) || 'overview';
        if (pid === 'hot') {
          const r = D.dramas.find((x) => x.id === id);
          r[a.dataset.k] = !r[a.dataset.k];
        } else if (pid === 'chips') {
        } else {
          const c = cfg();
          const r = c.rows().find((x) => x.id === id);
          if (r) r[a.dataset.k] = !r[a.dataset.k];
          addLog('编辑', c.title + ' · ' + id, a.dataset.k + ' 切换');
        }
        render();
        toast('已更新');
        break;
      }
      case 'ract': {
        e.stopPropagation();
        const c = cfg(),
          r = c.rows().find((x) => x.id === id),
          act = c.actions[+a.dataset.i];
        const exec = () => {
          const res = act.do(r, c);
          if (typeof res === 'string') {
            toast(res);
            return;
          }
          addLog(act.l, c.title + ' · ' + id, '');
          render();
          toast('已' + act.l);
        };
        if (act.ask) {
          ASK = (why) => {
            const res = act.do(r, c, why);
            addLog(act.l, c.title + ' · ' + id, why);
            render();
            toast('已' + act.l);
          };
          $('#modal').innerHTML =
            `<div class="box"><h3>${act.l}</h3><p>${act.ask}将显示给提交人。</p><textarea class="in" id="reason" rows="3" placeholder="请填写"></textarea><div class="f" style="margin-top:14px"><button class="btn" data-act="mclose">取消</button><button class="btn pri" data-act="askgo">确认</button></div></div>`;
          $('#modal').classList.add('on');
        } else if (act.confirm)
          confirmBox(
            act.l + '?',
            typeof act.confirm === 'function' ? act.confirm(r) : act.confirm,
            exec,
            act.l,
          );
        else exec();
        break;
      }
      case 'flt':
        break;
      case 'fpsave': {
        const c = PAGE,
          fields = c.sections.flatMap((s) => s.f),
          values = readForm(fields, $('#fp'));
        if (
          fields.some((f) => f.t === 'num' && (!Number.isFinite(values[f.k]) || values[f.k] < 0))
        ) {
          toast('请填写有效的非负数值');
          break;
        }
        if (c.id === 'watch' && values.sec <= 0) {
          toast('观看奖励间隔必须大于 0 秒');
          break;
        }
        if (c.onSave) c.onSave();
        D.forms[c.id] = Object.assign(D.forms[c.id] || {}, values);
        addLog(c.approval ? '提交审批' : '发布', c.title, '');
        toast(c.approval ? '已提交,等待第二位管理员审批' : '已发布');
        break;
      }
      case 'fpreset':
        render();
        toast('已还原为当前线上配置');
        break;
      case 'chiptab':
        UI.chipTab = a.dataset.t;
        render();
        break;
      case 'chipsw': {
        const L = D.chips[UI.chipTab || 'short'];
        L[+a.dataset.i][3] = L[+a.dataset.i][3] ? 0 : 1;
        UI.chipDirty = true;
        render();
        break;
      }
      case 'chipnew':
        openChip(null);
        break;
      case 'chipedit':
        openChip(+a.dataset.i);
        break;
      case 'chipsave': {
        const v = readForm(CUR.fields, $('#dform')),
          L = D.chips[UI.chipTab || 'short'];
        const name = v.names.en || v.names['zh-Hans'];
        if (!name) {
          toast('请填写名称');
          break;
        }
        if (v.type === 'tag' && !v.tagKey) {
          toast('标签分类需填写 tagKey');
          break;
        }
        if (v.startAt && v.endAt && v.startAt >= v.endAt) {
          toast('结束时间必须晚于开始时间');
          break;
        }
        const row = [
          name,
          v.type,
          v.type === 'tag' ? v.tagKey : '',
          1,
          { names: v.names, startAt: v.startAt, endAt: v.endAt },
        ];
        if (CUR.i == null) L.push(row);
        else {
          row[3] = L[CUR.i][3];
          L[CUR.i] = row;
        }
        UI.chipDirty = true;
        closeDrawer();
        render();
        toast('已保存,发布后生效');
        break;
      }
      case 'chipdel': {
        const i = CUR.i;
        confirmBox(
          '删除分类',
          '删除后前台不再展示该分类,已发布的版本在重新发布后更新。',
          () => {
            D.chips[UI.chipTab || 'short'].splice(i, 1);
            UI.chipDirty = true;
            closeDrawer();
            render();
            toast('已删除');
          },
          '删除',
        );
        break;
      }
      case 'chippub':
        confirmBox(
          '发布分类配置',
          '将发布 Short 与 Stories 两套分类到线上,客户端在缓存到期后生效。',
          () => {
            UI.chipDirty = false;
            addLog('发布', '首页分类 Chips', 'v12 → v13');
            render();
            toast('已发布 v13');
          },
          '发布',
        );
        break;
      case 'actab':
        UI.acTab = a.dataset.t;
        render();
        break;
      case 'rolecell': {
        const r = a.dataset.r,
          g = a.dataset.g,
          p = ROLES[r].p,
          cur = p[g] || '',
          nx = cur === '' ? 'r' : cur === 'r' ? 'rw' : '';
        if (nx) p[g] = nx;
        else delete p[g];
        addLog(
          '编辑',
          '角色与权限 · ' + ROLES[r].n,
          NAV.find((x) => x.id === g).t +
            ' → ' +
            (nx === 'rw' ? '读写' : nx === 'r' ? '只读' : '无'),
        );
        render();
        break;
      }
      case 'epimp':
        pickFiles(true, (files) => {
          const row = CUR.row,
            a = eps(row.id),
            made = files.map((f) => {
              const e = { n: a.length + 1, video: '转码中', size: mb(f), dur: '—', status: '下架' };
              a.push(e);
              return e;
            });
          row.eps = a.length;
          refreshEp();
          toast('已导入 ' + made.length + ' 个视频,转码中');
          epDone(made, row.id);
        });
        break;
      case 'eprep': {
        const n = +a.dataset.n;
        pickFiles(false, (files) => {
          const row = CUR.row,
            e = eps(row.id).find((x) => x.n === n);
          e.video = '转码中';
          e.size = mb(files[0]);
          refreshEp();
          toast('EP.' + n + ' 视频已替换,转码中');
          epDone([e], row.id);
        });
        break;
      }
      case 'epadd': {
        const row = CUR.row,
          a = eps(row.id);
        a.push({ n: a.length + 1, video: '未上传', size: '—', dur: '—', status: '下架' });
        row.eps = a.length;
        refreshEp();
        break;
      }
      case 'epdel': {
        const n = +a.dataset.n,
          row = CUR.row;
        confirmBox(
          '删除第 ' + n + ' 集',
          '删除后,后续集号顺延前移;已解锁该集的用户记录保留。',
          () => {
            const arr = eps(row.id);
            arr.splice(n - 1, 1);
            arr.forEach((e, i) => (e.n = i + 1));
            row.eps = arr.length;
            refreshEp();
            toast('已删除');
          },
          '删除',
        );
        break;
      }
      case 'epsw': {
        const row = CUR.row,
          e = eps(row.id).find((x) => x.n === +a.dataset.k);
        e.status = e.status === '上架' ? '下架' : '上架';
        refreshEp();
        toast('EP.' + e.n + (e.status === '上架' ? ' 已上架' : ' 已下架'));
        break;
      }
      case 'epbatch':
        $('#modal').innerHTML =
          `<div class="box"><h3>按集号批量导入</h3><p>每行一条:集号,视频文件名。已存在的集号视为替换。</p><textarea class="in" id="bt" rows="6" placeholder="1,ep01.mp4&#10;2,ep02.mp4&#10;3,ep03.mp4"></textarea><div class="f" style="margin-top:14px"><button class="btn" data-act="mclose">取消</button><button class="btn pri" data-act="epbatchgo">导入</button></div></div>`;
        $('#modal').classList.add('on');
        break;
      case 'epbatchgo': {
        const row = CUR.row,
          arr = eps(row.id),
          made = [];
        $('#bt')
          .value.split('\n')
          .forEach((l) => {
            const m = l.trim().match(/^(\d+)\s*[,，]\s*(.+)$/);
            if (!m) return;
            const n = +m[1];
            let e = arr.find((x) => x.n === n);
            if (!e) {
              while (arr.length < n)
                arr.push({
                  n: arr.length + 1,
                  video: '未上传',
                  size: '—',
                  dur: '—',
                  status: '下架',
                });
              e = arr[n - 1];
            }
            e.video = '转码中';
            e.size = 40 + ((n * 3) % 30) + ' MB';
            made.push(e);
          });
        $('#modal').classList.remove('on');
        if (!made.length) {
          toast('没有识别到有效行');
          break;
        }
        row.eps = arr.length;
        refreshEp();
        toast('已导入 ' + made.length + ' 集,转码中');
        epDone(made, row.id);
        break;
      }
      case 'gengo': {
        const v = readForm(CUR.fields, $('#dform')),
          d = D.dramas.find((x) => x.title === v.drama),
          n = Math.max(1, Math.min(5, v.n || 3));
        runGen([genFor(d, n, v.style)], (c) => '已生成 ' + c + ' 个候选角色,进入备选库');
        break;
      }
      case 'genall': {
        const miss = D.dramas.filter(
          (d) =>
            d.status === '上架' &&
            !D.chars.some((c) => c.from === d.title) &&
            !D.cands.some((c) => c.drama === d.title),
        );
        runGen(
          miss.map((d) => genFor(d, 2, '')),
          (c) => '已为 ' + miss.length + ' 部短剧生成 ' + c + ' 个候选角色',
        );
        break;
      }
      case 'stf': {
        const st = UI['f_characters'] || (UI['f_characters'] = { q: '', f: {} });
        st.f.status = a.dataset.s;
        render();
        break;
      }
      case 'askgo': {
        const w = $('#reason').value.trim();
        if (!w) {
          toast('请填写原因');
          break;
        }
        $('#modal').classList.remove('on');
        if (ASK) ASK(w);
        break;
      }
      case 'flow': {
        const { c, row } = CUR,
          to = a.dataset.to,
          v = readForm(c.fields, $('#dform'));
        if (to === '驳回') {
          ASK = (w) => {
            Object.assign(row, v, { status: '驳回', reason: w });
            addLog('驳回', c.title + ' · ' + row.id, w);
            closeDrawer();
            render();
            toast('已驳回');
          };
          $('#modal').innerHTML =
            `<div class="box"><h3>驳回</h3><p>驳回原因将显示给提交人。</p><textarea class="in" id="reason" rows="3" placeholder="请填写"></textarea><div class="f" style="margin-top:14px"><button class="btn" data-act="mclose">取消</button><button class="btn pri" data-act="askgo">确认</button></div></div>`;
          $('#modal').classList.add('on');
          break;
        }
        const fn = () => {
          Object.assign(row, v, { status: to, reason: '' });
          addLog(
            to === '待审核' ? '重新提交' : to === '上架' ? '上架' : '下架',
            c.title + ' · ' + row.id,
            '',
          );
          closeDrawer();
          render();
          toast('已' + (to === '待审核' ? '重新提交审核' : to === '上架' ? '上架' : '下架'));
        };
        if (to === '下架')
          confirmBox(
            '下架',
            '下架后前台 Stories 与搜索不再展示该角色;已有聊天记录保留。',
            fn,
            '下架',
          );
        else fn();
        break;
      }
      case 'lgsave': {
        const r = CUR.legal,
          f = $('#lgfile').files[0],
          ver = $('#lgver').value.trim(),
          eff = $('#lgeff').value.trim();
        if (!f) {
          toast('请先选择协议文件');
          break;
        }
        if (f.size > 10 * 1024 * 1024) {
          toast('协议文件不能超过 10MB');
          break;
        }
        if (!/\.(pdf|html|md|txt|docx)$/i.test(f.name)) {
          toast('文件格式不支持');
          break;
        }
        if (!ver) {
          toast('请填写版本号');
          break;
        }
        if (r.vers.some((v) => v.ver === ver)) {
          toast('版本号 v' + ver + ' 已存在');
          break;
        }
        const m = a.dataset.m;
        r.again = $('#lgagain').checked;
        if (m === 'p')
          r.vers.forEach((v) => {
            if (v.status === '当前') v.status = '历史';
          });
        r.vers.unshift({
          ver,
          file: f.name,
          size: Math.max(1, Math.round(f.size / 1024)) + ' KB',
          lang: $('#lglang').value,
          eff: eff || '—',
          by: ROLES[UI.role].n,
          status: m === 'p' ? '当前' : '草稿',
        });
        addLog(m === 'p' ? '发布' : '上传', r.name + ' · v' + ver, f.name);
        openLegal(r.id);
        render();
        toast(
          m === 'p'
            ? '已发布 v' + ver + (r.again ? ',用户下次进入将重新确认' : '')
            : '已上传为草稿',
        );
        break;
      }
      case 'lgcur': {
        const r = CUR.legal,
          v = r.vers[+a.dataset.i];
        confirmBox(
          v.status === '草稿' ? '发布 v' + v.ver : '回退到 v' + v.ver,
          '将 v' +
            v.ver +
            ' 设为当前生效版本,原当前版本转为历史。' +
            (r.again ? '用户下次进入会重新确认。' : ''),
          () => {
            r.vers.forEach((x) => {
              if (x.status === '当前') x.status = '历史';
            });
            v.status = '当前';
            addLog('发布', r.name + ' · v' + v.ver, '设为当前');
            openLegal(r.id);
            render();
            toast('已设为当前版本');
          },
          '确认',
        );
        break;
      }
      case 'lgdel': {
        const r = CUR.legal,
          v = r.vers[+a.dataset.i];
        confirmBox(
          '删除 v' + v.ver,
          '删除后不可恢复。当前生效版本不能删除。',
          () => {
            r.vers.splice(+a.dataset.i, 1);
            addLog('删除', r.name + ' · v' + v.ver, '');
            openLegal(r.id);
            render();
            toast('已删除');
          },
          '删除',
        );
        break;
      }
      case 'mclose':
        $('#modal').classList.remove('on');
        break;
      case 'mok':
        $('#modal').classList.remove('on');
        if (confirmBox.ok) confirmBox.ok();
        break;
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.dataset.wt === 'sec') {
      const l = document.querySelector('[data-wtlab="' + e.target.dataset.i + '"]');
      if (l) l.textContent = fmtSec(e.target.value);
    }
    if (e.target.dataset.wt === 'reward') {
      const t = [...document.querySelectorAll('[data-wt=reward]')].reduce(
        (n, i) => n + (+i.value || 0),
        0,
      );
      const el = $('#wttot');
      if (el) el.textContent = t;
    }
    if (e.target.id === 'q') {
      const pid = location.hash.slice(1) || 'overview';
      const c = CRBY[pid];
      if (!c) return;
      const s = UI['f_' + c.id];
      s.q = e.target.value;
      s.page = 1;
      const pos = e.target.selectionStart;
      render();
      const q = $('#q');
      q.focus();
      q.setSelectionRange(pos, pos);
    }
    if (e.target.id === 'gsin') {
      const v = e.target.value.trim().toLowerCase(),
        res = $('#gsres');
      if (!v) {
        res.classList.remove('on');
        return;
      }
      const hits = NAV.flatMap((g) => g.p.filter((x) => can(x[0])).map((x) => [x[0], x[1], g.t]))
        .filter((x) => (x[1] + x[2]).toLowerCase().includes(v))
        .slice(0, 6);
      res.innerHTML =
        hits
          .map(
            (h) =>
              `<button data-act="nav" data-p="${h[0]}">${h[1]} <span class="mono">${h[2]}</span></button>`,
          )
          .join('') || '<div class="empty" style="padding:12px">没有匹配的功能</div>';
      res.classList.add('on');
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'lgfile') {
      const f = e.target.files[0];
      $('#lgname').textContent = f
        ? f.name + ' · ' + Math.max(1, Math.round(f.size / 1024)) + ' KB'
        : '支持 PDF / HTML / Markdown / Word,≤ 10MB';
    }
    if (e.target.name === 'role' && CUR && CUR.c && CUR.c.id === 'accounts') {
      const el = document.querySelector('.dtab[data-i="1"]');
      if (el) el.innerHTML = permTable(e.target.value);
    }
    if (e.target.dataset.act === 'flt') {
      const pid = location.hash.slice(1) || 'overview',
        c = CRBY[pid];
      UI['f_' + c.id].f[e.target.dataset.k] = e.target.value;
      UI['f_' + c.id].page = 1;
      render();
    }
  });
  /* drag sort for chips */
  document.addEventListener('dragstart', (e) => {
    const li = e.target.closest('.li');
    if (li) {
      UI.drag = +li.dataset.i;
      li.classList.add('drag');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'x');
    }
  });
  document.addEventListener('dragover', (e) => {
    const li = e.target.closest('.li');
    if (li && UI.drag != null && +li.dataset.i > 0) {
      e.preventDefault();
      document.querySelectorAll('.li.over').forEach((x) => x.classList.remove('over'));
      li.classList.add('over');
    }
  });
  document.addEventListener('drop', (e) => {
    const li = e.target.closest('.li');
    if (li && UI.drag != null) {
      e.preventDefault();
      const to = +li.dataset.i,
        L = D.chips[UI.chipTab || 'short'];
      if (to > 0 && to !== UI.drag) {
        const [m] = L.splice(UI.drag, 1);
        L.splice(to, 0, m);
        UI.chipDirty = true;
      }
      UI.drag = null;
      render();
    }
  });
  document.addEventListener('dragend', () => {
    UI.drag = null;
    document.querySelectorAll('.li').forEach((x) => x.classList.remove('drag', 'over'));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($('#modal').classList.contains('on')) $('#modal').classList.remove('on');
      else closeDrawer();
    }
  });

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved?.data) {
      Object.keys(D).forEach((key) => {
        if (key in saved.data) D[key] = saved.data[key];
      });
      ID = saved.nextId || ID;
      UI.chipDirty = saved.chipDirty || false;
    }
  } catch {
    /* Ignore malformed or unavailable local data. */
  }
  root.addEventListener('click', () => queueMicrotask(persist));
  root.addEventListener('change', () => queueMicrotask(persist));
  render();
  return {
    destroy() {
      timers.forEach((timer) => globalThis.clearTimeout(timer));
      timers.clear();
    },
    update(page) {
      options.page = page;
      closeDrawer();
      $('#modal').classList.remove('on');
      render();
    },
    reset() {
      localStorage.removeItem(storageKey);
      options.reset();
    },
  };
}
