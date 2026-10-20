# 运营位、用户管理：后端对接协议

> 最新权威定义：`D:\tv_api\apifox-admin-api.yaml`，后端项目 `D:\tv_api`，容器 `tv_api`，服务 `http://localhost:8000/admin/v1`。旧 `D:\tv_pro\app` 不是本批实现来源。金币不支持草稿；本文件与 YAML 不一致时以最新 YAML 为准。生产开关保持关闭。

## 原型 1:1 验收要求

验收基准为 `D:\tv_pro\Flickme_Admin.html`，范围为 chips、hot、launch、words、filters、recs、userlist、coinadj 八个页面。必须核对布局、文案、字段、按钮、列表、抽屉、预览、筛选及操作反馈；仅接口连通或页面可打开不代表通过 1:1 验收。同一视口、主题、数据及浏览器缩放下比较截图，逐页记录差异，未核对项不标记完成。

正式实现使用 Vue 组件与真实 API；原型示例数据只能用于测试，不能作为正式接口缺失时的兜底成功。接口未启用、加载、空数据、错误及只读状态是正式环境必须保留的状态。

以下业务安全差异须单独确认，不按演示行为直接复制：用户状态变更必须填写原因；金币历史记录只读，不提供草稿编辑；禁止本人审批，审批前确认金额，驳回必填原因；分页依据真实总数，不生成虚构页码。当前共享导航还按真实权限展示，与原型模拟角色菜单并不完全一致。

### 1:1 界面所需的补充字段（以下定义优先于旧示例）

- 配置文档增加 `published`（与 draft 同类型的线上快照），供“还原”恢复线上版本；无线上版本时可省略。
- launch、recs 配置文档增加 `options: { dramas: [{ id: 1, title: "剧集名称", cover_url: null }] }`。下拉框展示真实剧名、提交 ID；选项必须包含当前选中剧集，不使用手工 ID 输入代替原型选择框。
- words 每行增加 `sort`（0–100000 整数）、`status`（`draft` / `published`），按 sort 排序。服务端发布时应维护对应状态，不信任前端状态作为权限依据。
- filters 每行增加 `order`（0–100000 整数）；新增分组 key 为稳定 UUID，标签输入仍提交真实 tag_keys。按 order 排序。
- recs 每行增加 `description`，用于列表说明及抽屉“出现在哪里”，与 name/placement 一样由服务端定义并只读。
- 金币列表按 `uid` 查询，状态仅 `pending` / `approved` / `rejected`。POST 仅提交 `{uid,currency,amount,reason}`，成功返回 201 和 pending，不得直接改余额。
- 金币不支持草稿：不提供 PATCH 更新，不发送 submit 字段，页面仅保留“提交审批”。
- 配置页面单个“发布”按钮内部先 PUT 保存变更，再 POST 发布；任何一步失败均显示错误，不提示发布成功。

当前后端已提供基础接口，但返回尚不含 published 快照及剧集 options；words 不接受 sort/status，filters 不接受 order，recs 不接受 description。这些是仍需对齐的差异，不应据此开启生产开关。前端浏览器拦截测试不等同于真实后端验收。

这份文档记录前端所需约定；实际端点以最新 YAML 为准，新增字段需求不等于后端已支持。

已只读检查 `D:\tv_api` 最新 YAML 和控制器。本轮没有修改后端、数据库或真实余额。前端使用独立 Vue 页面、TypeScript 类型、组合式函数及统一 API 客户端；不使用原型渲染器、业务示例数据或本地模拟成功。

## 启用方式与权限

后端完整实现对应模块并联调通过后，在前端 `.env.local` 配置并重启 Vite：

```dotenv
VITE_API_BASE_URL=/admin/v1
VITE_OPS_API_ENABLED=true
VITE_USERS_API_ENABLED=true
VITE_COIN_API_ENABLED=true
```

默认均为 `false`，分别控制 6 个运营配置页、用户列表、金币审批；关闭时不发对应业务请求，写操作禁用。Vite 开关在构建时注入，生产部署修改后必须重新构建。开关只是发布控制，不是安全授权；鉴权、写权限、审计及审批必须在后端实现。

