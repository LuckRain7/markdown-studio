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
