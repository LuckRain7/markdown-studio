# 保存历史功能 — 设计文档

日期：2026-06-09
状态：已与用户确认，待写实现计划

## 目标

为 Markdown Studio 增加「保存历史」能力：右上角新增设置按钮，点开后可手动保存当前正文为历史快照、查看/恢复/删除历史，并支持历史的导入导出。数据存储在浏览器 IndexedDB。

## 已确认的决策

- **保存方式**：手动保存为主。用户在设置面板点「保存当前为历史」生成一条快照。无自动定时备份。
- **快照内容**：完整正文 + 时间戳 + 自动摘要（取正文首个非空行前约 40 字），无需用户额外输入。
- **导入导出**：导出全部历史为单个 JSON 文件；导入时把文件中的快照**合并**进现有历史，按 `savedAt + content` 去重。
- **条数上限**：最多保留 100 条，超出时自动删除最旧的。
- **面板形态**：居中弹窗（modal）。

## 架构

沿用现有单向数据流：状态与编排集中在 `App.vue`，子组件只展示和 emit 事件。新增模块：

```
src/composables/useHistoryDB.js   — 纯 IndexedDB 读写封装（无 Vue 依赖，try/catch 降级）
src/composables/useHistory.js     — 响应式历史列表 + 业务方法（load/save/restore/remove/import/export/clear）
src/components/SettingsModal.vue    — 居中弹窗：保存按钮 + 历史列表 + 导入/导出
src/components/Toolbar.vue         — 右上角新增 ⚙ 设置按钮，emit('open-settings')
src/App.vue                        — 串联各部分，处理恢复时的内容覆盖确认
```

**为何不复用 `usePersistentRef`**：它是 localStorage 单值防抖封装；历史是多条结构化记录、需要 IndexedDB。因此单独建模块，但沿用其容错风格（try/catch + `console.warn` 降级，DB 不可用时功能静默禁用而非崩溃）。

### 模块职责与接口

**`useHistoryDB.js`** — 隔离所有 IndexedDB 细节，对外暴露 Promise 化的 CRUD：
- `openDB()` → Promise<IDBDatabase | null>（失败返回 null）
- `getAll()` → Promise<Array<记录>>（按 savedAt 倒序）
- `add(record)` → Promise<id>
- `remove(id)` → Promise<void>
- `bulkAdd(records)` → Promise<void>（导入用）
- `clearOldest(keep)` → Promise<void>（保留最新 keep 条）
依赖：浏览器 `indexedDB`。可独立测试（mock indexedDB）。

**`useHistory.js`** — 把 DB 封装成响应式状态供 UI 用：
- 暴露 `items`（ref 数组）、`isSupported`（ref 布尔，DB 是否可用）
- 方法：`save(content)`、`restore(id)` → 返回该条 content、`remove(id)`、`exportAll()` → 返回 JSON 字符串、`importJson(text)` → 返回 `{ added, skipped }`
- 内部维护 100 条上限：每次 `save`/`importJson` 后调用 `clearOldest(100)` 并刷新 `items`。
依赖：`useHistoryDB.js`。

**`SettingsModal.vue`** — 纯展示组件，props 进、emit 出：
- props：`open`、`items`、`isSupported`
- emit：`close`、`save`、`restore(id)`、`remove(id)`、`export`、`import(file)`
不直接碰 DB，所有数据经 App.vue 中转。

## 数据模型（IndexedDB）

- 库名：`markdown-studio`，版本 1
- 对象仓库：`history`，主键 `id`（`autoIncrement: true`）
- 记录结构：`{ id, content, summary, savedAt }`
  - `content`：完整正文字符串
  - `summary`：正文首个非空行前约 40 字（超出加省略号；空文档为「（空白文档）」）
  - `savedAt`：保存时刻的毫秒时间戳
- 索引：`savedAt`，列表按其倒序展示

## 导入导出格式

导出文件结构：

```json
{
  "version": 1,
  "exportedAt": 1749456000000,
  "items": [
    { "content": "...", "summary": "...", "savedAt": 1749455000000 }
  ]
}
```

- 导出：序列化全部记录（去掉自增 `id`）下载为 `markdown-history-<时间>.json`，复用 App.vue 已有的 `download()` 工具。
- 导入：`JSON.parse` 后校验 `version` 与 `items` 数组；逐条按 `savedAt + content` 与现有记录去重，仅写入新条目；写入后裁剪到 100 条上限。提示「导入 N 条，跳过 M 条重复」。

## UI 与交互

- Toolbar 右上角主题切换按钮旁新增 ⚙ 图标按钮，点击 `emit('open-settings')`。
- 弹窗居中，半透明遮罩；点遮罩或按 Esc 关闭（复用 App.vue 现有 keydown 监听模式）。
- 弹窗布局：
  - 顶部标题栏 + 关闭按钮
  - 主操作区：「保存当前为历史」主按钮
  - 历史列表：每条显示 `保存时间 · 摘要 · N 字`，行内含「恢复」「删除」两个操作；空列表显示占位提示
  - 底部：「导出全部（.json）」+「导入（.json）」两个按钮（导入用隐藏 file input，参照现有 `openFile` 实现）
- 反馈统一走 App.vue 现有 `showToast()`。

## 关键行为

- **恢复**：若当前编辑器内容与待恢复内容不同，先 `confirm('恢复会覆盖当前编辑内容，确定吗？')`，确认后写入 `content`，关闭弹窗并 toast。
- **删除**：直接删除单条（无二次确认，符合轻量操作）。
- **导入合并去重**：见上。文件格式非法 → toast 报错，不写入。
- **100 条上限**：保存与导入后自动裁剪最旧记录。

## 容错（沿用项目约定）

- IndexedDB 打不开 / 被隐私模式禁用 → `isSupported = false`，弹窗内提示「当前环境不支持历史存储」，相关按钮禁用，不影响编辑器主功能。
- 导入文件解析失败或格式不符 → toast 报错，不写入，不崩溃。
- 任何 DB 操作失败 → `console.warn` 并降级（toast 提示操作失败），保持应用可用。

## 测试

仓库无测试框架。验证以手动为主：
- 保存 → 列表出现新条目（时间/摘要/字数正确）
- 恢复 → 编辑器内容被替换，确认弹窗生效
- 删除 → 条目消失
- 导出 → 下载 JSON，结构正确
- 导入 → 合并去重计数正确；非法文件报错不崩溃
- 隐私模式 / IndexedDB 禁用 → 面板降级提示，编辑器正常
- 连续保存超过 100 条 → 最旧的被裁剪