- 沿用 `Authorization: Bearer <token>`，API 基础路径 `/admin/v1`。
- `/auth/me` 返回 `permissions.ops`、`permissions.users`，值为 `r` / `rw`；以及数值型管理员 `id`。
- 所有运营读接口要求 `ops:r`，保存/发布要求 `ops:rw`。
- 用户读接口要求 `users:r`，状态变更和金币申请要求 `users:rw`。
- 金币审核还需后端的独立审核授权，不能仅依赖通用用户读写权限。
- 当前没有标签/剧集选项查询接口，前端允许输入稳定 tagKey 或剧集 ID；后端负责验证引用存在、有效且可用于相应位置。可后续提供搜索选择接口改善录入体验。

## 通用返回格式

成功统一使用 `{ "data": ... }`。列表沿用现有账号 API 的双层分页结构：

```json
{
  "data": {
    "data": [],
    "current_page": 1,
    "per_page": 10,
    "last_page": 1,
    "total": 0
  }
}
```

错误沿用现有协议：`{ "message": "原因", "errors": { "field": ["具体错误"] } }`。

- `401`：登录过期；`403`：权限不足；`404`：资源不存在。
- `409`：配置版本/用户状态/审批状态冲突，或幂等键与请求内容冲突；必须返回可理解的错误原因。
- `422`：字段、时间、引用、额度、余额等校验失败。
- `429`：限流；`5xx`：服务异常。失败不得返回 HTTP 200 + 成功形状。
- 日期采用 ISO 8601 UTC，例如 `2026-10-20T04:00:00Z`；前端日期输入按浏览器本地时间显示再转 UTC。
- UID、业务记录 ID 均为字符串，避免丢失前导零/大整数精度。金币及版本号为 JSON 安全整数。
- `Idempotency-Key` 由前端发送，服务端应按操作、管理员、键和请求体校验；同键同请求重复提交返回原结果，同键不同请求体返回 409。网络失败重试不能重复发布、创建申请或入账。保留时限请在联调时确认，建议覆盖至少 24 小时。
- 如跨域部署，允许指定前端域名、GET/PUT/POST/PATCH 及 Authorization、Content-Type、Idempotency-Key 请求头；本地通过 Vite 代理时通常无需跨域。

## 一、运营配置：6 个资源共用版本化草稿流程

| 模块             | 正式页面     | 资源名    |
| ---------------- | ------------ | --------- |
| 首页分类         | `/#/chips`   | `chips`   |
| 热门池与排序     | `/#/hot`     | `hot`     |
| 启动弹窗         | `/#/launch`  | `launch`  |
| 搜索推荐词       | `/#/words`   | `words`   |
| Stories 筛选标签 | `/#/filters` | `filters` |
| 推荐位配置       | `/#/recs`    | `recs`    |

每个资源提供：

| 方法 | 路径                      | 行为                                         |
| ---- | ------------------------- | -------------------------------------------- |
| GET  | `/ops/{resource}`         | 读取草稿及发布版本                           |
| PUT  | `/ops/{resource}`         | 带旧版本保存完整草稿，不改变线上配置         |
| POST | `/ops/{resource}/publish` | 原子发布当前已保存版本，支持 Idempotency-Key |

**chips 的以上 3 个接口都带 `?channel=short` 或 `?channel=stories`，两套配置独立保存和发布。** 其他资源不带 channel。

GET、PUT、POST 成功均返回完整配置文档：

```json
{
  "data": {
    "revision": 2,
    "published_revision": 1,
    "published_at": "2026-10-20T04:00:00Z",
    "draft": []
  }
}
```

`draft` 的形状由资源决定（下文定义）。未发布时 `published_revision`、`published_at` 可为 null。PUT 请求：`{ "revision": 2, "draft": ... }`，保存成功递增 revision。发布请求：`{ "revision": 3 }`，成功后 `published_revision === revision`。

后端必须比较版本并原子更新，旧版本不能覆盖新配置。同一资源同一版本重复发布应返回已发布结果，不得重复触发通知或任务。发布应记录发布人、版本、时间、前后内容；客户端只读取已发布快照，不能读取编辑中的草稿。缓存刷新、生效时点由后端/客户端定义并在联调时说明。

所有多语言字段类型为：

```json
{ "en": "English", "zh-Hans": "简体中文", "zh-Hant": "", "es": "", "pt": "", "id": "", "th": "" }
```

