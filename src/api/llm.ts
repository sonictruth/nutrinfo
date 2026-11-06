import { normalizeBaseUrl, type Settings } from '../settings/settings'

/**
 * SECURITY NOTE: the API key is stored in localStorage and sent straight from
 * the browser to the provider. There is no backend, so anyone with access to
 * this browser profile can read the key, and the key is visible in DevTools.
 * This is only appropriate for personal use with a key you can revoke — do not
 * ship this pattern with a shared or production key.
 */

export type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>
  error?: { message?: string } | string
}

function extractApiError(body: unknown, status: number, statusText: string): string {
  const fallback = `The API returned HTTP ${status}${statusText ? ' ' + statusText : ''}.`
  if (!body || typeof body !== 'object') return fallback
  const err = (body as ChatCompletionResponse).error
  if (typeof err === 'string' && err.trim()) return err.trim()
  if (err && typeof err === 'object' && typeof err.message === 'string' && err.message.trim()) {
    return `${err.message.trim()} (HTTP ${status})`
  }
  const message = (body as { message?: unknown }).message
  if (typeof message === 'string' && message.trim()) return `${message.trim()} (HTTP ${status})`
  return fallback
}

/**
 * Calls an OpenAI-compatible `POST {apiBaseUrl}/chat/completions` endpoint and
 * returns the assistant's reply text. Throws an Error with a human-readable
 * message on any failure; rethrows AbortError untouched so callers can ignore it.
 */
export async function askLlm(
  settings: Settings,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const base = normalizeBaseUrl(settings.apiBaseUrl)
  if (!base) throw new Error('No API base URL configured. Open Settings to add one.')
  if (!settings.apiKey) throw new Error('No API key configured. Open Settings to add one.')

  let res: Response
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    // fetch only rejects on transport-level problems: offline, DNS, TLS, CORS.
    throw new Error(
      'Could not reach the API. This is usually a wrong base URL, a server that ' +
        'does not allow browser requests (CORS), or no internet connection.',
    )
  }

  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = null
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `${extractApiError(body, res.status, res.statusText)} Check your API key in Settings.`,
      )
    }
    throw new Error(extractApiError(body, res.status, res.statusText))
  }

  const content = (body as ChatCompletionResponse)?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('The API returned an empty response. Try again or pick another model.')
  }
  return content
}
