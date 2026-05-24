export type AppId = 'browser' | 'games' | 'music' | 'settings' | 'files' | 'discover' | 'ide' | 'vscode' | 'eaglercraft' | 'gamesfolder' | 'codefolder' | 'game' | 'notepad' | 'paint' | 'htmlpreview'

export interface AppMeta {
  id: AppId
  label: string
}

export interface WindowState {
  id: string
  appId: AppId
  title: string
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  maximized: boolean
  focused: boolean
  zIndex: number
  gameUrl?: string
  filePath?: string
  initialPath?: string
}

export interface SaveState {
  wallpaper: string
  theme: 'light' | 'dark'
  accentColor: string
  musicQueue: MusicTrack[]
  musicVolume: number
  version: number
}

export interface MusicTrack {
  id: string          // YouTube video ID
  title: string
  artist: string
  thumbnail: string
}

export interface GameEntry {
  id: string
  title: string
  url: string
  icon: string
}

export interface StoreApp {
  id: string
  title: string
  description: string
  category: 'games' | 'tools' | 'media'
  icon: string
  rating: number
  installs: string
  featured?: boolean
  builtin?: boolean
  appId?: AppId
  url?: string
}

export interface AppRequest {
  id: string
  name: string
  url: string
  category: string
  description: string
  submittedAt: string
}
