<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { renderMarkdown } from '../composables/useMarkdown.js'

const props = defineProps({
  content: { type: String, default: '' },
  fullscreen: { type: Boolean, default: false },
  readingWidth: { type: Number, default: 900 },
  // 'app' 用内置 .markdown-body 排版，否则挂上对应的 mweb 主题类名
  previewStyle: { type: String, default: 'app' },
})
const emit = defineEmits(['scroll', 'exit-fullscreen', 'update:readingWidth'])

// 全屏阅读宽度：滑块拉到最大值即视为「全宽」，不再限制
const WIDTH_MIN = 560
const WIDTH_MAX = 1600
const bodyClass = computed(() =>
  props.previewStyle === 'app' ? 'markdown-body' : `mweb-${props.previewStyle}`,
)

const isFullWidth = computed(() => props.readingWidth >= WIDTH_MAX)
const widthLabel = computed(() => (isFullWidth.value ? '全宽' : `${props.readingWidth}px`))
const scrollerStyle = computed(() =>
  props.fullscreen
    ? { '--reading-width': isFullWidth.value ? '100%' : `${props.readingWidth}px` }
    : null,
)
function onWidthInput(e) {
  emit('update:readingWidth', Number(e.target.value))
}

const scroller = ref(null)
defineExpose({ scroller })

// 对渲染做轻量防抖：编辑区文本即时更新，预览延迟 120ms 渲染，
// 避免大文档逐键跑 marked + highlight + DOMPurify 导致掉帧。
const debounced = ref(props.content)
let timer = null
watch(
  () => props.content,
  (val) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = val
    }, 120)
  },
)
onBeforeUnmount(() => clearTimeout(timer))

const html = computed(() => renderMarkdown(debounced.value))
</script>

<template>
  <section class="preview-pane" :class="{ 'is-fullscreen': fullscreen }">
    <div v-if="!fullscreen" class="preview-label">预览</div>
    <div v-if="fullscreen" class="fs-controls">
      <label class="width-control" title="调整全屏时正文的居中宽度">
        <span class="width-text">阅读宽度</span>
        <input
          type="range"
          :min="WIDTH_MIN"
          :max="WIDTH_MAX"
          step="20"
          :value="Math.min(readingWidth, WIDTH_MAX)"
          @input="onWidthInput"
        />
        <span class="width-value">{{ widthLabel }}</span>
      </label>
      <button
        class="exit-fullscreen"
        title="退出全屏（Esc）"
        @click="emit('exit-fullscreen')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
        </svg>
        <span>退出全屏</span>
      </button>
    </div>
    <article
      ref="scroller"
      class="preview"
      :class="bodyClass"
      :style="scrollerStyle"
      v-html="html"
      @scroll="emit('scroll', $event)"
    ></article>
  </section>
</template>

<style scoped>
.preview-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--preview-bg);
  position: relative;
}

/* 窗口内全屏：铺满当前视口，覆盖编辑区与工具栏（非浏览器原生全屏） */
.preview-pane.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 60;
}

.fs-controls {
  position: absolute;
  top: 1rem;
  right: 1.2rem;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.width-control {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.32rem 0.7rem;
  font-size: 0.78rem;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 9px;
  cursor: pointer;
}
.width-control input[type='range'] {
  width: 120px;
  accent-color: var(--accent);
  cursor: pointer;
}
.width-value {
  min-width: 3.6em;
  text-align: right;
  color: var(--text-strong);
  font-variant-numeric: tabular-nums;
}

.exit-fullscreen {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.42rem 0.8rem;
  font-family: inherit;
  font-size: 0.82rem;
  color: var(--accent-ink);
  background: var(--accent);
  border: none;
  border-radius: 9px;
  cursor: pointer;
  box-shadow: 0 4px 14px -4px var(--accent-glow);
  transition: background 0.16s ease, transform 0.1s ease;
}
.exit-fullscreen:hover {
  background: var(--accent-hover);
}
.exit-fullscreen:active {
  transform: translateY(1px);
}
.exit-fullscreen svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.preview-label {
  position: absolute;
  top: 0.7rem;
  right: 1.2rem;
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  color: var(--text-muted);
  text-transform: uppercase;
  pointer-events: none;
  z-index: 1;
}

.preview {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: auto;
}

/* 全屏时用左右内边距把正文收窄居中，滚动条仍贴窗口边缘；
   顶部留出空间避免被右上角控件遮挡 */
.is-fullscreen .preview {
  padding: 4rem max(20px, calc((100% - var(--reading-width, 900px)) / 2)) 3rem;
}

@media (max-width: 720px) {
  .width-text {
    display: none;
  }
  .width-control input[type='range'] {
    width: 80px;
  }
}
</style>
