# Nutrinfo

Mobile-first React web app that tells you whether a food suits your medical
condition. Type a product name or scan its barcode; Nutrinfo looks the product
up on [OpenFoodFacts](https://world.openfoodfacts.org/) and asks an
OpenAI-compatible LLM to evaluate it against the medical condition you put in
your custom prompt.

There is no backend — every request goes straight from your browser to
OpenFoodFacts and to the LLM API.

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

```bash
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
```

Requires Node 20.19+ (Vite 6).

## Configure the API

Open **Settings** (gear icon, top right) and fill in:

| Field | Example | Notes |
| --- | --- | --- |
| Custom prompt | see below | Put **your medical condition** on the `My medical condition:` line. Must end with `Food to evaluate:` — the food description is appended right after it. |
| API base URL | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint. Requests go to `{base}/chat/completions`. Trailing slashes are stripped on save. |
| API key | `sk-…` | Stored in `localStorage` on this device only. |
| Model name | `gpt-6-astra` | Any model your endpoint serves. |

Press **Save**. Ask and Scan stay disabled until a base URL and key are set.

The default prompt asks for a short, evidence-based verdict (good / bad / OK in
moderation), the benefits, the risks, and a recommendation. **Reset to default**
restores it.

### Using a local or self-hosted endpoint

Anything that speaks the OpenAI chat-completions API works (Ollama's
`http://localhost:11434/v1`, LM Studio, vLLM, OpenRouter, Azure-style
gateways…). The server must send CORS headers that allow the origin Nutrinfo is
served from, otherwise the browser blocks the call and you get a "Could not
reach the API" error.

### Security

The API key lives in `localStorage` and is sent from the browser with every
request, so anyone with access to this browser profile — or to the DevTools of
this page — can read it. That is fine for personal use with a key you can
revoke, and not fine for a shared or production key.

## Camera / HTTPS

Browsers only expose `getUserMedia` in a **secure context**: `localhost` or
HTTPS. `http://192.168.x.x:5173` on your phone will *not* get camera access —
Nutrinfo detects this and falls back to a manual barcode input field.

To scan on a phone, pick one of:

- **A tunnel** (simplest): `npm run dev` in one terminal, then e.g.
  `npx localtunnel --port 5173` or `cloudflared tunnel --url http://localhost:5173`,
  and open the HTTPS URL it prints.
- **A local HTTPS dev server**: `npm i -D @vitejs/plugin-basic-ssl`, add
  `basicSsl()` to `plugins` in `vite.config.ts`, then
  `npm run dev -- --host`, and accept the self-signed certificate warning.

Camera permission is also per-origin: if you deny it once, re-allow it in the
browser's site settings.

Tested manually in desktop Chrome at 360px width. Camera scanning requires a
real device and was not exercised in that environment.

## How it works

- `src/api/openfoodfacts.ts` — product lookup and the plain-text summary that
  goes into the prompt (name, brand, quantity, serving size, ingredients,
  allergens, additives, Nutri-Score, NOVA, Eco-Score, categories, labels and
  every nutriment present per 100 g and per serving). Missing fields are
  omitted, never printed as `undefined`. Talks to the pinned `/api/v3.6/`
  endpoint and reads nutrients from v3.6's `nutrition.aggregated_set` /
  `input_sets`, falling back to the pre-3.6 flat `nutriments` map if a response
  uses the older shape. Nutrinfo identifies itself with an
  `X-User-Agent: Nutrinfo/1.0` header — OpenFoodFacts asks read clients for a
  custom `User-Agent`, which browsers forbid page JS from setting, and its CORS
  policy explicitly allows `X-User-Agent` instead.
- `src/api/llm.ts` — `POST {base}/chat/completions` with
  no `temperature` (some models only accept the default), reads `choices[0].message.content`.
- `src/settings/` — settings model plus the `useSettings` context, persisted to
  `localStorage`.
- `src/state/AppState.tsx` — keeps the Home textarea draft and the pending
  request, so **Back** restores what you typed and **Retry** can resend.
- `src/components/Markdown.tsx` — ~190-line Markdown renderer producing React
  elements (never `dangerouslySetInnerHTML`, since the input is model output).
- `src/pages/<Page>/` — one folder per page: Home, Scan, Result, Settings.

The scanner (`@zxing/browser`) is loaded lazily, so the initial download stays
around 65 kB gzipped.

## Disclaimer

Nutrinfo is an LLM front-end, not a medical device. Model answers can be wrong.
Do not use it to make treatment decisions.
