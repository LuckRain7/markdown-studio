<script setup>
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
  'toggle-theme',
  'open-settings',
])
</script>

<template>
  <header class="toolbar">
    <div class="brand">
      <span class="brand-mark">✍</span>
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

      <button
        class="btn icon-only"
        :title="theme === 'dark' ? '切换到亮色' : '切换到暗色'"
        @click="emit('toggle-theme')"
      >
        <svg v-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>

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
  width: 38px;
  height: 38px;
  border-radius: 11px;
  font-size: 1.15rem;
  background: var(--accent);
  color: var(--accent-ink);
  box-shadow: 0 2px 8px -2px var(--accent-glow);
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
</style>
