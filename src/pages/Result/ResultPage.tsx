import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { ErrorBox } from '../../components/ErrorBox'
import { Markdown } from '../../components/Markdown'
import { Spinner } from '../../components/Spinner'
import { askLlm } from '../../api/llm'
import { isConfigured } from '../../settings/settings'
import { useSettings } from '../../settings/useSettings'
import { useAppState } from '../../state/AppState'

export default function ResultPage() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { request } = useAppState()

  const configured = isConfigured(settings)
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Bumping this re-runs the request effect.
  const [attempt, setAttempt] = useState(0)

  // `replace` so the hardware/browser back button from Home does not return to
  // this page and re-issue the request.
  const goBack = useCallback(() => navigate('/', { replace: true }), [navigate])

  useEffect(() => {
    if (!request || !configured) return

    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setAnswer(null)

    askLlm(settings, request.prompt, controller.signal)
      .then((text) => {
        setAnswer(text)
        setLoading(false)
      })
      .catch((err: unknown) => {
        // StrictMode unmounts and remounts effects in dev; an aborted request
        // is expected and must not surface as an error.
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Unexpected error.')
        setLoading(false)
      })

    return () => controller.abort()
    // `settings` is intentionally not a dependency: changing settings mid-flight
    // should not silently re-issue the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, attempt, configured])

  const backButton = (
    <button type="button" className="icon-button" onClick={goBack} aria-label="Back">
      <BackIcon />
    </button>
  )

  if (!request) {
    return (
      <div className="page">
        <AppHeader title="Result" left={backButton} />
        <main className="page__body">
          <ErrorBox
            title="Nothing to show"
            message="This page needs a question to answer. Go back and ask about a food or scan a product."
          >
            <button type="button" className="button button--primary" onClick={goBack}>
              Back to Nutrinfo
            </button>
          </ErrorBox>
        </main>
      </div>
    )
  }

  const { product, label } = request

  return (
    <div className="page">
      <AppHeader title="Result" left={backButton} />

      <main className="page__body">
        {product ? (
          <div className="product-card">
            {product.imageUrl ? (
              <img
                className="product-card__image"
                src={product.imageUrl}
                alt=""
                width={72}
                height={72}
                loading="lazy"
              />
            ) : null}
            <div className="product-card__text">
              <h2 className="product-card__name">{product.name}</h2>
              {product.brands ? (
                <p className="product-card__brand">{product.brands}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="result-subject">
            <span className="result-subject__label">Food</span>
            <span className="result-subject__value">{label}</span>
          </p>
        )}

        {loading ? <Spinner label="Asking the model…" /> : null}

        {error ? (
          <ErrorBox message={error}>
            <button
              type="button"
              className="button button--primary"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Retry
            </button>
            <button type="button" className="button button--secondary" onClick={goBack}>
              Back
            </button>
          </ErrorBox>
        ) : null}

        {answer ? (
          <>
            <article className="answer">
              <Markdown text={answer} />
            </article>
            <div className="actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={goBack}
              >
                Back
              </button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 5 8 12l7 7"
      />
    </svg>
  )
}