7 个键均应返回字符串，英文必填、每语言最多 200 字；其他语言可空，客户端回退英文。数组顺序就是展示顺序；新行使用前端生成的 UUID，后端保存并返回稳定 ID，不应因保存改变已有 ID。

### 1. 首页分类 `draft: HomeCategory[]`

```json
[
  {
    "id": "stable-category-id",
    "key": "for_you",
    "type": "system",
    "names": {
      "en": "For you",
      "zh-Hans": "推荐",
      "zh-Hant": "",
      "es": "",
      "pt": "",
      "id": "",
      "th": ""
    },
    "enabled": true,
    "locked": true,
    "starts_at": null,
    "ends_at": null
  }
]
```

- 每个 channel 初始化一个固定系统分类：仅第一个 locked=true，保持首位且启用，不能删除、修改或设置时段绕过固定规则。
- `type`: `system` / `tag`；稳定 `key` 不重复。tag 分类的 key 对应真实标签库；system key 必须是客户端支持的白名单。
- 后端也必须拒绝锁定分类变更，不能信任前端传入的 locked。
- `starts_at` / `ends_at` 可空，起止同时存在时结束必须晚于开始。定时展示不能靠浏览器执行。

### 2. 热门池 `draft: HotPoolConfig`

```json
{
  "pool_size": 50,
  "refresh_hours": 1,
  "short_count": 9,
  "stories_count": 8,
  "page_size": 20,
  "overrides": [
    { "drama_id": 1, "title": "真实剧名", "heat": 98, "pinned": false, "blocked": false }
  ]
}
```

- `pool_size`: 1–1000；展示数量与 page_size：1–100 的整数；refresh_hours：1/6/24。
- overrides 由 GET 返回真实可操作剧集及热度；title/heat 是只读展示数据，后端不得信任客户端提交值。
- 同一剧集不能同时 pinned、blocked；置顶剧按数组顺序排列，其他剧由服务端热度算法排序。屏蔽规则在实际热门池查询中执行。

### 3. 启动弹窗 `draft: LaunchConfig`

```json
{
  "enabled": false,
  "fallback_drama_id": null,
  "cover_url": "",
  "button_text": {
    "en": "Start Watching",
    "zh-Hans": "开始观看",
    "zh-Hant": "",
    "es": "",
    "pt": "",
    "id": "",
    "th": ""
  }
}
```

启用时必须引用有效、可播放的兜底剧集。cover_url 可空，空时使用剧封面；非空应为受信任媒体存储的 HTTPS 地址，后端不得任意抓取用户提供的 URL。真实图片上传不在本批接口范围内，需要单独媒体服务。冷启动去重、弹窗优先级由客户端与后端共同执行。

### 4. 搜索推荐词 `draft: SearchWord[]`

每行 `{id, names, enabled, starts_at, ends_at}`，names 为完整多语言对象，时段规则同分类。数组顺序控制轮换顺序；空数组表示发布后停用全部推荐词。

### 5. Stories 筛选标签 `draft: StoryFilter[]`

每行 `{id, key, names, tag_keys: ["romance", "ceo"], enabled}`。分组 key 唯一，tag_keys 非空且无重复、均引用真实标签；数组顺序控制组顺序。组内任一匹配，组间建议取交集，需与客户端确认一致。

### 6. 推荐位 `draft: Recommendation[]`

```json
[
  {
    "id": "player-exit",
    "name": "播放器返回推荐层",
    "placement": "player_exit",
    "source": "personalized",
    "count": 8,
    "fallback": "trending",
    "pinned_drama_id": null,
    "enabled": true
  }
]
```

后端需初始化真实位置列表，例如播放器返回、相关剧、追剧页热榜、剧集相似推荐、首页续播。id/name/placement 由后端定义，前端不新增或删除位置。

- source: `personalized` / `trending` / `similar` / `recent`。
- fallback: `trending` / `none`；count: 1–50。
- pinned_drama_id 可空，否则必须引用有效剧集。
- 后端校验每个位置支持的数据来源、数量上限，不能仅依据通用枚举放行无效组合。

## 二、用户列表、详情与状态

| 方法  | 路径                 | 参数/行为                                                                                         |
| ----- | -------------------- | ------------------------------------------------------------------------------------------------- |
| GET   | `/users`             | `q`=UID 查询，`status=active/banned`，`membership=none/weekly/monthly/yearly`，`page`，`per_page` |
| GET   | `/users/{id}`        | 读取完整用户详情                                                                                  |
| PATCH | `/users/{id}/status` | `{status, reason, version}`，返回更新后的完整用户                                                 |

