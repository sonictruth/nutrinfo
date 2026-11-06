import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { DEFAULT_CONDITION, DEFAULT_PROMPT } from '../../settings/defaultPrompt'
import { useSettings } from '../../settings/useSettings'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { settings, save } = useSettings()

  const [customPrompt, setCustomPrompt] = useState(settings.customPrompt)
  const [condition, setCondition] = useState(settings.condition)
  const [apiBaseUrl, setApiBaseUrl] = useState(settings.apiBaseUrl)
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [model, setModel] = useState(settings.model)
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const id = window.setTimeout(() => setSaved(false), 2500)
    return () => window.clearTimeout(id)
  }, [saved])

  function onSave(e: React.FormEvent) {
    e.preventDefault()
    save({ customPrompt, condition, apiBaseUrl, apiKey, model })
    setSaved(true)
  }

  const backButton = (
    <button
      type="button"
      className="button button--ghost"
      onClick={() => navigate('/', { replace: true })}
    >
      Back
    </button>
  )

  return (
    <div className="page">
      <AppHeader title="Settings" left={backButton} />

      <main className="page__body">
        <form onSubmit={onSave} className="settings-form">
          <label className="field">
            <span className="field__label">Condition and current treatment</span>
            <input
              className="field__input"
              name="condition"
              type="text"
              value={condition}
              placeholder={DEFAULT_CONDITION}
              onChange={(e) => setCondition(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Prompt (placeholders: [Condition], [FOOD])</span>
            <textarea
              name="customPrompt"
              className="field__input field__input--area field__input--tall"
              rows={14}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="button button--ghost button--inline"
            onClick={() => {
              setCustomPrompt(DEFAULT_PROMPT)
              setCondition(DEFAULT_CONDITION)
            }}
          >
            Reset to default
          </button>

          <label className="field">
            <span className="field__label">API base URL</span>
            <input
              className="field__input"
              name="apiBaseUrl"
              type="url"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://api.openai.com/v1"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">API key</span>
            <div className="field__row">
              <input
                className="field__input"
                name="apiKey"
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="sk-…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                type="button"
                className="button button--ghost button--compact"
                onClick={() => setShowKey((v) => !v)}
                aria-pressed={showKey}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label className="field">
            <span className="field__label">Model name</span>
            <input
              className="field__input"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              name="model"
              placeholder="gpt-4o-mini"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </label>

          <p className="hint">
            The API key is stored in this browser only and sent directly to the API
            from this device. Use a personal key you can revoke.
          </p>

          <div className="actions">
            <button type="submit" className="button button--primary">
              Save
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => navigate('/', { replace: true })}
            >
              Back
            </button>
          </div>

          {saved ? (
            <div className="toast" role="status">
              Settings saved
            </div>
          ) : null}
        </form>
      </main>
    </div>
  )
}
