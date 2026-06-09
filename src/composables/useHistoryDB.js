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

// 批量新增（导入用）。成功返回 true，失败返回 false（不抛错）
export async function bulkAdd(records) {
  const db = await openDB()
  if (!db) return false
  return new Promise((resolve) => {
    try {
      const store = tx(db, 'readwrite')
      records.forEach((r) => store.add(r))
      store.transaction.oncomplete = () => resolve(true)
      store.transaction.onerror = () => resolve(false)
    } catch {
      resolve(false)
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
