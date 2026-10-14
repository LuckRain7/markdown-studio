import { ref, watch } from 'vue'
import { mwebThemes } from '../styles/mweb/index.js'

/** 「跟随界面主题」：使用 markdown.css 的内置排版 */
export const APP_STYLE = 'app'
export { mwebThemes }

// 每套主题 CSS 单独成 chunk，切换到时才加载
const loaders = import.meta.glob('../styles/mweb/*.css', { query: '?inline', import: 'default' })
const cache = new Map()

async function loadCss(id) {
  if (cache.has(id)) return cache.get(id)
  const loader = loaders[`../styles/mweb/${id}.css`]
  if (!loader) throw new Error(`未知的预览样式：${id}`)
  const css = await loader()
  cache.set(id, css)
  return css
}

/**
 * 根据选中的预览样式加载并注入对应 CSS。
 * @param {import('vue').Ref<string>} selected  选中的样式 id（APP_STYLE 或 mweb 主题 id）
 * @param {(err: Error) => void}       onError   加载失败回调（此时会回退到 APP_STYLE）
 * @returns {{ applied: import('vue').Ref<string>, getCss: (id: string) => string }}
 *   applied：CSS 已就绪、可以挂到预览区上的样式 id；加载完成前保持旧值，避免闪出无样式内容
 */
export function usePreviewStyle(selected, onError) {
  const applied = ref(APP_STYLE)
  let styleEl = null
  let seq = 0

  watch(
    selected,
    async (id) => {
      const current = ++seq
      if (id === APP_STYLE) {
        styleEl?.remove()
        styleEl = null
        applied.value = APP_STYLE
        return
      }
      try {
        const css = await loadCss(id)
        if (current !== seq) return // 期间又切换了，丢弃过期结果
        if (!styleEl) {
          styleEl = document.createElement('style')
          styleEl.dataset.previewStyle = ''
          document.head.appendChild(styleEl)
        }
        styleEl.textContent = css
        applied.value = id
      } catch (err) {
        if (current !== seq) return
        console.warn('加载预览样式失败：', err)
        selected.value = APP_STYLE
        onError?.(err)
      }
    },
    { immediate: true },
  )

  return {
    applied,
    getCss: (id) => cache.get(id) ?? '',
  }
}
