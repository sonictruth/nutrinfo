import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export function AppHeader({
  title,
  left,
  showSettings = false,
  brand = false,
}: {
  title: string
  left?: ReactNode
  showSettings?: boolean
  brand?: boolean
}) {
  return (
    <header className="app-header">
      <div className="app-header__slot">{left}</div>
      {brand ? (
        <h1 className="wordmark" aria-label={title}>
          <span className="wordmark__nutr" aria-hidden="true">Nutr</span>
          <span className="wordmark__info" aria-hidden="true">info</span>
          <span className="wordmark__dot" aria-hidden="true" />
        </h1>
      ) : (
        <h1 className="app-header__title">{title}</h1>
      )}
      <div className="app-header__slot app-header__slot--end">
        {showSettings ? (
          <Link className="icon-button" to="/settings" aria-label="Settings">
            <GearIcon />
          </Link>
        ) : null}
      </div>
    </header>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Zm7.43-2.53a7.6 7.6 0 0 0 0-1.94l2.04-1.58a.5.5 0 0 0 .12-.64l-1.93-3.34a.5.5 0 0 0-.6-.22l-2.4.96a7.5 7.5 0 0 0-1.68-.97l-.36-2.55a.5.5 0 0 0-.5-.42h-3.86a.5.5 0 0 0-.5.42l-.36 2.55a7.5 7.5 0 0 0-1.68.97l-2.4-.96a.5.5 0 0 0-.6.22L2.79 8.81a.5.5 0 0 0 .12.64l2.04 1.58a7.6 7.6 0 0 0 0 1.94l-2.04 1.58a.5.5 0 0 0-.12.64l1.93 3.34a.5.5 0 0 0 .6.22l2.4-.96a7.5 7.5 0 0 0 1.68.97l.36 2.55a.5.5 0 0 0 .5.42h3.86a.5.5 0 0 0 .5-.42l.36-2.55a7.5 7.5 0 0 0 1.68-.97l2.4.96a.5.5 0 0 0 .6-.22l1.93-3.34a.5.5 0 0 0-.12-.64Z"
      />
    </svg>
  )
}
