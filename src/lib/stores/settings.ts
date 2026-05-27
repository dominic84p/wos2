import { writable } from 'svelte/store'
import type { SaveState } from '../types'

const SAVE_KEY = 'wos_save'
const CURRENT_VERSION = 1

const defaults: SaveState = {
  wallpaper: '/wallpapers/win11-default.jpg',
  themeId: 'default',
  accentColor: '#3584e4',
  musicQueue: [],
  musicVolume: 0.7,
  willMode: false,
  taskbarEdge: 'bottom',
  version: CURRENT_VERSION,
}

function loadSave(): SaveState {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as Partial<SaveState>
    return { ...defaults, ...parsed, version: CURRENT_VERSION }
  } catch {
    return { ...defaults }
  }
}

function createSettingsStore() {
  const { subscribe, set, update } = writable<SaveState>(loadSave())

  return {
    subscribe,
    update,
    set(value: SaveState) {
      set(value)
      localStorage.setItem(SAVE_KEY, JSON.stringify(value))
    },
    patch(partial: Partial<SaveState>) {
      update(s => {
        const next = { ...s, ...partial }
        localStorage.setItem(SAVE_KEY, JSON.stringify(next))
        return next
      })
    },
    exportSave(): string {
      return localStorage.getItem(SAVE_KEY) ?? JSON.stringify(defaults)
    },
    importSave(json: string) {
      try {
        const parsed = JSON.parse(json) as Partial<SaveState>
        const next = { ...defaults, ...parsed, version: CURRENT_VERSION }
        set(next)
        localStorage.setItem(SAVE_KEY, JSON.stringify(next))
        return true
      } catch {
        return false
      }
    },
    reset() {
      set({ ...defaults })
      localStorage.setItem(SAVE_KEY, JSON.stringify(defaults))
    },
  }
}

export const settings = createSettingsStore()
