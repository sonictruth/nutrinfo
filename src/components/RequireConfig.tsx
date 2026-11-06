import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { isConfigured } from '../settings/settings'
import { useSettings } from '../settings/useSettings'

/** Redirects to the dedicated error page until URL, key and model are set. */
export function RequireConfig({ children }: { children: ReactElement }) {
  const { settings } = useSettings()
  if (!isConfigured(settings)) return <Navigate to="/not-configured" replace />
  return children
}
