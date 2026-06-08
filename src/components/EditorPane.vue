<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'scroll'])

const textarea = ref(null)

defineExpose({ textarea })

// 工具条按钮配置：每个按钮描述如何包裹/插入语法
const formatTools = [
  { key: 'bold', label: '加粗', icon: 'B', style: 'font-weight:700', wrap: '**', placeholder: '加粗文字' },
  { key: 'italic', label: '斜体', icon: 'I', style: 'font-style:italic', wrap: '*', placeholder: '斜体文字' },
  { key: 'strike', label: '删除线', icon: 'S', style: 'text-decoration:line-through', wrap: '~~', placeholder: '删除文字' },
  { key: 'h', label: '标题', icon: 'H', prefix: '## ', placeholder: '标题' },
  { key: 'quote', label: '引用', icon: '❝', prefix: '> ', placeholder: '引用内容' },
  { key: 'code', label: '行内代码', icon: '<>', wrap: '`', placeholder: '代码' },
  { key: 'codeblock', label: '代码块', icon: '{ }', block: '```', placeholder: '代码块' },
  { key: 'ul', label: '无序列表', icon: '•', prefix: '- ', placeholder: '列表项' },
  { key: 'ol', label: '有序列表', icon: '1.', prefix: '1. ', placeholder: '列表项' },
  { key: 'task', label: '任务', icon: '☑', prefix: '- [ ] ', placeholder: '待办事项' },
  { key: 'link', label: '链接', icon: '🔗', template: '[$SEL](https://)', placeholder: '链接文字' },
  { key: 'image', label: '图片', icon: '🖼', template: '![$SEL](https://)', placeholder: '图片描述' },
  { key: 'table', label: '表格', icon: '▦', insert: '\n| 列 1 | 列 2 |\n| --- | --- |\n| 单元格 | 单元格 |\n' },
  { key: 'hr', label: '分割线', icon: '―', insert: '\n---\n' },
]

function applyTool(tool) {
  const el = textarea.value
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const value = props.modelValue
  const selected = value.slice(start, end)
  let inserted = ''
  let cursorStart = start
  let cursorEnd = end

  if (tool.wrap) {
    const text = selected || tool.placeholder
    inserted = `${tool.wrap}${text}${tool.wrap}`
    cursorStart = start + tool.wrap.length
    cursorEnd = cursorStart + text.length
  } else if (tool.block) {
    const text = selected || tool.placeholder
    inserted = `\n${tool.block}\n${text}\n${tool.block}\n`
    cursorStart = start + tool.block.length + 2
    cursorEnd = cursorStart + text.length
  } else if (tool.prefix) {
    // 按行加前缀
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const text = value.slice(lineStart, end) || tool.placeholder
    const prefixed = text
      .split('\n')
      .map((line) => tool.prefix + line)
      .join('\n')
    replaceRange(el, lineStart, end, prefixed)
    return
  } else if (tool.template) {
    const text = selected || tool.placeholder
    // 用替换函数，避免 text 中的 $&、$` 等被当作特殊替换模式
    inserted = tool.template.replace('$SEL', () => text)
    const offset = tool.template.indexOf('$SEL')
    cursorStart = start + offset
    cursorEnd = cursorStart + text.length
  } else if (tool.insert) {
    inserted = tool.insert
    cursorStart = cursorEnd = start + inserted.length
  }

  replaceRange(el, start, end, inserted, cursorStart, cursorEnd)
}

function replaceRange(el, from, to, text, selStart, selEnd) {
  const value = props.modelValue
  const next = value.slice(0, from) + text + value.slice(to)
  emit('update:modelValue', next)
  // 等 DOM 更新后恢复光标
  requestAnimationFrame(() => {
    el.focus()
    const s = selStart ?? from + text.length
    const e = selEnd ?? s
    el.setSelectionRange(s, e)
  })
}

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

function onKeydown(e) {
  const meta = e.metaKey || e.ctrlKey
  if (!meta) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = textarea.value
      replaceRange(el, el.selectionStart, el.selectionEnd, '  ')
    }
    return
  }
  const map = { b: 'bold', i: 'italic', k: 'link' }
  const toolKey = map[e.key.toLowerCase()]
  if (toolKey) {
    e.preventDefault()
    applyTool(formatTools.find((t) => t.key === toolKey))
  }
}
</script>

<template>
  <section class="editor-pane">
    <div class="format-bar">
      <button
        v-for="tool in formatTools"
        :key="tool.key"
        class="fmt-btn"
        :title="tool.label"
        :style="tool.style"
        @click="applyTool(tool)"
      >
        {{ tool.icon }}
      </button>
    </div>
    <textarea
      ref="textarea"
      class="editor"
      :value="modelValue"
      spellcheck="false"
      placeholder="开始写点什么……"
      @input="onInput"
      @keydown="onKeydown"
      @scroll="emit('scroll', $event)"
    ></textarea>
  </section>
</template>

<style scoped>
.editor-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--editor-bg);
}

.format-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-wrap: wrap;
}

.fmt-btn {
  min-width: 30px;
  height: 30px;
  padding: 0 0.4rem;
  display: inline-grid;
  place-items: center;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1;
  color: var(--text);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease;
}

.fmt-btn:hover {
  background: var(--surface-hover);
  color: var(--accent);
}

.fmt-btn:active {
  transform: scale(0.92);
}

.editor {
  flex: 1;
  width: 100%;
  resize: none;
  border: none;
  outline: none;
  padding: 20px;
  background: transparent;
  color: var(--editor-ink);
  font-family: 'JetBrains Mono', 'Noto Sans SC', monospace;
  font-size: 0.92rem;
  line-height: 1.85;
  tab-size: 2;
  caret-color: var(--accent);
}

.editor::placeholder {
  color: var(--text-muted);
}

.editor::selection {
  background: var(--accent-glow);
}
</style>
