import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { InstallButton } from '../../components/InstallButton'
import { useSettings } from '../../settings/useSettings'
import { buildPrompt, isConfigured } from '../../settings/settings'
import { useAppState } from '../../state/AppState'

export default function HomePage() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { draft, setDraft, setRequest } = useAppState()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const location = useLocation()

  // The scan flow sends the user here with `focusInput` when a barcode had no
  // match and they chose to type the product name instead.
  const focusInput = (location.state as { focusInput?: boolean } | null)?.focusInput
  useEffect(() => {
    if (focusInput) textareaRef.current?.focus()
  }, [focusInput])

  const configured = isConfigured(settings)
  const canAsk = configured && draft.trim().length > 0

  function ask() {
    const food = draft.trim()
    if (!canAsk) return
    setRequest({
      prompt: buildPrompt(settings, food),
      label: food,
      product: null,
    })
    navigate('/result')
  }

  return (
    <div className="page">
      <AppHeader title="Nutrinfo" showSettings brand />

      <main className="page__body">
        {configured ? null : (
          <div className="notice" role="status">
            <p>
              No API URL or key configured yet. Add them in{' '}
              <Link to="/settings">Settings</Link> to start asking questions.
            </p>
          </div>
        )}

        <label className="field">
          <span className="field__label">What food do you want to check?</span>
          <textarea
            ref={textareaRef}
            className="field__input field__input--area"
            name="food"
            placeholder="Peanut butter"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoCapitalize="sentences"
          />
        </label>

        <div className="actions">
          <button
            type="button"
            className="button button--primary"
            onClick={ask}
            disabled={!canAsk}
          >
            Ask
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => navigate('/scan')}
            disabled={!configured}
          >
            Scan product
          </button>
        </div>
      </main>
      <InstallButton />
    </div>
  )
}
