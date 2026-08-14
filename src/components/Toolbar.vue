<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import BrandLogo from './BrandLogo.vue'

defineProps({
  theme: { type: String, default: 'light' },
  isFullscreen: { type: Boolean, default: false },
  wordCount: { type: Number, default: 0 },
})

const emit = defineEmits([
  'new',
  'open',
  'export-md',
  'export-html',
  'copy-html',
  'toggle-fullscreen',
  'set-theme',
  'open-settings',
])

// 可选主题：id 对应 global.css 里的 [data-theme='...']，swatch 为色板预览色
const themes = [
  { id: 'light', name: '亮色', swatch: 'linear-gradient(135deg,#ffffff,#cbd5e0)' },
  { id: 'dark', name: '暗色', swatch: 'linear-gradient(135deg,#4a5568,#1a202c)' },
  { id: 'green', name: '护眼绿', swatch: 'linear-gradient(135deg,#e3eed8,#4a8a2a)' },
  { id: 'sepia', name: '暖纸黄', swatch: 'linear-gradient(135deg,#f0e4c8,#c08820)' },
  { id: 'ocean', name: '深海蓝', swatch: 'linear-gradient(135deg,#d8e6f5,#2a6cb0)' },
  { id: 'sunset', name: '暮霞橙', swatch: 'linear-gradient(135deg,#fbe0d0,#d46a1e)' },
  { id: 'anthropic', name: 'Anthropic', swatch: 'linear-gradient(135deg,#f4f1ec,#cc785c)' },
  { id: 'nord', name: 'Nord 雪山青', swatch: 'linear-gradient(135deg,#e5e9f0,#5e81ac)' },
  { id: 'gruvbox', name: 'Gruvbox 复古林', swatch: 'linear-gradient(135deg,#3c3836,#fe8019)' },
  { id: 'solarized', name: 'Solarized 阳光', swatch: 'linear-gradient(135deg,#eee8d5,#1a7ab8)' },
  { id: 'catppuccin', name: 'Catppuccin 拿铁', swatch: 'linear-gradient(135deg,#e6e9ef,#8839ef)' },
  { id: 'mdn', name: 'MDN', swatch: 'linear-gradient(135deg,#f0f0f4,#0056b7)' },
  { id: 'midnight', name: '午夜墨', swatch: 'linear-gradient(135deg,#2a3048,#7a8af5)' },
]

const themeMenuOpen = ref(false)
function toggleThemeMenu() {
  themeMenuOpen.value = !themeMenuOpen.value
}
function pickTheme(id) {
  emit('set-theme', id)
  themeMenuOpen.value = false
}
// Esc 关闭主题菜单，与设置/全屏浮层行为一致
function onKeydown(e) {
  if (e.key === 'Escape' && themeMenuOpen.value) {
    themeMenuOpen.value = false
  }
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <header class="toolbar">
    <div class="brand">
      <span class="brand-mark"><BrandLogo /></span>
      <div class="brand-text">
        <h1>Markdown Studio</h1>
        <p>安静 · 专注 · 即时预览</p>
      </div>
    </div>

    <div class="actions">
      <button class="btn" title="新建文档" @click="emit('new')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M12 12v6M9 15h6" />
        </svg>
        <span>新建</span>
      </button>

      <button class="btn" title="打开本地 .md 文件" @click="emit('open')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
        <span>打开</span>
      </button>

      <div class="divider" role="separator"></div>

      <button class="btn" title="导出 Markdown 文件" @click="emit('export-md')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M7 10l5 5 5-5M12 15V3" />
        </svg>
        <span>.md</span>
      </button>

      <button class="btn" title="导出 HTML 文件" @click="emit('export-html')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
        </svg>
        <span>.html</span>
      </button>

      <button class="btn" title="复制 HTML 到剪贴板" @click="emit('copy-html')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span>复制 HTML</span>
      </button>

      <div class="divider" role="separator"></div>

      <span class="word-count" title="字符数">{{ wordCount }} 字</span>

      <button
        class="btn icon-only"
        :title="isFullscreen ? '退出全屏' : '全屏模式'"
        @click="emit('toggle-fullscreen')"
      >
        <svg v-if="!isFullscreen" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
        </svg>
      </button>

      <div class="theme-picker">
        <button
          class="btn icon-only"
          title="切换主题"
          :class="{ active: themeMenuOpen }"
          @click="toggleThemeMenu"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <circle cx="8.5" cy="9" r="1.4" />
            <circle cx="15.5" cy="9" r="1.4" />
            <circle cx="9.5" cy="15" r="1.4" />
            <circle cx="15" cy="14.5" r="1.4" />
          </svg>
        </button>
        <Transition name="menu">
          <div v-if="themeMenuOpen" class="theme-menu" role="menu">
            <button
              v-for="t in themes"
              :key="t.id"
              class="theme-option"
              :class="{ current: t.id === theme }"
              role="menuitem"
              @click="pickTheme(t.id)"
            >
              <span class="swatch" :style="{ background: t.swatch }"></span>
              <span class="theme-name">{{ t.name }}</span>
              <svg
                v-if="t.id === theme"
                class="check"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            </button>
          </div>
        </Transition>
        <div
          v-if="themeMenuOpen"
          class="theme-backdrop"
          @click="themeMenuOpen = false"
        ></div>
      </div>

      <button class="btn icon-only" title="历史与设置" @click="emit('open-settings')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 1.25rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  /* 无边框几何极简：直接用主调蓝描边的 M↓，自动跟随主题 */
  color: var(--accent);
}

.brand-text h1 {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.1;
  color: var(--accent);
}

.brand-text p {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  margin-top: 1px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.42rem 0.7rem;
  font-family: inherit;
  font-size: 0.82rem;
  color: var(--text);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease, border-color 0.16s ease, transform 0.1s ease;
}

.btn:hover {
  background: var(--surface-hover);
  border-color: var(--border);
  color: var(--text-strong);
}

.btn:active {
  transform: translateY(1px);
}

.btn svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.btn.icon-only {
  padding: 0.42rem;
}

.divider {
  width: 1px;
  height: 22px;
  background: var(--border);
  margin: 0 0.25rem;
}

.word-count {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  padding: 0 0.3rem;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .btn span {
    display: none;
  }
  .btn {
    padding: 0.42rem;
  }
  .word-count {
    display: none;
  }
}

/* —— 主题色板选择器 —— */
.theme-picker {
  position: relative;
}

.theme-picker .btn.active {
  background: var(--surface-hover);
  border-color: var(--border);
  color: var(--text-strong);
}

.theme-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 60;
  min-width: 150px;
  max-height: min(70vh, 380px);
  overflow-y: auto;
  padding: 0.3rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 32px -10px rgba(0, 0, 0, 0.28);
}

.theme-option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.6rem;
  font-family: inherit;
  font-size: 0.82rem;
  color: var(--text);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  text-align: left;
  width: 100%;
}

.theme-option:hover {
  background: var(--surface-hover);
  color: var(--text-strong);
}

.theme-option.current {
  color: var(--text-strong);
  font-weight: 600;
}

.swatch {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid var(--border);
  box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.4);
}

.theme-name {
  flex: 1;
}

.theme-option .check {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: var(--accent);
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.theme-backdrop {
  position: fixed;
  inset: 0;
  z-index: 55;
}

.menu-enter-active,
.menu-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
