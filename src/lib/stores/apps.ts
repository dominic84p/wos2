import { writable } from 'svelte/store'
import type { AppRequest } from '../types'

const INSTALLED_KEY = 'wos_installed_games'
const REQUESTS_KEY = 'wos_app_requests'

function loadInstalled(): Set<string> {
  try {
    const raw = localStorage.getItem(INSTALLED_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function loadRequests(): AppRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function createAppsStore() {
  const { subscribe, update } = writable<Set<string>>(loadInstalled())

  return {
    subscribe,
    install(id: string) {
      update(s => {
        const next = new Set(s)
        next.add(id)
        localStorage.setItem(INSTALLED_KEY, JSON.stringify([...next]))
        return next
      })
    },
    uninstall(id: string) {
      update(s => {
        const next = new Set(s)
        next.delete(id)
        localStorage.setItem(INSTALLED_KEY, JSON.stringify([...next]))
        return next
      })
    },
    isInstalled(id: string, set: Set<string>) {
      return set.has(id)
    },
  }
}

function createRequestsStore() {
  const { subscribe, update } = writable<AppRequest[]>(loadRequests())

  return {
    subscribe,
    add(req: Omit<AppRequest, 'id' | 'submittedAt'>) {
      const full: AppRequest = {
        ...req,
        id: `req_${Date.now()}`,
        submittedAt: new Date().toISOString(),
      }
      update(reqs => {
        const next = [...reqs, full]
        localStorage.setItem(REQUESTS_KEY, JSON.stringify(next))
        return next
      })
      return full
    },
  }
}

export const installedApps = createAppsStore()
export const appRequests = createRequestsStore()
