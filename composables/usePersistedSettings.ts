export type BBMPSettings = {
  theme: 'purple' | 'blue' | 'neon' | 'contrast'
  font: 'system' | 'inter' | 'jetbrains'
  devmode: boolean
  server: string
  port: number
  rport: number
  customUrl: string
  javaPath: string
  alwaysOnTop: boolean
}

const KEY = 'bbmp.settings.v1'

export function loadSettings(): Partial<BBMPSettings> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveSettings(settings: Partial<BBMPSettings>) {
  if (typeof window === 'undefined') return
  try {
    const existing = loadSettings()
    const merged = { ...existing, ...settings }
    localStorage.setItem(KEY, JSON.stringify(merged))
  } catch {}
}