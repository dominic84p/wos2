import { writable, get } from 'svelte/store'
import { vfs, DEFAULTS, setRootMountSync } from './filesystem'

export interface LocalEntry {
  name: string
  path: string // relative path from root mount, e.g. "/subfolder/file.txt"
  kind: 'file' | 'directory'
  handle?: FileSystemHandle
}

export interface LocalFSState {
  isSupported: boolean
  isMounted: boolean
  isRootMounted: boolean
  dirName: string | null
  rootHandle: FileSystemDirectoryHandle | null
  entries: LocalEntry[]
  mode: 'native' | 'fallback'
  needsPermission: boolean
}

const initialState: LocalFSState = {
  isSupported: typeof window !== 'undefined',
  isMounted: false,
  isRootMounted: false,
  dirName: null,
  rootHandle: null,
  entries: [],
  mode: 'native',
  needsPermission: false
}

// ── IndexedDB Handle Persistence ──────────────────────────────
function openLocalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('wos_handles_db', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('handles')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveHandleToIDB(handle: FileSystemDirectoryHandle, isRootMounted = false) {
  try {
    const db = await openLocalDB()
    const tx = db.transaction('handles', 'readwrite')
    tx.objectStore('handles').put({ handle, isRootMounted }, 'mounted_root')
  } catch (e) {
    console.warn('IDB save handle error:', e)
  }
}

async function getHandleFromIDB(): Promise<{ handle: FileSystemDirectoryHandle; isRootMounted: boolean } | null> {
  try {
    const db = await openLocalDB()
    return new Promise((resolve) => {
      const tx = db.transaction('handles', 'readonly')
      const req = tx.objectStore('handles').get('mounted_root')
      req.onsuccess = () => {
        const res = req.result
        if (!res) resolve(null)
        else if (res.handle) resolve(res)
        else resolve({ handle: res, isRootMounted: false })
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function clearHandleFromIDB() {
  try {
    const db = await openLocalDB()
    const tx = db.transaction('handles', 'readwrite')
    tx.objectStore('handles').delete('mounted_root')
  } catch {}
}

async function autoApplyHostSettings(handle: FileSystemDirectoryHandle) {
  try {
    let settingsText = ''
    try {
      const etcHandle = await handle.getDirectoryHandle('etc', { create: false })
      const settingsFile = await etcHandle.getFileHandle('settings.json', { create: false })
      const file = await settingsFile.getFile()
      settingsText = await file.text()
    } catch {
      try {
        const settingsFile = await handle.getFileHandle('settings.json', { create: false })
        const file = await settingsFile.getFile()
        settingsText = await file.text()
      } catch {}
    }

    if (settingsText) {
      const parsed = JSON.parse(settingsText)
      if (parsed.customNames && typeof parsed.customNames === 'object') {
        const { customNames } = await import('./filesystem')
        for (const [id, val] of Object.entries(parsed.customNames)) {
          customNames.rename(id, String(val))
        }
      }
    }
  } catch {}
}

async function writeDiskPlaceholders(handle: FileSystemDirectoryHandle, isRoot: boolean) {
  try {
    let desktopHandle: FileSystemDirectoryHandle
    if (isRoot) {
      desktopHandle = await handle.getDirectoryHandle('Desktop', { create: true })
    } else {
      try {
        desktopHandle = await handle.getDirectoryHandle('Desktop', { create: false })
      } catch {
        desktopHandle = handle
      }
    }

    const defaultApps = [
      { name: 'Browser.wosa', appId: 'browser', title: 'Browser', icon: 'browser' },
      { name: 'Files.wosa', appId: 'files', title: 'Files', icon: 'files' },
      { name: 'Notepad.wosa', appId: 'notepad', title: 'Notepad', icon: 'notepad' },
      { name: 'Terminal.wosa', appId: 'terminal', title: 'Terminal', icon: 'terminal' },
      { name: 'Paint.wosa', appId: 'paint', title: 'Paint', icon: 'paint' },
      { name: 'Settings.wosa', appId: 'settings', title: 'Settings', icon: 'settings' },
      { name: 'Music.wosa', appId: 'music', title: 'Music', icon: 'music' },
      { name: 'App Store.wosa', appId: 'discover', title: 'App Store', icon: 'discover' },
      { name: 'Code.wosa', appId: 'codefolder', title: 'Code', icon: 'codefolder' },
      { name: 'Homework.wosa', appId: 'gamesfolder', title: 'Homework', icon: 'gamesfolder' },
      { name: 'DogeGage Chat.wosa', appId: 'dogegagechat', title: 'DogeGage Chat', icon: 'dogegagechat' },
      { name: 'Media Player.wosa', appId: 'mediaplayer', title: 'Media Player', icon: 'mediaplayer' },
    ]

    for (const app of defaultApps) {
      try {
        let exists = false
        try {
          await desktopHandle.getFileHandle(app.name, { create: false })
          exists = true
        } catch {}

        if (!exists) {
          const fileHandle = await desktopHandle.getFileHandle(app.name, { create: true })
          // @ts-ignore
          const writable = await fileHandle.createWritable()
          const data = JSON.stringify({
            type: 'wosa_app',
            version: '1.0',
            appId: app.appId,
            title: app.title,
            icon: app.icon
          }, null, 2)
          await writable.write(data)
          await writable.close()
        }
      } catch (err) {
        console.warn(`Failed to write placeholder ${app.name} to disk:`, err)
      }
    }

    // In games folder, write wosgamearchive.wosa
    try {
      let gamesHandle: FileSystemDirectoryHandle | null = null
      if (isRoot) {
        gamesHandle = await handle.getDirectoryHandle('Games', { create: true })
      } else {
        try {
          gamesHandle = await handle.getDirectoryHandle('Games', { create: false })
        } catch {
          if (handle.name.toLowerCase() === 'games') gamesHandle = handle
        }
      }

      if (gamesHandle) {
        let exists = false
        try {
          await gamesHandle.getFileHandle('wosgamearchive.wosa', { create: false })
          exists = true
        } catch {}

        if (!exists) {
          const fileHandle = await gamesHandle.getFileHandle('wosgamearchive.wosa', { create: true })
          // @ts-ignore
          const writable = await fileHandle.createWritable()
          const data = JSON.stringify({
            type: 'wosa_archive',
            version: '1.0',
            appId: 'gamesfolder',
            title: 'WOS Game Archive',
            description: 'WOS Game Archive Storage'
          }, null, 2)
          await writable.write(data)
          await writable.close()
        }
      }
    } catch (err) {
      console.warn('Failed to write wosgamearchive.wosa to disk:', err)
    }
  } catch (e) {
    console.warn('Error in writeDiskPlaceholders:', e)
  }
}

function createLocalFSStore() {
  const store = writable<LocalFSState>(initialState)
  let pollInterval: ReturnType<typeof setInterval> | null = null

  async function refreshEntries(handle: FileSystemDirectoryHandle, basePath = '') {
    const list: LocalEntry[] = []
    try {
      // @ts-ignore - Async iterator on directory handle
      for await (const [name, entry] of handle.entries()) {
        const itemPath = basePath ? `${basePath}/${name}` : `/${name}`
        list.push({
          name,
          path: itemPath,
          kind: entry.kind === 'directory' ? 'directory' : 'file',
          handle: entry
        })
      }
    } catch (e) {
      console.error('Failed to list local directory:', e)
    }
    list.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return list
  }

  async function resolveDirectory(subpath: string): Promise<FileSystemDirectoryHandle | null> {
    const state = get(store)
    if (!state.rootHandle) return null
    const parts = subpath.split('/').filter(Boolean)
    let current = state.rootHandle
    for (const part of parts) {
      try {
        current = await current.getDirectoryHandle(part, { create: false })
      } catch {
        return null
      }
    }
    return current
  }

  async function resolveWritableDirectory(subpath: string): Promise<FileSystemDirectoryHandle | null> {
    const state = get(store)
    if (!state.rootHandle) return null
    const parts = subpath.split('/').filter(Boolean)
    let current = state.rootHandle
    try {
      for (const part of parts) {
        current = await current.getDirectoryHandle(part, { create: true })
      }
      return current
    } catch (e) {
      console.error(`Could not create destination directory ${subpath}:`, e)
      return null
    }
  }

  async function syncHostRootToVFS(rootHandle: FileSystemDirectoryHandle) {
    try {
      const files: Record<string, { content: string }> = { ...DEFAULTS.files }
      const dirsSet = new Set<string>(DEFAULTS.dirs)

      async function walk(handle: FileSystemDirectoryHandle, currentPath: string) {
        // @ts-ignore
        for await (const [name, entry] of handle.entries()) {
          if (name === 'node_modules' || name === '.git' || name === '.svelte-kit' || name === 'dist' || name === '.next') continue
          const itemPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`
          if (entry.kind === 'directory') {
            dirsSet.add(itemPath)
            await walk(entry as FileSystemDirectoryHandle, itemPath)
          } else if (entry.kind === 'file') {
            try {
              const file = await (entry as FileSystemFileHandle).getFile()
              if (file.size < 5 * 1024 * 1024) {
                const text = await file.text()
                files[itemPath] = { content: text }
              } else {
                files[itemPath] = { content: `[Binary File: ${file.name} (${file.size} bytes)]` }
              }
            } catch (e) {
              console.warn(`Could not read file ${itemPath} from host:`, e)
            }
          }
        }
      }

      await walk(rootHandle, '/')
      const dirs = Array.from(dirsSet)

      const currentVFS = get(vfs)
      const fileKeysCurrent = Object.keys(currentVFS.files)
      const fileKeysNew = Object.keys(files)

      let changed = fileKeysCurrent.length !== fileKeysNew.length || dirs.length !== currentVFS.dirs.length
      if (!changed) {
        for (const k of fileKeysNew) {
          if (!currentVFS.files[k] || currentVFS.files[k].content !== files[k].content) {
            changed = true
            break
          }
        }
      }

      if (changed) {
        vfs.setRawState({ files, dirs })
      }
    } catch (e) {
      console.error('syncHostRootToVFS error:', e)
    }
  }

  function startLivePolling() {
    if (pollInterval) clearInterval(pollInterval)
    pollInterval = setInterval(async () => {
      const state = get(store)
      if (state.isMounted && state.rootHandle && !state.needsPermission) {
        try {
          const entries = await refreshEntries(state.rootHandle)
          store.update(s => ({ ...s, entries }))
          if (state.isRootMounted) {
            await syncHostRootToVFS(state.rootHandle)
          }
        } catch {}
      }
    }, 1500)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', async () => {
      const state = get(store)
      if (state.isMounted && state.rootHandle && !state.needsPermission) {
        try {
          const entries = await refreshEntries(state.rootHandle)
          store.update(s => ({ ...s, entries }))
          if (state.isRootMounted) {
            await syncHostRootToVFS(state.rootHandle)
          }
        } catch {}
      }
    })
  }

  store.subscribe(state => {
    if (state.isMounted && state.isRootMounted) {
      setRootMountSync(true, (op, path, contentOrTarget) => {
        if (op === 'write' && contentOrTarget !== undefined) {
          localfs.writeFile(path, contentOrTarget)
        } else if (op === 'delete' || op === 'rmdir') {
          localfs.remove(path)
        } else if (op === 'mkdir') {
          localfs.mkdir(path)
        }
      })
    } else {
      setRootMountSync(false)
    }
  })

  return {
    subscribe: store.subscribe,

    async init() {
      if (typeof window === 'undefined') return
      const res = await getHandleFromIDB()
      if (!res) return
      const { handle, isRootMounted } = res

      try {
        // @ts-ignore
        const perm = await handle.queryPermission({ mode: 'readwrite' })
        if (perm === 'granted') {
          if (isRootMounted) {
            await autoApplyHostSettings(handle)
            await syncHostRootToVFS(handle)
          }
          const entries = await refreshEntries(handle)
          store.set({
            isSupported: true,
            isMounted: true,
            isRootMounted,
            dirName: handle.name,
            rootHandle: handle,
            entries,
            mode: 'native',
            needsPermission: false
          })
          startLivePolling()
        } else {
          store.set({
            isSupported: true,
            isMounted: true,
            isRootMounted,
            dirName: handle.name,
            rootHandle: handle,
            entries: [],
            mode: 'native',
            needsPermission: true
          })
        }
      } catch (e) {
        console.warn('Could not restore saved directory handle:', e)
      }
    },

    async requestSavedPermission() {
      const state = get(store)
      if (!state.rootHandle) return false
      try {
        // @ts-ignore
        const perm = await state.rootHandle.requestPermission({ mode: 'readwrite' })
        if (perm === 'granted') {
          if (state.isRootMounted) {
            await autoApplyHostSettings(state.rootHandle)
            await syncHostRootToVFS(state.rootHandle)
          }
          const entries = await refreshEntries(state.rootHandle)
          store.set({
            isSupported: true,
            isMounted: true,
            isRootMounted: state.isRootMounted,
            dirName: state.rootHandle.name,
            rootHandle: state.rootHandle,
            entries,
            mode: 'native',
            needsPermission: false
          })
          startLivePolling()
          return true
        }
      } catch (e) {
        console.error('Permission request error:', e)
      }
      return false
    },

    async mount() {
      const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent)
      if (isFirefox || !('showDirectoryPicker' in window)) {
        alert("FUck you firefox dont support this use chrome or something")
      }

      if ('showDirectoryPicker' in window && window.isSecureContext) {
        try {
          // @ts-ignore
          const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
          await writeDiskPlaceholders(handle, false)
          await saveHandleToIDB(handle, false)
          const entries = await refreshEntries(handle)
          store.set({
            isSupported: true,
            isMounted: true,
            isRootMounted: false,
            dirName: handle.name,
            rootHandle: handle,
            entries,
            mode: 'native',
            needsPermission: false
          })
          startLivePolling()
          return true
        } catch (err: any) {
          if (err.name === 'AbortError') return false
          console.warn('Native picker warning/error, switching to folder importer:', err)
        }
      }

      return new Promise<boolean>((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        // @ts-ignore
        input.webkitdirectory = true
        input.onchange = async () => {
          const files = Array.from(input.files ?? [])
          if (!files.length) { resolve(false); return }

          const firstPath = files[0].webkitRelativePath
          const rootFolder = firstPath.split('/')[0] || 'ImportedFolder'

          vfs.mkdir(`/${rootFolder}`)
          for (const f of files) {
            const relPath = '/' + f.webkitRelativePath
            const text = await f.text()
            vfs.writeFile(relPath, text)
          }

          store.set({
            isSupported: true,
            isMounted: true,
            isRootMounted: false,
            dirName: rootFolder,
            rootHandle: null,
            entries: [],
            mode: 'fallback',
            needsPermission: false
          })

          alert(`Successfully imported folder "${rootFolder}" (${files.length} files) into WOS Files!`)
          resolve(true)
        }
        input.click()
      })
    },

    async mountAsRoot() {
      const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent)
      if (isFirefox || !('showDirectoryPicker' in window)) {
        alert("FUck you firefox dont support this use chrome or something")
        return false
      }

      if ('showDirectoryPicker' in window && window.isSecureContext) {
        try {
          // @ts-ignore
          const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
          const subdirs = ['Desktop', 'Code', 'Documents', 'Games', 'etc']
          for (const d of subdirs) {
            try { await handle.getDirectoryHandle(d, { create: true }) } catch {}
          }

          await writeDiskPlaceholders(handle, true)
          await autoApplyHostSettings(handle)
          await syncHostRootToVFS(handle)
          await saveHandleToIDB(handle, true)
          const entries = await refreshEntries(handle)
          store.set({
            isSupported: true,
            isMounted: true,
            isRootMounted: true,
            dirName: handle.name,
            rootHandle: handle,
            entries,
            mode: 'native',
            needsPermission: false
          })
          startLivePolling()
          return true
        } catch (err: any) {
          if (err.name === 'AbortError') return false
          console.warn('Native root picker error:', err)
        }
      }
      return false
    },

    unmount() {
      if (pollInterval) clearInterval(pollInterval)
      clearHandleFromIDB()
      store.set({
        isSupported: typeof window !== 'undefined',
        isMounted: false,
        isRootMounted: false,
        dirName: null,
        rootHandle: null,
        entries: [],
        mode: 'native',
        needsPermission: false
      })
    },

    async listDir(subpath = '/'): Promise<LocalEntry[]> {
      const state = get(store)
      if (!state.rootHandle) return []
      if (subpath === '/' || !subpath) {
        const entries = await refreshEntries(state.rootHandle)
        store.update(s => ({ ...s, entries }))
        return entries
      }
      const dirHandle = await resolveDirectory(subpath)
      if (!dirHandle) return []
      return await refreshEntries(dirHandle, subpath === '/' ? '' : subpath)
    },

    async readFile(subpath: string): Promise<string> {
      const state = get(store)
      if (!state.rootHandle) return ''
      const parts = subpath.split('/').filter(Boolean)
      const filename = parts.pop()
      if (!filename) return ''
      const dirPath = '/' + parts.join('/')
      const dirHandle = await resolveDirectory(dirPath)
      if (!dirHandle) return ''
      try {
        const fileHandle = await dirHandle.getFileHandle(filename)
        const file = await fileHandle.getFile()
        return await file.text()
      } catch (e) {
        console.error(`Read error for ${subpath}:`, e)
        return ''
      }
    },

    async readBlobURL(subpath: string): Promise<string> {
      const state = get(store)
      if (!state.rootHandle) return ''
      const parts = subpath.split('/').filter(Boolean)
      const filename = parts.pop()
      if (!filename) return ''
      const dirPath = '/' + parts.join('/')
      const dirHandle = await resolveDirectory(dirPath)
      if (!dirHandle) return ''
      try {
        const fileHandle = await dirHandle.getFileHandle(filename)
        const file = await fileHandle.getFile()
        return URL.createObjectURL(file)
      } catch (e) {
        console.error(`Read Blob error for ${subpath}:`, e)
        return ''
      }
    },

    async writeFile(subpath: string, content: string): Promise<boolean> {
      const state = get(store)
      if (!state.rootHandle) return false
      const parts = subpath.split('/').filter(Boolean)
      const filename = parts.pop()
      if (!filename) return false
      const dirPath = '/' + parts.join('/')
      const dirHandle = await resolveWritableDirectory(dirPath)
      if (!dirHandle) return false
      try {
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
        // @ts-ignore
        const writable = await fileHandle.createWritable()
        await writable.write(content)
        await writable.close()
        await this.listDir(dirPath)
        return true
      } catch (e) {
        console.error(`Write error for ${subpath}:`, e)
        return false
      }
    },

    async writeBlob(subpath: string, content: Blob): Promise<boolean> {
      const state = get(store)
      if (!state.rootHandle) return false
      const parts = subpath.split('/').filter(Boolean)
      const filename = parts.pop()
      if (!filename) return false
      const dirPath = '/' + parts.join('/')
      const dirHandle = await resolveWritableDirectory(dirPath)
      if (!dirHandle) return false
      try {
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
        // @ts-ignore
        const writable = await fileHandle.createWritable()
        await writable.write(content)
        await writable.close()
        await this.listDir(dirPath)
        return true
      } catch (e) {
        console.error(`Write blob error for ${subpath}:`, e)
        return false
      }
    },

    async mkdir(subpath: string): Promise<boolean> {
      const state = get(store)
      if (!state.rootHandle) return false
      const parts = subpath.split('/').filter(Boolean)
      const folderName = parts.pop()
      if (!folderName) return false
      const dirPath = '/' + parts.join('/')
      const parentHandle = await resolveDirectory(dirPath)
      if (!parentHandle) return false
      try {
        await parentHandle.getDirectoryHandle(folderName, { create: true })
        await this.listDir(dirPath)
        return true
      } catch (e) {
        console.error(`mkdir error for ${subpath}:`, e)
        return false
      }
    },

    async remove(subpath: string): Promise<boolean> {
      const state = get(store)
      if (!state.rootHandle) return false
      const parts = subpath.split('/').filter(Boolean)
      const name = parts.pop()
      if (!name) return false
      const dirPath = '/' + parts.join('/')
      const parentHandle = await resolveDirectory(dirPath)
      if (!parentHandle) return false
      try {
        // @ts-ignore
        await parentHandle.removeEntry(name, { recursive: true })
        await this.listDir(dirPath)
        return true
      } catch (e) {
        console.error(`remove error for ${subpath}:`, e)
        return false
      }
    }
  }
}

export const localfs = createLocalFSStore()

// Auto-initialize on load
if (typeof window !== 'undefined') {
  localfs.init()
}
