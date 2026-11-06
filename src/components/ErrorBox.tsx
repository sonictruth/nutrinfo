import type { ReactNode } from 'react'

export function ErrorBox({
  title = 'Something went wrong',
  message,
  children,
}: {
  title?: string
  message: string
  children?: ReactNode
}) {
  return (
    <div className="error-box" role="alert">
      <h2 className="error-box__title">{title}</h2>
      <p className="error-box__message">{message}</p>
      {children ? <div className="error-box__actions">{children}</div> : null}
    </div>
  )
}
