import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loadSettings,
  normalizeBaseUrl,
  saveSettings,
  type Settings,
} from './settings'

type SettingsContextValue = {
  settings: Settings
  /** Persists to localStorage and updates the in-memory copy. */
  save: (next: Settings) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  const save = useCallback((next: Settings) => {
    const cleaned: Settings = {
      ...next,
      apiBaseUrl: normalizeBaseUrl(next.apiBaseUrl),
      apiKey: next.apiKey.trim(),
      model: next.model.trim(),
    }
    saveSettings(cleaned)
    setSettings(cleaned)
  }, [])

  const value = useMemo(() => ({ settings, save }), [settings, save])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}
