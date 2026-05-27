// Backup / restore — localStorage + cookies + full IndexedDB (world saves, etc.)

function b64enc(buf: ArrayBuffer | ArrayBufferView): string {
  const bytes = buf instanceof ArrayBuffer
    ? new Uint8Array(buf)
    : new Uint8Array((buf as ArrayBufferView).buffer, (buf as ArrayBufferView).byteOffset, (buf as ArrayBufferView).byteLength)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function b64dec(s: string): Uint8Array {
  const str = atob(s)
  const arr = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i)
  return arr
}

function serialize(v: unknown): unknown {
  if (v instanceof ArrayBuffer)   return { __t: 'ab', d: b64enc(v) }
  if (ArrayBuffer.isView(v))      return { __t: 'u8', d: b64enc(v as ArrayBufferView) }
  if (Array.isArray(v))           return v.map(serialize)
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = serialize(val)
    return out
  }
  return v
}

function deserialize(v: unknown): unknown {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const obj = v as Record<string, unknown>
    if (obj.__t === 'ab') return b64dec(obj.d as string).buffer
    if (obj.__t === 'u8') return b64dec(obj.d as string)
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(obj)) out[k] = deserialize(val)
    return out
  }
  if (Array.isArray(v)) return v.map(deserialize)
  return v
}

interface StoreSchema { keyPath: string | string[] | null; autoIncrement: boolean }
interface StoreEntry  { key: IDBValidKey; value: unknown }
interface DBBackup    { schema: Record<string, StoreSchema>; stores: Record<string, StoreEntry[]> }

function exportDB(name: string): Promise<DBBackup> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const db = req.result
      const names = [...db.objectStoreNames]
      const schema: Record<string, StoreSchema> = {}
      const stores: Record<string, StoreEntry[]> = {}

      if (!names.length) { db.close(); resolve({ schema, stores }); return }

      const tx = db.transaction(names, 'readonly')
      for (const n of names) {
        const s = tx.objectStore(n)
        schema[n] = { keyPath: s.keyPath, autoIncrement: s.autoIncrement }
        stores[n] = []
        s.openCursor().onsuccess = function () {
          const c = this.result
          if (c) { stores[n].push({ key: c.key, value: serialize(c.value) }); c.continue() }
        }
      }
      tx.oncomplete = () => { db.close(); resolve({ schema, stores }) }
      tx.onerror   = () => { db.close(); reject(tx.error) }
    }
  })
}

function importDB(name: string, backup: DBBackup): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check current version so we can bump it if we need new stores
    const check = indexedDB.open(name)
    check.onerror = () => reject(check.error)
    check.onsuccess = () => {
      const existing = new Set([...check.result.objectStoreNames])
      const ver = check.result.version
      const needsUpgrade = Object.keys(backup.schema).some(s => !existing.has(s))
      check.result.close()

      const req = indexedDB.open(name, needsUpgrade ? ver + 1 : ver)
      req.onupgradeneeded = e => {
        const db2 = (e.target as IDBOpenDBRequest).result
        for (const [sn, { keyPath, autoIncrement }] of Object.entries(backup.schema)) {
          if (!db2.objectStoreNames.contains(sn))
            db2.createObjectStore(sn, { keyPath: keyPath ?? undefined, autoIncrement })
        }
      }
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db2 = req.result
        const toWrite = Object.keys(backup.stores).filter(s => db2.objectStoreNames.contains(s))
        if (!toWrite.length) { db2.close(); resolve(); return }

        const tx = db2.transaction(toWrite, 'readwrite')
        for (const sn of toWrite) {
          const s = tx.objectStore(sn)
          s.clear()
          for (const { key, value } of backup.stores[sn]) {
            const v = deserialize(value)
            s.keyPath ? s.put(v) : s.put(v, key)
          }
        }
        tx.oncomplete = () => { db2.close(); resolve() }
        tx.onerror   = () => { db2.close(); reject(tx.error) }
      }
    }
  })
}

export interface WOSBackup {
  version: 2
  date: string
  localStorage: Record<string, string>
  cookies: string
  indexedDB: Record<string, DBBackup>
}

export async function exportBackup(): Promise<WOSBackup> {
  const storage: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!
    storage[k] = localStorage.getItem(k)!
  }

  const idb: Record<string, DBBackup> = {}
  try {
    const dbs = await indexedDB.databases()
    await Promise.all(dbs.map(async ({ name }) => {
      if (!name) return
      try { idb[name] = await exportDB(name) }
      catch (e) { console.warn(`IDB export skipped for "${name}":`, e) }
    }))
  } catch {
    // indexedDB.databases() not supported — skip
  }

  return {
    version: 2,
    date: new Date().toISOString(),
    localStorage: storage,
    cookies: document.cookie,
    indexedDB: idb,
  }
}

export async function importBackup(backup: WOSBackup): Promise<void> {
  localStorage.clear()
  for (const [k, v] of Object.entries(backup.localStorage))
    localStorage.setItem(k, v)

  if (backup.cookies) {
    for (const pair of backup.cookies.split(';')) {
      const eq = pair.indexOf('=')
      if (eq < 1) continue
      const name = pair.slice(0, eq).trim()
      const val  = pair.slice(eq + 1).trim()
      document.cookie = `${name}=${val}; path=/; max-age=31536000`
    }
  }

  if (backup.indexedDB) {
    await Promise.all(
      Object.entries(backup.indexedDB).map(([name, db]) =>
        importDB(name, db).catch(e => console.warn(`IDB import skipped for "${name}":`, e))
      )
    )
  }
}
