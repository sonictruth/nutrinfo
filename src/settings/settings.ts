import { DEFAULT_CONDITION, DEFAULT_PROMPT } from './defaultPrompt'

export type Settings = {
  customPrompt: string
  /** Substituted for every `[Condition]` placeholder in customPrompt. */
  condition: string
  apiBaseUrl: string
  apiKey: string
  model: string
}

export const DEFAULT_SETTINGS: Settings = {
  customPrompt: DEFAULT_PROMPT,
  condition: DEFAULT_CONDITION,
  apiBaseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-6-astra',
}

const STORAGE_KEY = 'nutrinfo.settings.v1'

/** Removes trailing slashes so `${base}/chat/completions` is always well formed. */
export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

/**
 * Fills `[Condition]` and `[FOOD]` in the prompt template. Templates without a
 * `[FOOD]` placeholder (e.g. saved before it existed) get the food appended.
 */
export function buildPrompt(s: Settings, food: string): string {
  const withCondition = s.customPrompt.split('[Condition]').join(s.condition.trim())
  return withCondition.includes('[FOOD]')
    ? withCondition.split('[FOOD]').join(food)
    : `${withCondition}\n${food}`
}

export function isConfigured(s: Settings): boolean {
  return s.apiBaseUrl.trim() !== '' && s.apiKey.trim() !== '' && s.model.trim() !== ''
}

/**
 * localStorage can throw (Safari private mode, blocked site data), so every
 * access is guarded and falls back to the defaults.
 */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      customPrompt:
        typeof parsed.customPrompt === 'string'
          ? parsed.customPrompt
          : DEFAULT_SETTINGS.customPrompt,
      condition:
        typeof parsed.condition === 'string'
          ? parsed.condition
          : DEFAULT_SETTINGS.condition,
      apiBaseUrl:
        typeof parsed.apiBaseUrl === 'string'
          ? parsed.apiBaseUrl
          : DEFAULT_SETTINGS.apiBaseUrl,
      apiKey:
        typeof parsed.apiKey === 'string' ? parsed.apiKey : DEFAULT_SETTINGS.apiKey,
      model: typeof parsed.model === 'string' && parsed.model.trim() !== ''
        ? parsed.model
        : DEFAULT_SETTINGS.model,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // Storage unavailable: settings stay in memory for this session only.
  }
}
