export function Spinner({ label }: { label: string }) {
  return (
    <div className="spinner" role="status" aria-live="polite">
      <span className="spinner__dial" aria-hidden="true" />
      <span className="spinner__label">{label}</span>
    </div>
  )
}
