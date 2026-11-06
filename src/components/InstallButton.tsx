import { useEffect, useState } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

const FLAG = 'nutrinfo.installed'

function wasInstalled(): boolean {
  try {
    return localStorage.getItem(FLAG) === '1'
  } catch {
    return false
  }
}

function rememberInstalled() {
  try {
    localStorage.setItem(FLAG, '1')
  } catch {
    // storage unavailable; the flag is only an optimisation
  }
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** Footer button offering to install the app to the home screen. */
export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => {
    const standalone = isStandalone()
    if (standalone) rememberInstalled()
    return standalone || wasInstalled()
  })
  const [showIosHelp, setShowIosHelp] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as InstallPromptEvent)
    }
    const onInstalled = () => {
      rememberInstalled()
      setInstalled(true)
      setPromptEvent(null)
    }
    // Chromium: detects the installed PWA even when opened in a normal tab.
    const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> }
    nav
      .getInstalledRelatedApps?.()
      .then((apps) => {
        if (apps.length > 0) {
          rememberInstalled()
          setInstalled(true)
        }
      })
      .catch(() => {})
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null
  // Chromium offers a native prompt; iOS Safari has none, so show instructions.
  if (!promptEvent && !isIos()) return null

  async function install() {
    if (!promptEvent) {
      setShowIosHelp((v) => !v)
      return
    }
    await promptEvent.prompt()
    await promptEvent.userChoice
    setPromptEvent(null)
  }

  return (
    <footer className="app-footer">
      <button type="button" className="install-button" onClick={() => void install()}>
        <DownloadIcon />
        Install NutrInfo
      </button>
      {showIosHelp ? (
        <p className="app-footer__help">
          Tap the Share button in Safari, then choose &ldquo;Add to Home Screen&rdquo;.
        </p>
      ) : null}
    </footer>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4v10m0 0-4-4m4 4 4-4M5 19h14"
      />
    </svg>
  )
}
