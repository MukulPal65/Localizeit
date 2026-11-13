/** Clear local browser state and reload the live-data experience. */
export function resetDemoData(): void {
  if (typeof window === 'undefined') return
  const keys: string[] = []
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i)
    if (key && key.startsWith('lz-')) keys.push(key)
  }
  keys.forEach((key) => window.localStorage.removeItem(key))
  window.location.href = '/'
  window.location.reload()
}