用户对象（列表行及详情）：

```json
{
  "id": "u1",
  "uid": "000123",
  "login_provider": "Apple",
  "member_coins": 100,
  "bonus": 20,
  "membership": "weekly",
  "unlocked_episodes": 3,
  "status": "active",
  "registered_at": "2026-10-20T04:00:00Z",
  "ban_reason": null,
  "version": 1
}
```

状态变更必须要求 1–500 字原因、版本比较、操作日志；封禁后的登录/消耗限制、会话失效由后端执行。解除封禁同样记录原因。只读权限不能调用 PATCH。普通用户详情应按最小必要原则返回，不额外暴露密码、令牌、支付凭据等。

## 三、金币调整申请与二人审批

| 方法 | 路径                            | 参数/行为                                                               |
| ---- | ------------------------------- | ----------------------------------------------------------------------- |
| GET  | `/coin-adjustments`             | `uid`，`status=pending/approved/rejected`，`page`，`per_page`；分页返回 |
| POST | `/coin-adjustments`             | 创建申请；必须带 Idempotency-Key                                        |
| POST | `/coin-adjustments/{id}/review` | 审核申请；必须带 Idempotency-Key                                        |

创建请求：

```json
{ "uid": "000123", "currency": "bonus", "amount": -10, "reason": "余额纠错" }
```

currency：`member_coins` / `bonus`；amount：非零安全整数，正增负减；原因 1–500 字。限额、币种合法性、用户存在性、可调整状态由后端校验。**创建只产生 pending 申请，不立即改变余额。** 发起人必须从当前认证身份取值，禁止由请求体指定。

创建/审核成功和列表中的申请对象：

```json
{
  "id": "adjustment-1",
  "uid": "000123",
  "currency": "bonus",
  "amount": -10,
  "reason": "余额纠错",
  "status": "pending",
  "requester_id": 7,
  "requester_name": "Operator",
  "reviewer_name": null,
  "review_reason": null,
  "created_at": "2026-10-20T04:00:00Z",
  "version": 1,
  "can_review": true
}
```

`can_review` 由后端按当前管理员、审批授权及申请状态计算，仅为 UI 提示。前端同时隐藏自己发起申请的审核按钮；后端必须再次禁止自己审批自己。

审核请求：`{"decision":"approve","reason":"","version":1}` 或 `{"decision":"reject","reason":"驳回原因","version":1}`。驳回原因必填。

后端必须完成以下事务约束：

1. 检查审核人的独立审核权限、非本人、申请仍为 pending、version 未过期。
2. 批准时锁定申请和目标余额，校验余额不为负、限额等规则；余额更新、不可重复的账本流水、审批状态和审计记录在同一事务中提交。
3. 驳回不改变余额；批准/驳回后禁止再次审核，过期版本返回 409。
4. 并发审核、请求重试和任务重复执行都不能重复入账；需要数据库唯一约束/幂等存储，不能只靠前端按钮禁用。
5. 明确金额上下限和 Bonus 有效期/扣减规则，并通过接口校验错误返回；前端不自行推算或覆盖真实余额。

前端网络失败后会锁定已提交申请的输入，使用原幂等键和原请求体重试；明确的 4xx 校验拒绝可修改后重新提交。关闭失败申请不会撤销可能已抵达服务器的请求，页面会提示先查询核对。

## 联调验收

- 实现上述协议后，先启用测试环境开关，验证请求/返回字段和权限，再在正式环境开启。
- 默认关闭状态不查询虚构端点、不加载示例数据、不执行本地发布或改余额。
- `scripts/check-operations-users.mjs` 使用本地拦截响应验证 8 页、草稿保存/发布、409 冲突、语言、顺序、用户状态、禁止本人审核及网络重试幂等；不代表真实后端已验收。
- 本地浏览器测试服务可设置上述三个开关启动在 5182 端口；脚本可通过 `UI_BASE_URL` 指定地址。截图和浏览器工具位于 Git 忽略的 `.tools/`。
- 正式后端仍需补充接口 Feature Tests、权限测试、并发审批/幂等/账本事务测试、实际发布缓存及客户端生效测试。
