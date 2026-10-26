<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import Toolbar from './components/Toolbar.vue'
import EditorPane from './components/EditorPane.vue'
import PreviewPane from './components/PreviewPane.vue'
import SettingsModal from './components/SettingsModal.vue'
import { usePersistentRef } from './composables/useStorage.js'
import { renderMarkdown } from './composables/useMarkdown.js'
import { useHistory } from './composables/useHistory.js'
import { usePreviewStyle, APP_STYLE } from './composables/usePreviewStyle.js'
import { getFileRecord, putFileRecord } from './composables/useFileHandleDB.js'
import { sampleMarkdown } from './data/sample.js'

const content = usePersistentRef('markdown-studio:content', sampleMarkdown)
const theme = usePersistentRef('markdown-studio:theme', 'light')
// 全屏阅读时正文的居中宽度（px），存储为字符串，读取时转数字并兜底
const readingWidthRaw = usePersistentRef('markdown-studio:reading-width', '900')
const readingWidth = computed({
  get: () => Number(readingWidthRaw.value) || 900,
  set: (val) => (readingWidthRaw.value = String(val)),
})

// 预览样式：APP_STYLE 跟随界面主题，否则为 mweb 主题 id（与界面配色相互独立）
const previewStyle = usePersistentRef('markdown-studio:preview-style', APP_STYLE)
const { applied: appliedPreviewStyle, getCss: getPreviewCss } = usePreviewStyle(
  previewStyle,
  () => showToast('预览样式加载失败，已恢复默认'),
)

const isFullscreen = ref(false)
const toast = ref('')
const fileInput = ref(null)
const editorRef = ref(null)
const previewRef = ref(null)
const settingsOpen = ref(false)
const history = useHistory()

const wordCount = computed(() => content.value.replace(/\s/g, '').length)

// —— 主题 ——
watch(
  theme,
  (val) => {
    document.documentElement.dataset.theme = val
  },
  { immediate: true },
)
function setTheme(val) {
  theme.value = val
}
function setPreviewStyle(val) {
  previewStyle.value = val
}

// —— 提示气泡 ——
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2200)
}

// —— 文件操作 ——
function newDocument() {
  if (content.value.trim() && !confirm('确定要清空当前内容、新建文档吗？')) return
  content.value = ''
  openedFile.value = null
  setFileParam(null)
  showToast('已新建空白文档')
}

// 当前打开的本地文件：{ name, handle?, file?, text }，用于「刷新」重新读取。
// 优先用 File System Access API 的 handle——每次 getFile() 都能拿到磁盘上的最新内容；
// 不支持时退回 <input> 拿到的 File，但它只是快照，文件被改动后重读可能失败或仍是旧内容。
const openedFile = ref(null)
const OPEN_TYPES = [
  {
    description: 'Markdown',
    accept: { 'text/markdown': ['.md', '.markdown'], 'text/plain': ['.txt'] },
  },
]

async function openFile() {
  if (!window.showOpenFilePicker) {
    fileInput.value?.click()
    return
  }
  let handle
  try {
    ;[handle] = await window.showOpenFilePicker({ types: OPEN_TYPES })
  } catch (err) {
    if (err?.name !== 'AbortError') fileInput.value?.click() // 非用户取消（如被策略禁用）时退回 <input>
    return
  }
  try {
    const file = await handle.getFile()
    loadFile({ name: file.name, handle }, await file.text())
    showToast(`已打开 ${file.name}`)
  } catch {
    showToast('文件读取失败')
  }
}
function onFileChosen(e) {
  const file = e.target.files?.[0]
  if (!file) return
  file
    .text()
    .then((text) => {
      loadFile({ name: file.name, file }, text)
      showToast(`已打开 ${file.name}`)
    })
    .catch(() => showToast('文件读取失败'))
  e.target.value = '' // 允许重复打开同一文件
}
function loadFile(source, text) {
  content.value = text
  openedFile.value = { ...source, text }
  // 有句柄才能在刷新/重开链接时恢复，此时把文件名写进 URL 并存下句柄；<input> 打开的拿不到句柄，清掉参数
  if (source.handle) {
    setFileParam(source.name)
    putFileRecord({ name: source.name, handle: source.handle, text })
  } else {
    setFileParam(null)
  }
}

