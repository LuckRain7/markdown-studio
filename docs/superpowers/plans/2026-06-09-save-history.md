# 保存历史功能 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Markdown Studio 增加手动保存历史快照、查看/恢复/删除、以及历史导入导出的能力，数据存于 IndexedDB。

**Architecture:** 沿用现有单向数据流——状态与编排集中在 `App.vue`，新增 `useHistoryDB.js`（纯 IndexedDB 封装）+ `useHistory.js`（响应式历史状态与业务方法）+ `SettingsModal.vue`（居中弹窗，纯展示组件），Toolbar 右上角加设置按钮。

**Tech Stack:** Vue 3 `<script setup>`、Vite 6、浏览器原生 IndexedDB（无新增依赖）。

**项目现实约束：**
- 仓库**无测试框架**，每个任务用「在浏览器手动验证」步骤代替自动化测试。
- **非 git 仓库**，省略 commit 步骤；每个任务末尾以手动验收作为检查点。验证统一在 `npm run dev`（http://localhost:5173）下进行。

---

## 文件结构

- 创建：`src/composables/useHistoryDB.js` — 纯 IndexedDB CRUD 封装，无 Vue 依赖，全部 try/catch 降级。
- 创建：`src/composables/useHistory.js` — 把 DB 封装成响应式状态（`items`、`isSupported`）与业务方法。
- 创建：`src/components/SettingsModal.vue` — 居中弹窗，纯 props/emit 展示组件。
- 修改：`src/components/Toolbar.vue` — 右上角新增 ⚙ 设置按钮，emit `open-settings`。
- 修改：`src/App.vue` — 串联历史状态、弹窗，处理恢复时的覆盖确认。

---

## Task 1: IndexedDB 封装（useHistoryDB.js）

**Files:**
- Create: `src/composables/useHistoryDB.js`

- [ ] **Step 1: 写封装模块**

创建 `src/composables/useHistoryDB.js`，内容如下：

```js
// 纯 IndexedDB 读写封装，无 Vue 依赖。所有操作失败时降级（返回 null/空数组），不抛错。
const DB_NAME = 'markdown-studio'
const DB_VERSION = 1
const STORE = 'history'

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    try {
      if (!('indexedDB' in window)) return resolve(null)
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
          store.createIndex('savedAt', 'savedAt', { unique: false })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        console.warn('打开 IndexedDB 失败：', req.error)
        resolve(null)
      }
    } catch (err) {
      console.warn('打开 IndexedDB 异常：', err)
      resolve(null)
    }
  })
  return dbPromise
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE)
}

// 返回全部记录，按 savedAt 倒序
export async function getAll() {
  const db = await openDB()
  if (!db) return []
  return new Promise((resolve) => {
    try {
      const req = tx(db, 'readonly').getAll()
      req.onsuccess = () => {
        const list = (req.result || []).sort((a, b) => b.savedAt - a.savedAt)
        resolve(list)
      }
      req.onerror = () => resolve([])
    } catch {
      resolve([])
    }
  })
}

// 新增一条，返回生成的 id（失败返回 null）
export async function add(record) {
  const db = await openDB()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const req = tx(db, 'readwrite').add(record)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

// 批量新增（导入用）
export async function bulkAdd(records) {
  const db = await openDB()
  if (!db) return
  return new Promise((resolve) => {
    try {
      const store = tx(db, 'readwrite')
      records.forEach((r) => store.add(r))
      store.transaction.oncomplete = () => resolve()
      store.transaction.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

// 删除一条
export async function remove(id) {
  const db = await openDB()
  if (!db) return
  return new Promise((resolve) => {
    try {
      const req = tx(db, 'readwrite').delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

// 仅保留最新 keep 条，删掉更旧的
export async function clearOldest(keep) {
  const all = await getAll() // 已按 savedAt 倒序
  const toDelete = all.slice(keep)
  for (const r of toDelete) await remove(r.id)
}

// DB 是否可用
export async function isSupported() {
  const db = await openDB()
  return db !== null
}
```

- [ ] **Step 2: 手动验证封装可加载**

在浏览器控制台（`npm run dev` 后打开页面，F12 console）执行临时验证（可在 App.vue 里临时 import 或用 devtools 模块加载）。最简方式：进入 Task 2 后由 `useHistory` 间接验证。此步仅确认文件无语法错误——保存后看 Vite 终端无编译报错即通过。

Expected: Vite 终端无报错，HMR 正常。

---

## Task 2: 响应式历史状态（useHistory.js）

**Files:**
- Create: `src/composables/useHistory.js`

- [ ] **Step 1: 写 composable**

创建 `src/composables/useHistory.js`：

