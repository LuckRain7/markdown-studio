import { ref, watch } from 'vue'

/**
 * 一个绑定到 localStorage 的响应式引用，写入做防抖处理。
 * @param {string} key      存储键
 * @param {*}      fallback  无历史记录时的默认值
 * @param {number} delay     防抖毫秒数
 */
export function usePersistentRef(key, fallback, delay = 400) {
  let initial = fallback
  try {
    const saved = localStorage.getItem(key)
    if (saved !== null) initial = saved
  } catch (err) {
    console.warn('读取本地存储失败：', err)
  }

  const state = ref(initial)
  let timer = null

  watch(state, (value) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      try {
        localStorage.setItem(key, value)
      } catch (err) {
        console.warn('写入本地存储失败：', err)
      }
    }, delay)
  })

  return state
}
