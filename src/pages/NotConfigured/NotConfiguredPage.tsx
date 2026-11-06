import { Navigate, useNavigate } from 'react-router-dom'
import { ErrorBox } from '../../components/ErrorBox'
import { isConfigured } from '../../settings/settings'
import { useSettings } from '../../settings/useSettings'

export default function NotConfiguredPage() {
  const { settings } = useSettings()
  const navigate = useNavigate()
  if (isConfigured(settings)) return <Navigate to="/" replace />
  return (
    <div className="page">
      <main className="page__body">
        <ErrorBox
          title="API not configured"
          message="The API URL, API key or model is missing."
        >
          <button
            type="button"
            className="button button--primary"
            onClick={() => navigate('/settings')}
          >
            Go to Settings
          </button>
        </ErrorBox>
      </main>
    </div>
  )
}
