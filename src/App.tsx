import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireConfig } from './components/RequireConfig'
import { Spinner } from './components/Spinner'
import HomePage from './pages/Home/HomePage'
import NotConfiguredPage from './pages/NotConfigured/NotConfiguredPage'
import ResultPage from './pages/Result/ResultPage'
import SettingsPage from './pages/Settings/SettingsPage'

// The barcode library is ~500 kB; keep it out of the initial mobile download.
const ScanPage = lazy(() => import('./pages/Scan/ScanPage'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RequireConfig><HomePage /></RequireConfig>} />
      <Route
        path="/scan"
        element={
          <RequireConfig>
            <Suspense fallback={<Spinner label="Loading scanner…" />}>
              <ScanPage />
            </Suspense>
          </RequireConfig>
        }
      />
      <Route path="/result" element={<RequireConfig><ResultPage /></RequireConfig>} />
      <Route path="/not-configured" element={<NotConfiguredPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
