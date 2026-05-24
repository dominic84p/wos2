import { writable, derived, get } from 'svelte/store'
import type { MusicTrack } from '../types'
import { settings } from './settings'

interface MusicState {
  queue: MusicTrack[]
  currentIndex: number
  playing: boolean
  volume: number
  shuffle: boolean
  repeat: 'off' | 'one' | 'all'
}

function createMusicStore() {
  const saved = get(settings)
  const initial: MusicState = {
    queue: saved.musicQueue ?? [],
    currentIndex: 0,
    playing: false,
    volume: saved.musicVolume ?? 0.7,
    shuffle: false,
    repeat: 'off',
  }

  const { subscribe, update } = writable<MusicState>(initial)

  function persist(state: MusicState) {
    settings.patch({ musicQueue: state.queue, musicVolume: state.volume })
  }

  return {
    subscribe,

    addTrack(track: MusicTrack) {
      update(s => {
        const next = { ...s, queue: [...s.queue, track] }
        persist(next)
        return next
      })
    },

    removeTrack(id: string) {
      update(s => {
        const next = { ...s, queue: s.queue.filter(t => t.id !== id) }
        persist(next)
        return next
      })
    },

    play(index?: number) {
      update(s => ({ ...s, playing: true, currentIndex: index ?? s.currentIndex }))
    },

    pause() {
      update(s => ({ ...s, playing: false }))
    },

    next() {
      update(s => {
        if (s.queue.length === 0) return s
        const next = (s.currentIndex + 1) % s.queue.length
        return { ...s, currentIndex: next, playing: true }
      })
    },

    prev() {
      update(s => {
        if (s.queue.length === 0) return s
        const prev = (s.currentIndex - 1 + s.queue.length) % s.queue.length
        return { ...s, currentIndex: prev, playing: true }
      })
    },

    setVolume(v: number) {
      update(s => {
        const next = { ...s, volume: Math.max(0, Math.min(1, v)) }
        persist(next)
        return next
      })
    },

    toggleShuffle() {
      update(s => ({ ...s, shuffle: !s.shuffle }))
    },

    cycleRepeat() {
      update(s => {
        const modes: MusicState['repeat'][] = ['off', 'one', 'all']
        const idx = modes.indexOf(s.repeat)
        return { ...s, repeat: modes[(idx + 1) % modes.length] }
      })
    },
  }
}

export const music = createMusicStore()

export const currentTrack = derived(music, $m =>
  $m.queue[$m.currentIndex] ?? null
)