// —— URL 参数 ?file=<文件名>：标记当前打开的本地文件，配合 IndexedDB 里的句柄恢复 ——
// 浏览器拿不到本地文件的完整路径，只能用文件名做键；同名文件以最近打开的为准。
const FILE_PARAM = 'file'
function setFileParam(name) {
  try {
    const url = new URL(location.href)
    if (name) url.searchParams.set(FILE_PARAM, name)
    else url.searchParams.delete(FILE_PARAM)
    window.history.replaceState(window.history.state, '', url)
  } catch (err) {
    console.warn('更新 URL 参数失败：', err)
  }
}

// 句柄的读权限：刷新页面后通常会回到 'prompt'，request 为 true 时才发起授权（须在用户点击中调用）
async function hasReadPermission(handle, request) {
  const opts = { mode: 'read' }
  try {
    if ((await handle.queryPermission?.(opts)) === 'granted') return true
    return request && (await handle.requestPermission?.(opts)) === 'granted'
  } catch {
    return false
  }
}

async function restoreFromUrl() {
  const name = new URLSearchParams(location.search).get(FILE_PARAM)
  if (!name) return
  const record = await getFileRecord(name)
  if (!record?.handle) {
    setFileParam(null)
    showToast(`未找到 ${name} 的打开记录，请重新打开该文件`)
    return
  }
  openedFile.value = { name, handle: record.handle, text: record.text }
  if (await hasReadPermission(record.handle, false)) {
    await reloadFile()
  } else {
    showToast(`点击「刷新」按钮授权读取 ${name}`)
  }
}

async function reloadFile() {
  const opened = openedFile.value
  if (!opened) return
  // 先授权再弹确认框：requestPermission 需要用户点击带来的激活状态，确认框停留太久会让它失效
  if (opened.handle && !(await hasReadPermission(opened.handle, true))) {
    showToast(`未获得 ${opened.name} 的读取权限`)
    return
  }
  if (content.value !== opened.text && !confirm(`编辑区有未导出的修改，确定用 ${opened.name} 的内容覆盖吗？`)) return
  try {
    const file = opened.handle ? await opened.handle.getFile() : opened.file
    loadFile(opened, await file.text())
    showToast(`已重新读取 ${opened.name}`)
  } catch {
    showToast(
      opened.handle ? '文件读取失败，可能已被移动或删除' : '文件已变更，当前浏览器无法直接重读，请重新打开',
    )
  }
}

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportMarkdown() {
  download('document.md', content.value, 'text/markdown;charset=utf-8')
  showToast('已导出 Markdown')
}

function buildHtmlDocument() {
  const body = renderMarkdown(content.value)
  const style = appliedPreviewStyle.value
  if (style !== APP_STYLE) {
    // 使用 mweb 预览样式：主题根节点挂在 <body> 上，背景色会铺满整个页面
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Markdown 导出</title>
<style>
  body { max-width: 800px; margin: 0 auto; padding: 2.5rem 1.2rem; }
</style>
<style>
${getPreviewCss(style)}
</style>
</head>
<body class="mweb-${style}">
${body}
</body>
</html>`
  }
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Markdown 导出</title>
<style>
  body { max-width: 800px; margin: 2.5rem auto; padding: 0 1.2rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.7; color: #2d3748; }
  h1, h2, h3, h4 { font-weight: 600; line-height: 1.25; margin: 1.6em 0 0.8em; }
  h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #e2e8f0; }
  h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #e2e8f0; }
  h3 { font-size: 1.25em; } h4 { font-size: 1em; }
  a { color: #3182ce; text-decoration: none; }
  a:hover { text-decoration: underline; }
  pre { background: #f6f8fa; padding: 1rem 1.3rem; border-radius: 10px; border: 1px solid #e2e8f0; overflow: auto; }
  code { font-family: "JetBrains Mono", Menlo, Consolas, monospace; font-size: 0.86em; }
  :not(pre) > code { background: #f6f8fa; padding: 0.15em 0.4em; border-radius: 5px; }
  blockquote { border-left: 0.25em solid #dfe2e5; margin: 1em 0; padding: 0.2em 0 0.2em 1em; color: #6a737d; }
  table { border-collapse: collapse; width: 100%; margin: 1.2em 0; }
  th, td { border: 1px solid #e2e8f0; padding: 0.5rem 0.9rem; text-align: left; word-break: keep-all; }
  th { background: #f6f8fa; font-weight: 600; }
  hr { border: none; height: 1px; background: #e2e8f0; margin: 2em 0; }
  img { max-width: 100%; border-radius: 8px; }
  /* 代码高亮 */
  .hljs-comment, .hljs-quote { color: #a0aec0; font-style: italic; }
  .hljs-keyword, .hljs-selector-tag, .hljs-built_in, .hljs-name { color: #3182ce; font-weight: 500; }
  .hljs-string, .hljs-attr { color: #5b8a72; }
  .hljs-number, .hljs-literal { color: #b9743a; }
  .hljs-title, .hljs-section { color: #4a6f9c; font-weight: 500; }
  .hljs-attribute, .hljs-variable, .hljs-type { color: #9c6b8a; }
  .hljs-meta { color: #a0aec0; }
</style>
</head>
<body>
${body}
</body>
</html>`
}

function exportHtml() {
  download('document.html', buildHtmlDocument(), 'text/html;charset=utf-8')
  showToast('已导出 HTML')
}

async function copyHtml() {
  const body = renderMarkdown(content.value)
  try {
    await navigator.clipboard.writeText(body)
    showToast('HTML 已复制到剪贴板')
  } catch {
    // 降级方案
    const ta = document.createElement('textarea')
    ta.value = body
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      showToast('HTML 已复制到剪贴板')
    } catch {
      showToast('复制失败，请手动导出')
    }
    document.body.removeChild(ta)
  }
}

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
    } catch (err) {
      showToast(`导入失败：${err?.message || '文件格式不符'}`)
    }
  }
  reader.onerror = () => showToast('文件读取失败')
  reader.readAsText(file)
}

