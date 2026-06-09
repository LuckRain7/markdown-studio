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
      const ok = await db.bulkAdd(fresh)
      if (!ok) throw new Error('写入存储失败')
      await db.clearOldest(MAX_ITEMS)
      await refresh()
    }
    return { added: fresh.length, skipped }
  }

  return { items, isSupported, init, refresh, save, getContent, remove, exportAll, importJson }
}