```js
import { ref } from 'vue'
import * as db from './useHistoryDB.js'

const MAX_ITEMS = 100

// 取首个非空行前 ~40 字作为摘要
function makeSummary(content) {
  const firstLine = (content || '').split('\n').find((l) => l.trim()) || ''
  const text = firstLine.trim()
  if (!text) return '（空白文档）'
  return text.length > 40 ? text.slice(0, 40) + '…' : text
}

export function useHistory() {
  const items = ref([])
  const isSupported = ref(true)

  async function refresh() {
    items.value = await db.getAll()
  }

  async function init() {
    isSupported.value = await db.isSupported()
    if (isSupported.value) await refresh()
  }

  // 保存一条快照
  async function save(content) {
    const record = {
      content: content ?? '',
      summary: makeSummary(content),
      savedAt: Date.now(),
    }
    await db.add(record)
    await db.clearOldest(MAX_ITEMS)
    await refresh()
  }

  // 返回某条的 content（找不到返回 null）
  function getContent(id) {
    const found = items.value.find((it) => it.id === id)
    return found ? found.content : null
  }

  async function remove(id) {
    await db.remove(id)
    await refresh()
  }

  // 序列化全部历史为导出 JSON 字符串
  function exportAll() {
    const payload = {
      version: 1,
      exportedAt: Date.now(),
      items: items.value.map(({ content, summary, savedAt }) => ({ content, summary, savedAt })),
    }
    return JSON.stringify(payload, null, 2)
  }

  // 导入：解析 + 校验 + 去重合并 + 裁剪。返回 { added, skipped } 或抛错（格式非法）
  async function importJson(text) {
    const data = JSON.parse(text)
    if (!data || data.version !== 1 || !Array.isArray(data.items)) {
      throw new Error('文件格式不符')
    }
    const existingKeys = new Set(items.value.map((it) => it.savedAt + '|' + it.content))
    const fresh = []
    let skipped = 0
    for (const it of data.items) {
      if (typeof it.content !== 'string' || typeof it.savedAt !== 'number') {
        skipped++
        continue
      }
      const key = it.savedAt + '|' + it.content
      if (existingKeys.has(key)) {
        skipped++
        continue
      }
      existingKeys.add(key)
      fresh.push({
        content: it.content,
        summary: typeof it.summary === 'string' ? it.summary : makeSummary(it.content),
        savedAt: it.savedAt,
      })
    }
    if (fresh.length) {
      await db.bulkAdd(fresh)
      await db.clearOldest(MAX_ITEMS)
      await refresh()
    }
    return { added: fresh.length, skipped }
  }

  return { items, isSupported, init, refresh, save, getContent, remove, exportAll, importJson }
}
```

- [ ] **Step 2: 手动验证（接入后在 Task 5 一并验证）**

此步不单独验证；保存后确认 Vite 无编译报错即通过。

Expected: Vite 终端无报错。

---

## Task 3: 设置弹窗组件（SettingsModal.vue）

**Files:**
- Create: `src/components/SettingsModal.vue`

- [ ] **Step 1: 写组件**

创建 `src/components/SettingsModal.vue`：

