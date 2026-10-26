// 本地文件句柄的 IndexedDB 读写封装，无 Vue 依赖。所有操作失败时降级（返回 null），不抛错。
// FileSystemFileHandle 支持结构化克隆，可以直接存进 IndexedDB，页面刷新后还能拿回来重新读取。
// 与历史记录分库存放，互不影响版本升级。
const DB_NAME = 'markdown-studio-files'
const DB_VERSION = 1
const STORE = 'handles'

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
          db.createObjectStore(STORE, { keyPath: 'name' })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        console.warn('打开文件句柄库失败：', req.error)
        resolve(null)
      }
    } catch (err) {
      console.warn('打开文件句柄库异常：', err)
      resolve(null)
    }
  })
  return dbPromise
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE)
}

// 按文件名读取 { name, handle, text }，不存在或失败返回 null
export async function getFileRecord(name) {
  const db = await openDB()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const req = tx(db, 'readonly').get(name)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

// 写入/覆盖一条记录（同名文件以最近打开的为准）
export async function putFileRecord(record) {
  const db = await openDB()
  if (!db) return
  return new Promise((resolve) => {
    try {
      const req = tx(db, 'readwrite').put(record)
      req.onsuccess = () => resolve()
      req.onerror = () => {
        console.warn('保存文件句柄失败：', req.error)
        resolve()
      }
    } catch (err) {
      console.warn('保存文件句柄异常：', err)
      resolve()
    }
  })
}
