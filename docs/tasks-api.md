# 激励任务前端对接（当前后端协议）

三个页面已使用真实接口，无模拟数据回退。只实现后台配置，不实现客户端领取、播放上报或奖励入账。接口定义以 `D:\tv_api\apifox-admin-api.yaml` 及后端对接文档为准。

基础路径使用 `VITE_API_BASE_URL`，本地为 `/admin`，不含 `/v1`；通过现有认证、代理和 `requestApi` 请求并解包 `data`。

| 资源     | 读取                    | 写入                                                                 | 发布                             |
| -------- | ----------------------- | -------------------------------------------------------------------- | -------------------------------- |
| 签到     | GET `/check-in-rewards` | PUT 同路径 `{revision,draft}`，固定完整七天                          | POST `/check-in-rewards/publish` |
| 任务     | GET `/tasks`            | POST `/tasks` 新增；PATCH `/tasks/{id}` 修改/启停；DELETE 同路径删除 | POST `/tasks/publish`            |
| 实时观看 | GET `/watch-rewards`    | PUT 同路径 `{revision,draft}`，保存立即生效                          | 无独立发布                       |

发布 body 仅 `{revision}`，通过 `Idempotency-Key` 头传唯一标识；同一次失败重试保留 key、URL、body，成功后 GET 获取最新状态，避免缓存历史响应导致版本回退。普通写请求失败且结果不确定时，禁用后续写入，要求重新读取核实，不自动重发。

## 数据结构与验证

响应为 `{code:200,message,data:{revision,published_revision,published_at,draft,published}}`，发布时间是 Unix 秒，未发布字段为 null。三个资源版本独立；每次写入使用响应中的最新 revision，409 不覆盖本地编辑。

- 签到：七条 `{id:'CK1',day:'Day 1',reward:10}`，至 CK7/Day 7。顺序、id、day 固定，只允许编辑 reward（0～1,000,000 整数）。保存完整列表，发布独立执行。
- 任务：`{id,group,name,sec?,reward,reset,en}`。group 为新手任务/观看任务/日常任务；reset 为一次性/每日；reward 为 0～1,000,000 整数；观看任务 sec 为 1～86,400 整数，名称由服务端生成；其他任务名称必填且不超过 200 字。id 是不透明字符串，新增不传 id。
- 新增/编辑 body 为 `{revision,task:{...业务字段}}`，task 不包含 id，观看任务不传 name，非观看任务不传 sec。启停使用 PATCH `{revision,task:{en:boolean}}`；删除 body `{revision}`。写入返回完整文档，本地重新应用搜索/分组，绝不把筛选列表整体覆盖上传。全量 GET 无服务端分页，页面每页展示 8 条。
- 实时观看：`{sec,coins,cap}`，sec 为 1～86,400，coins 为 1～1,000,000，cap 为不小于 coins 且不大于 1,000,000 的整数。保存即更新线上快照。

## 权限与错误

`tasks.view` 控制读取（无权限不发加载请求），`tasks.edit` 控制编辑，`tasks.publish` 单独控制签到和任务发布。复用 `auth.can` 的超级管理员和 `tasks.*` 支持。

401 沿用登录失效流程；403 显示权限错误；404 提示任务不存在并要求重新加载；409 禁止继续写入直到重新读取；422 展示 `data.errors`，兼容 `draft.0.reward`、`task.name`、`name` 等键；500/超时不自动重发普通写入。重新读取前确认丢弃本地编辑。

`VITE_TASKS_API_ENABLED=true`（默认开启），false 时禁用且不回退到示例数据。不得写入 `operation_configs`。

## 验证命令

`npm test -- src/api/client.test.ts src/types/tasks.test.ts`

`node scripts/check-task-pages.cjs`：在现有开发服务器上拦截 API，验证真实协议形状、编辑/发布权限、发布幂等重试、任务行级写入和筛选、保存生效、校验和冲突。不会写后端奖励配置。

`npm run build:check`：全仓库类型检查与构建；若被其他模块已有错误阻断，应明确记录，不能当作通过。