```vue
<script setup>
import { ref } from 'vue'

defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  isSupported: { type: Boolean, default: true },
})

const emit = defineEmits(['close', 'save', 'restore', 'remove', 'export', 'import'])

const fileInput = ref(null)

function fmtTime(ts) {
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function charCount(content) {
  return (content || '').replace(/\s/g, '').length
}

function onImportClick() {
  fileInput.value?.click()
}
function onFileChosen(e) {
  const file = e.target.files?.[0]
  if (file) emit('import', file)
  e.target.value = ''
}
</script>

<template>
  <Transition name="modal">
    <div v-if="open" class="overlay" @click.self="emit('close')">
      <div class="modal" role="dialog" aria-modal="true">
        <header class="modal-head">
          <h2>历史记录</h2>
          <button class="close-btn" title="关闭" @click="emit('close')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>

        <div v-if="!isSupported" class="notice">当前环境不支持历史存储（可能为隐私模式）。</div>

        <template v-else>
          <button class="primary-btn" @click="emit('save')">保存当前为历史</button>

          <ul v-if="items.length" class="history-list">
            <li v-for="it in items" :key="it.id" class="history-item">
              <div class="meta">
                <span class="summary">{{ it.summary }}</span>
                <span class="sub">{{ fmtTime(it.savedAt) }} · {{ charCount(it.content) }} 字</span>
              </div>
              <div class="ops">
                <button class="op" @click="emit('restore', it.id)">恢复</button>
                <button class="op danger" @click="emit('remove', it.id)">删除</button>
              </div>
            </li>
          </ul>
          <p v-else class="empty">还没有历史记录，点上方按钮保存第一条吧。</p>

          <footer class="modal-foot">
            <button class="ghost-btn" :disabled="!items.length" @click="emit('export')">导出全部（.json）</button>
            <button class="ghost-btn" @click="onImportClick">导入（.json）</button>
            <input ref="fileInput" type="file" accept=".json,application/json" class="hidden-input" @change="onFileChosen" />
          </footer>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  z-index: 100;
  padding: 1rem;
}
.modal {
  width: min(560px, 100%);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 20px 60px -15px rgba(0, 0, 0, 0.5);
  padding: 1.2rem 1.3rem;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.modal-head h2 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-strong);
}
.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 0.3rem;
  border-radius: 8px;
}
.close-btn:hover { background: var(--surface-hover); color: var(--text-strong); }
.close-btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; }
.notice, .empty {
  font-size: 0.85rem;
  color: var(--text-muted);
  padding: 1.5rem 0;
  text-align: center;
}
.primary-btn {
  width: 100%;
  padding: 0.6rem;
  font-family: inherit;
  font-size: 0.88rem;
  color: var(--accent-ink);
  background: var(--accent);
  border: none;
  border-radius: 9px;
  cursor: pointer;
  margin-bottom: 1rem;
}
.primary-btn:hover { filter: brightness(1.05); }
.history-list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
  margin: 0;
  padding: 0;
}
.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.6rem 0.2rem;
  border-bottom: 1px solid var(--border);
}
.meta { min-width: 0; }
.summary {
  display: block;
  font-size: 0.85rem;
  color: var(--text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sub {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.ops { display: flex; gap: 0.3rem; flex-shrink: 0; }
.op {
  font-family: inherit;
  font-size: 0.78rem;
  padding: 0.3rem 0.6rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text);
  cursor: pointer;
}
.op:hover { background: var(--surface-hover); color: var(--text-strong); }
.op.danger:hover { color: #e53e3e; border-color: #e53e3e; }
.modal-foot {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}
.ghost-btn {
  flex: 1;
  font-family: inherit;
  font-size: 0.82rem;
  padding: 0.5rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 9px;
  color: var(--text);
  cursor: pointer;
}
.ghost-btn:hover:not(:disabled) { background: var(--surface-hover); color: var(--text-strong); }
.ghost-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.hidden-input { display: none; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 2: 手动验证**

保存后看 Vite 终端无编译报错。完整交互在 Task 5 接入后验证。

Expected: 无编译报错。

---

## Task 4: Toolbar 增加设置按钮

**Files:**
- Modify: `src/components/Toolbar.vue`

- [ ] **Step 1: emits 数组追加事件**

把 `defineEmits` 数组末尾加上 `'open-settings'`：

```js
const emit = defineEmits([
  'new',
  'open',
  'export-md',
  'export-html',
  'copy-html',
  'toggle-fullscreen',
  'toggle-theme',
  'open-settings',
])
```

- [ ] **Step 2: 模板里加设置按钮**

在主题切换按钮（`@click="emit('toggle-theme')"` 那个 `<button>`）**之后**、`.actions` div 闭合 `</div>` 之前，插入：

```html
      <button class="btn icon-only" title="历史与设置" @click="emit('open-settings')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
```

- [ ] **Step 3: 手动验证**

`npm run dev`，确认工具栏右侧出现齿轮图标按钮，hover 有背景反馈。点击暂无反应（Task 5 接入）。

Expected: 齿轮按钮可见、样式与其它 icon-only 按钮一致。

---

## Task 5: App.vue 串联

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: import 与状态**

在 `<script setup>` 顶部 import 区追加：

```js
import SettingsModal from './components/SettingsModal.vue'
import { useHistory } from './composables/useHistory.js'
```

在 `const previewRef = ref(null)` 之后追加：

```js
const settingsOpen = ref(false)
const history = useHistory()
```

- [ ] **Step 2: 初始化历史 + 业务方法**

在 `onMounted` 回调里（`document.addEventListener('keydown', onKeydown)` 之后）追加：

```js
  history.init()
