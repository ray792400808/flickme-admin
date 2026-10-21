# 激励任务：原型与接口对接提案

原型来源：`src/features/workspace/runtime.js` 中 `CR.checkin`、`CR.taskcfg`、`FP.watch`。独立 Vue 页面位于 `src/views/tasks/`。后端应阅读上述原型定义及本文；原型中的示例数值不是生产默认值。

## 原型规则

- 签到：7 天一轮，断签从 Day 1 重置；奖励进入 Bonus。
- 任务：新手、观看、日常三类；一次性或每日重置；观看任务按当日累计有效播放秒数判断，名称由秒数生成。
- 实时观看：有效播放时长由服务端可信上报流程累计，暂停、退出、切后台不计；到达间隔自动发 Bonus，不需领取。Bonus 有效期 12 个月。
- 观看任务与实时奖励共用有效播放时长，分别计算奖励和上限。

上述为原型描述，后端实现前需要确认每日重置时区、签到日期边界、配置变更对进行中任务的影响、任务完成事件的可信来源、Bonus 过期和每日上限截断规则。任务名称不能用作奖励触发条件，后端需定义稳定的事件类型/标识并与前端补充字段对齐。

## 配置接口（待后端确认，当前默认关闭）

基础路径沿用 `VITE_API_BASE_URL`，本地为 `/admin`。模块名为 `checkin`、`taskcfg`、`watch`。

| 方法 | 路径                      | 用途                                                    |
| ---- | ------------------------- | ------------------------------------------------------- |
| GET  | `/tasks/{module}`         | 读取草稿与已发布快照                                    |
| PUT  | `/tasks/{module}`         | 保存整份草稿，body 为 `{ revision, draft }`             |
| POST | `/tasks/{module}/publish` | 发布已保存版本，body 为 `{ revision, idempotency_key }` |

成功响应统一 `{ data: { revision, published_revision, published_at, draft, published } }`。`published_revision`、`published_at` 可为 null，`published` 未发布时可省略。revision 为非负整数。后端必须检查权限、原子比较 revision；版本过期返回 409，校验失败 422，未登录 401，无权限 403。

保存草稿必须递增 revision，且不能改变 published；发布需原子更新已发布快照。相同幂等键与相同内容重试不能重复发布，不同内容复用同一键需拒绝。记录操作者、发布时间及修改前后内容。前端发布采用 body 中的 idempotency_key（并非请求头），接口确认时双方保持一致。

## draft 数据

签到：`Array<{ id: string, day: number, reward: number }>`，必须恰好包含 Day 1～7，不允许重复；reward 为非负安全整数。

任务：`Array<{ id: string, group: '新手任务'|'观看任务'|'日常任务', name: string, sec?: number, reward: number, reset: '一次性'|'每日', en: boolean }>`。观看任务 sec 为正整数，其他任务省略 sec；reward 为非负整数。id 必须稳定且唯一，新增时前端生成 UUID，后端不得悄悄丢失标识。后端需进一步定义任务事件字段与币量上限。

实时奖励：`{ sec: number, coins: number, cap: number }`，sec 为正整数秒，coins 与 cap 为非负整数。0 上限是否表示停止发放需确认，不能默认解释为无限。

## 权限与启用

前端编辑检查 `tasks.edit`，发布检查 `tasks.publish`，沿用当前 auth.can 对 `tasks.*` 及超级管理员的支持。菜单访问权限由后端菜单配置控制，后端接口必须再次校验权限。

`VITE_TASKS_API_ENABLED=false`：开发模式显示明确标注的原型示例，可在当前页面编辑预览；不持久化、不发保存/发布请求。生产模式不显示示例配置，写操作禁用。接口实现并确认协议后再设为 true，未接通时不能以模拟响应作为联调完成依据。

配置后台不负责实际发币。后端另需签到记录、有效播放时长、任务完成记录、Bonus 流水、幂等入账与并发上限控制；客户端只能读取发布快照，不能读取草稿。

验收：草稿保存后刷新一致、发布前线上不变、发布后读取新快照、409 冲突、422 校验、403 权限、超时重试，以及重复签到/并发观看上报不重复入账。
