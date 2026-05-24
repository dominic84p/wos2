import { writable } from 'svelte/store'

export const bricked = writable(!!localStorage.getItem('wos_bricked'))

export function brickSystem() {
  localStorage.setItem('wos_bricked', '1')
  bricked.set(true)
}

export function restoreSystem() {
  localStorage.removeItem('wos_bricked')
  bricked.set(false)
}