```

在 `toggleFullscreen` 函数**之前**新增历史相关方法：

```js
// —— 历史记录 ——
function openSettings() {
  settingsOpen.value = true
}
async function saveHistory() {
  await history.save(content.value)
  showToast('已保存到历史')
}
function restoreHistory(id) {
  const text = history.getContent(id)
  if (text === null) return
  if (text !== content.value && !confirm('恢复会覆盖当前编辑内容，确定吗？')) return
  content.value = text
  settingsOpen.value = false
  showToast('已恢复该历史版本')
}
async function removeHistory(id) {
  await history.remove(id)
  showToast('已删除该历史')
}
function exportHistory() {
  const json = history.exportAll()
  download(`markdown-history-${Date.now()}.json`, json, 'application/json;charset=utf-8')
  showToast('已导出全部历史')
}
function importHistory(file) {
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const { added, skipped } = await history.importJson(String(reader.result ?? ''))
      showToast(`导入 ${added} 条，跳过 ${skipped} 条重复`)
    } catch {
      showToast('导入失败：文件格式不符')
    }
  }
  reader.onerror = () => showToast('文件读取失败')
  reader.readAsText(file)
}
```

- [ ] **Step 3: Esc 关闭弹窗**

修改 `onKeydown`，让 Esc 也能关弹窗（弹窗优先）：

```js
function onKeydown(e) {
  if (e.key === 'Escape') {
    if (settingsOpen.value) {
      settingsOpen.value = false
      return
    }
    if (isFullscreen.value) {
      isFullscreen.value = false
    }
  }
}
```

- [ ] **Step 4: 模板接 Toolbar 事件**

给 `<Toolbar>` 标签追加 `@open-settings="openSettings"`（加在 `@toggle-theme="toggleTheme"` 后）。

- [ ] **Step 5: 模板加弹窗**

在 `<input ref="fileInput" ... />` 之后、`<Transition name="toast">` 之前插入：

```html
    <SettingsModal
      :open="settingsOpen"
      :items="history.items.value"
      :is-supported="history.isSupported.value"
      @close="settingsOpen = false"
      @save="saveHistory"
      @restore="restoreHistory"
      @remove="removeHistory"
      @export="exportHistory"
      @import="importHistory"
    />
```

- [ ] **Step 6: 完整手动验证**

`npm run dev`，依次验证：
- 点齿轮 → 弹窗居中出现，遮罩半透明
- 点「保存当前为历史」→ toast「已保存到历史」，列表出现一条（时间/摘要/字数正确）
- 改动正文再保存 → 新增第二条，倒序在最上
- 点「恢复」一条旧记录 → 出现覆盖确认，确认后编辑器内容被替换、弹窗关闭、toast 提示
- 点「删除」→ 该条消失
- 点「导出全部（.json）」→ 下载 JSON，打开检查 `version/exportedAt/items` 结构正确
- 点「导入」选刚导出的文件 → toast「导入 0 条，跳过 N 条重复」（去重生效）
- 删光历史后导入该文件 → toast「导入 N 条，跳过 0 条」
- 导入一个随便的非 JSON 文件 → toast「导入失败：文件格式不符」，应用不崩溃
- 点遮罩 / 按 Esc → 弹窗关闭
- 全屏状态下按 Esc → 退出全屏（不受影响）

Expected: 以上全部符合预期。

---

## Task 6: 边界验证

**Files:** 无（纯验证）

- [ ] **Step 1: 100 条上限**

在 console 临时跑一段循环调用保存（或手动多次保存），确认历史最多 100 条，超出后最旧的被裁掉。可在 console 执行：
```js
// 仅验证用：通过页面已有的保存按钮反复点击，或用 devtools 观察 IndexedDB → markdown-studio → history 条数 ≤ 100
```
Expected: IndexedDB 中 history 条数始终 ≤ 100，保留的是最新的。

- [ ] **Step 2: 隐私模式降级**

浏览器开隐私/无痕窗口（若该浏览器隐私模式禁用 IndexedDB），打开应用点齿轮 → 弹窗显示「当前环境不支持历史存储」，编辑器其余功能正常。
Expected: 降级提示出现，主功能不受影响。

---

## Self-Review 记录

- **Spec 覆盖**：保存（Task 5 saveHistory）、查看列表（Task 3 + Task 5）、恢复（restoreHistory）、删除（removeHistory）、导出（exportHistory）、导入合并去重（importHistory + useHistory.importJson）、100 条上限（useHistory MAX_ITEMS + clearOldest，Task 6 验证）、IndexedDB 存储（Task 1）、居中弹窗（Task 3）、容错降级（各模块 try/catch + isSupported）、自动摘要（makeSummary）。全部有对应任务。
- **占位符**：无 TBD/TODO，所有代码完整给出。
- **类型一致性**：`useHistoryDB` 导出 `getAll/add/bulkAdd/remove/clearOldest/isSupported`，`useHistory` 与 App.vue 调用名一致；记录字段 `{ id, content, summary, savedAt }` 全程统一；导出 JSON 字段 `version/exportedAt/items` 与 importJson 校验一致。
