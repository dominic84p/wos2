import { writable, derived } from 'svelte/store'
import type { WindowState, AppId } from '../types'

let nextId = 1
let topZ = 10

function createWindowStore() {
  const { subscribe, update } = writable<WindowState[]>([])

  return {
    subscribe,

    open(appId: AppId, title: string, opts?: Partial<WindowState>) {
      const id = `win_${nextId++}`
      const base: WindowState = {
        id,
        appId,
        title,
        x: 80 + (nextId % 6) * 24,
        y: 60 + (nextId % 6) * 24,
        width: 900,
        height: 600,
        minimized: false,
        maximized: false,
        focused: true,
        zIndex: ++topZ,
        ...opts,
      }
      update(wins => {
        // unfocus all others
        const unfocused = wins.map(w => ({ ...w, focused: false }))
        return [...unfocused, base]
      })
      return id
    },

    close(id: string) {
      update(wins => wins.filter(w => w.id !== id))
    },

    focus(id: string) {
      update(wins =>
        wins.map(w => ({
          ...w,
          focused: w.id === id,
          zIndex: w.id === id ? ++topZ : w.zIndex,
          minimized: w.id === id ? false : w.minimized,
        }))
      )
    },

    minimize(id: string) {
      update(wins => wins.map(w => (w.id === id ? { ...w, minimized: true, focused: false } : w)))
    },

    toggleMaximize(id: string) {
      update(wins => wins.map(w => (w.id === id ? { ...w, maximized: !w.maximized } : w)))
    },

    move(id: string, x: number, y: number) {
      update(wins => wins.map(w => (w.id === id ? { ...w, x, y } : w)))
    },

    resize(id: string, width: number, height: number) {
      update(wins => wins.map(w => (w.id === id ? { ...w, width, height } : w)))
    },
  }
}

export const windows = createWindowStore()

export const focusedWindow = derived(windows, $wins =>
  $wins.find(w => w.focused && !w.minimized) ?? null
)
