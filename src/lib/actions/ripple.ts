export function ripple(node: HTMLElement) {
  node.style.position = 'relative'
  node.style.overflow = 'hidden'

  function handlePointerDown(e: PointerEvent) {
    const rect = node.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const el = document.createElement('span')
    el.className = 'ripple-wave'
    el.style.left = x + 'px'
    el.style.top = y + 'px'
    node.appendChild(el)
    el.addEventListener('animationend', () => el.remove(), { once: true })
  }

  node.addEventListener('pointerdown', handlePointerDown)
  return {
    destroy() {
      node.removeEventListener('pointerdown', handlePointerDown)
    },
  }
}