// —— 预览全屏（窗口内 CSS 全屏，非浏览器原生全屏）——
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}
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

// —— 滚动同步（编辑区 <-> 预览区，按比例）——
// 用 rAF 复位标志位：即使目标 scrollTop 无变化、不触发回声 scroll 事件，
// 锁也会在下一帧释放，不会出现「吞掉下一次滚动」的卡死。
let syncing = false
function syncScroll(source, e) {
  if (syncing) return
  const src = e.target
  const target =
    source === 'editor' ? previewRef.value?.scroller : editorRef.value?.textarea
  if (!target) return
  syncing = true
  const ratio = src.scrollTop / (src.scrollHeight - src.clientHeight || 1)
  target.scrollTop = ratio * (target.scrollHeight - target.clientHeight)
  requestAnimationFrame(() => {
    syncing = false
  })
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  history.init()
  restoreFromUrl()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="app">
    <Toolbar
      :theme="theme"
      :preview-style="previewStyle"
      :is-fullscreen="isFullscreen"
      :word-count="wordCount"
      :opened-file-name="openedFile?.name || ''"
      @new="newDocument"
      @open="openFile"
      @reload="reloadFile"
      @export-md="exportMarkdown"
      @export-html="exportHtml"
      @copy-html="copyHtml"
      @toggle-fullscreen="toggleFullscreen"
      @set-theme="setTheme"
      @set-preview-style="setPreviewStyle"
      @open-settings="openSettings"
    />

    <main class="workspace">
      <EditorPane
        ref="editorRef"
        v-model="content"
        @scroll="(e) => syncScroll('editor', e)"
      />
      <div class="seam" aria-hidden="true"></div>
      <PreviewPane
        ref="previewRef"
        :content="content"
        v-model:reading-width="readingWidth"
        :preview-style="appliedPreviewStyle"
        :fullscreen="isFullscreen"
        @scroll="(e) => syncScroll('preview', e)"
        @exit-fullscreen="isFullscreen = false"
      />
    </main>

    <input
      ref="fileInput"
      type="file"
      accept=".md,.markdown,.txt,text/markdown"
      class="hidden-input"
      @change="onFileChosen"
    />

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

    <Transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.workspace {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1px 1fr;
  min-height: 0;
}

.seam {
  background: var(--border);
}

.hidden-input {
  display: none;
}

.toast {
  position: fixed;
  bottom: 1.6rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.6rem 1.2rem;
  background: var(--toast-bg);
  color: var(--toast-ink);
  font-size: 0.85rem;
  border-radius: 999px;
  box-shadow: 0 8px 30px -8px rgba(0, 0, 0, 0.35);
  z-index: 50;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

@media (max-width: 720px) {
  .workspace {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1px 1fr;
  }
}
</style>
