import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ProductSummary } from '../api/openfoodfacts'

/** The question currently being (or about to be) sent to the LLM. */
export type PendingRequest = {
  /** Full prompt: settings.customPrompt + "\n" + food description. */
  prompt: string
  /** Short label for the Result page header, e.g. the typed food name. */
  label: string
  /** Present only when the request came from a barcode scan. */
  product: ProductSummary | null
}

type AppStateValue = {
  /** Home textarea content, preserved across navigation. */
  draft: string
  setDraft: (text: string) => void
  request: PendingRequest | null
  setRequest: (req: PendingRequest) => void
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState('')
  const [request, setRequestState] = useState<PendingRequest | null>(null)

  const setRequest = useCallback((req: PendingRequest) => setRequestState(req), [])

  const value = useMemo(
    () => ({ draft, setDraft, request, setRequest }),
    [draft, request, setRequest],
  )
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>')
  return ctx
}
