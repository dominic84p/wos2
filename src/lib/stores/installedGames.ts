import { writable, get } from 'svelte/store'
import { localfs } from './localfs'
import { RAW_BASE_URL, type StoreGame } from '../data/gameRegistry'

export interface DownloadProgress {
  [filename: string]: number // 0-100 or -1 (unknown)
}

function openGamesDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('wos_installed_games_db', 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('games')) {
        req.result.createObjectStore('games')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveGameToIDB(filename: string, blob: Blob) {
  const db = await openGamesDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('games', 'readwrite')
    tx.objectStore('games').put(blob, filename)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getGameFromIDB(filename: string): Promise<Blob | null> {
  try {
    const db = await openGamesDB()
    return new Promise<Blob | null>((resolve) => {
      const tx = db.transaction('games', 'readonly')
      const req = tx.objectStore('games').get(filename)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function listIDBGames(): Promise<string[]> {
  try {
    const db = await openGamesDB()
    return new Promise<string[]>((resolve) => {
      const tx = db.transaction('games', 'readonly')
      const req = tx.objectStore('games').getAllKeys()
      req.onsuccess = () => resolve((req.result as string[]) || [])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

// Stores
export const installedGamesSet = writable<Set<string>>(new Set())
export const downloadProgress = writable<DownloadProgress>({})
const blobUrls = new Map<string, string>()

function getSavedInstalledList(): string[] {
  try {
    const raw = localStorage.getItem('wos_installed_games_list')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveInstalledList(list: string[]) {
  try {
    localStorage.setItem('wos_installed_games_list', JSON.stringify(list))
  } catch {}
}

export async function refreshInstalledGames() {
  const set = new Set<string>()

  // 1. Initial immediate fast load from localStorage
  const saved = getSavedInstalledList()
  for (const s of saved) set.add(s)

  // 2. Check IndexedDB
  const idbKeys = await listIDBGames()
  for (const k of idbKeys) set.add(k)

  // 3. Check mounted localfs
  const state = get(localfs)
  if (state.isMounted && state.rootHandle) {
    try {
      const gamesEntries = await localfs.listDir('/wos-games')
      for (const e of gamesEntries) {
        if (e.kind === 'file') set.add(e.name)
      }
    } catch {}
  }

  saveInstalledList(Array.from(set))
  installedGamesSet.set(set)
}

// React whenever localfs finishes mounting or updates its entries
if (typeof window !== 'undefined') {
  localfs.subscribe(() => {
    refreshInstalledGames()
  })
}

export async function getPlayableGameUrl(filename: string, isBuiltin?: boolean): Promise<string> {
  if (isBuiltin) {
    return `/games/${filename}`
  }

  // Service Worker provides a real origin HTTP endpoint for the game stored in IndexedDB:
  // e.g. http://localhost:5173/wos-game-blob/filename.html
  // This prevents the "Invalid base URL" error that happens when Unity/WebAssembly games try to spawn web workers from blob: URLs
  return `/wos-game-blob/${encodeURIComponent(filename)}`
}

export async function downloadStoreGame(game: StoreGame): Promise<boolean> {
  const filename = game.filename
  downloadProgress.update(p => ({ ...p, [filename]: 1 }))

  try {
    const url = RAW_BASE_URL + filename
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP error ${res.status}`)

    const contentLength = Number(res.headers.get('content-length') || 0)
    let blob: Blob

    if (res.body && contentLength > 0) {
      const reader = res.body.getReader()
      const chunks: Uint8Array[] = []
      let received = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          received += value.length
          const pct = Math.min(99, Math.round((received / contentLength) * 100))
          downloadProgress.update(p => ({ ...p, [filename]: pct }))
        }
      }
      blob = new Blob(chunks, { type: 'text/html' })
    } else {
      blob = await res.blob()
    }

    // Save to mounted localfs if available
    const state = get(localfs)
    if (state.isMounted && state.rootHandle) {
      try {
        await localfs.mkdir('/wos-games')
        await localfs.writeBlob(`/wos-games/${filename}`, blob)
      } catch (e) {
        console.warn('Could not write to mounted folder, falling back to IndexedDB:', e)
        await saveGameToIDB(filename, blob)
      }
    } else {
      await saveGameToIDB(filename, blob)
    }

    downloadProgress.update(p => {
      const next = { ...p }
      delete next[filename]
      return next
    })

    await refreshInstalledGames()
    return true
  } catch (err) {
    console.error(`Failed to download game ${filename}:`, err)
    downloadProgress.update(p => {
      const next = { ...p }
      delete next[filename]
      return next
    })
    alert(`Failed to download ${game.name}. Please check your connection and try again.`)
    return false
  }
}

// Backward-compatible compound object
export const installedGames = {
  subscribe: installedGamesSet.subscribe,
  refresh: refreshInstalledGames,
  getPlayableUrl: getPlayableGameUrl,
  downloadGame: downloadStoreGame
}

if (typeof window !== 'undefined') {
  refreshInstalledGames()
}
