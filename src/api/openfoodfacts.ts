/**
 * OpenFoodFacts API v3.6 client.
 * Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 *
 * Version: v3 is the current line and v2 is deprecated, so we pin the exact
 * sub-version. Bare `/api/v3/` resolves to the server's default sub-version,
 * which today still serves the v2-shaped product schema — pinning keeps the
 * response shape from changing under us.
 *
 * Shape: v3.6 moved nutrient data out of the flat `nutriments` map (left behind
 * as an empty stub) into `nutrition.aggregated_set` + `nutrition.input_sets`,
 * dropped the comma-joined `allergens` / `categories` / `traces` strings in
 * favour of `*_tags` arrays, and renamed `ecoscore_grade` to
 * `environmental_score_grade`. The readers below accept both shapes so the app
 * keeps working whichever one a version serves.
 *
 * Identification: the docs ask read clients to identify themselves with a
 * custom `User-Agent` of the form `AppName/Version`. Browsers forbid page JS
 * from setting `User-Agent`, but the API's CORS policy explicitly allows
 * `X-User-Agent` (verified: the OPTIONS preflight answers 204 and lists it in
 * `Access-Control-Allow-Headers`, cached for 20 days), so we send that instead.
 * `app_name` / `app_version` are documented for *write* queries only and are
 * therefore not used here.
 */

const BASE = 'https://world.openfoodfacts.org/api/v3.6/product'
const USER_AGENT = 'Nutrinfo/1.0'

export type OffProduct = Record<string, unknown>

export type ProductSummary = {
  barcode: string
  name: string
  brands: string
  imageUrl: string | null
}

export class ProductNotFoundError extends Error {
  constructor(barcode: string) {
    super(`No product with barcode ${barcode} in the OpenFoodFacts database.`)
    this.name = 'ProductNotFoundError'
  }
}

function browserLang(): string {
  const tag = typeof navigator !== 'undefined' ? navigator.language : 'en'
  return (tag || 'en').split('-')[0].toLowerCase()
}

function fieldList(lang: string): string {
  const fields = [
    'code',
    'product_name',
    'product_name_en',
    `product_name_${lang}`,
    'generic_name',
    `generic_name_${lang}`,
    'brands',
    'quantity',
    'serving_size',
    'ingredients_text',
    'ingredients_text_en',
    `ingredients_text_${lang}`,
    'allergens',
    'allergens_tags',
    'traces',
    'traces_tags',
    'additives_tags',
    // v3.6 nutrient data; `nutriments` is the pre-3.6 fallback.
    'nutrition',
    'nutriments',
    'nutriscore_grade',
    'nova_group',
    // Renamed in v3.6; the old name is kept as the pre-3.6 fallback.
    'environmental_score_grade',
    'ecoscore_grade',
    'categories',
    'categories_tags',
    'labels',
    'labels_tags',
    'image_front_small_url',
  ]
  return [...new Set(fields)].join(',')
}

/** v3 envelope; `status` is `1 | 0` on pre-v3 responses. */
type OffEnvelope = {
  status?: string | number
  product?: OffProduct
  result?: { id?: string }
  errors?: Array<{ message?: { id?: string } }>
}

/** True when the envelope says this barcode has no product record. */
function saysNotFound(body: OffEnvelope): boolean {
  if (body.status === 'failure' || body.status === 0) return true
  if (body.result?.id === 'product_not_found') return true
  return (body.errors ?? []).some((e) => e?.message?.id === 'product_not_found')
}

/**
 * Fetches one product. Throws ProductNotFoundError when OpenFoodFacts has no
 * record for the barcode (v3 answers HTTP 404 with `status: "failure"` and a
 * `product_not_found` result; pre-v3 answered HTTP 200 with `status: 0` — all
 * handled), and a plain Error on transport failures.
 */
export async function fetchProduct(
  barcode: string,
  signal?: AbortSignal,
): Promise<OffProduct> {
  const lang = browserLang()
  const url =
    `${BASE}/${encodeURIComponent(barcode)}.json` +
    `?fields=${encodeURIComponent(fieldList(lang))}` +
    `&lc=${encodeURIComponent(lang)}`

  let res: Response
  try {
    res = await fetch(url, { signal, headers: { 'X-User-Agent': USER_AGENT } })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new Error(
      'Could not reach OpenFoodFacts. Check your internet connection and try again.',
    )
  }

  if (res.status === 404) throw new ProductNotFoundError(barcode)
  if (!res.ok) {
    throw new Error(`OpenFoodFacts returned HTTP ${res.status} ${res.statusText}.`)
  }

  let body: OffEnvelope
  try {
    body = await res.json()
  } catch {
    throw new Error('OpenFoodFacts returned a response that could not be read.')
  }

  if (saysNotFound(body)) throw new ProductNotFoundError(barcode)
  // v3 reports `success`, `success_with_warnings` and `success_with_errors`.
  // A normalized 12-digit UPC-A, which is what zxing emits for US products,
  // comes back as `success_with_warnings`, so match the prefix, not the word.
  const ok =
    typeof body.status === 'string'
      ? body.status.startsWith('success')
      : body.status === 1
  if (!ok || !body.product) {
    throw new Error('OpenFoodFacts returned an unexpected response for this barcode.')
  }
  return body.product
}

function str(p: OffProduct, key: string): string {
  const v = p[key]
  return typeof v === 'string' ? v.trim() : ''
}

function firstNonEmpty(p: OffProduct, keys: string[]): string {
  for (const k of keys) {
    const v = str(p, k)
    if (v) return v
  }
  return ''
}

export function productName(p: OffProduct): string {
  const lang = browserLang()
  return (
    firstNonEmpty(p, [
      `product_name_${lang}`,
      'product_name',
      'product_name_en',
      `generic_name_${lang}`,
      'generic_name',
    ]) || 'Unnamed product'
  )
}

export function summarizeProduct(p: OffProduct, barcode: string): ProductSummary {
  const image = str(p, 'image_front_small_url')
  return {
    barcode,
    name: productName(p),
    brands: str(p, 'brands'),
    imageUrl: image || null,
  }
}

/** Grades the API reports as placeholders rather than real values. */
const EMPTY_GRADES = new Set(['unknown', 'not-applicable', 'n/a', ''])

const NUTRIENT_LABELS: Record<string, string> = {
  'energy-kcal': 'Energy',
  'energy-kj': 'Energy',
  energy: 'Energy',
  fat: 'Fat',
  'saturated-fat': 'Saturated fat',
  'trans-fat': 'Trans fat',
  cholesterol: 'Cholesterol',
  carbohydrates: 'Carbohydrates',
  sugars: 'Sugars',
  'added-sugars': 'Added sugars',
  'sugar-alcohols': 'Sugar alcohols',
  fiber: 'Fibre',
  proteins: 'Proteins',
  salt: 'Salt',
  sodium: 'Sodium',
  'fruits-vegetables-nuts': 'Fruits/vegetables/nuts',
  alcohol: 'Alcohol',
  'vitamin-c': 'Vitamin C',
  'vitamin-d': 'Vitamin D',
  calcium: 'Calcium',
  iron: 'Iron',
  potassium: 'Potassium',
  magnesium: 'Magnesium',
  caffeine: 'Caffeine',
}

/** Nutrients printed first, in this order, when present. */
const NUTRIENT_ORDER = [
  'energy-kcal',
  'energy-kj',
  'energy',
  'fat',
  'saturated-fat',
  'trans-fat',
  'cholesterol',
  'carbohydrates',
  'sugars',
  'added-sugars',
  'fiber',
  'proteins',
  'salt',
  'sodium',
]

/** Not nutrition facts — reported elsewhere or purely internal to OFF. */
const NUTRIENT_SKIP = /^(nova-group|nutrition-score|.*-estimate-from-ingredients)/

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return ''
  // Small values (sodium in g, vitamins) need more decimals than 2.
  const decimals = Math.abs(n) < 1 ? 4 : 2
  return String(Number(n.toFixed(decimals)))
}

function numeric(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** One nutrient's values on both bases, ready to render. */
type NutrientValues = {
  unit: string
  per100: number | null
  perServing: number | null
}

type NutrientMap = Map<string, NutrientValues>

function unitFor(base: string, given: unknown): string {
  if (typeof given === 'string' && given.trim()) return given.trim()
  return base.startsWith('energy-kcal') ? 'kcal' : ''
}

/**
 * Orders the nutrients and renders one `- Label: X per 100 g, Y per serving`
 * line each. Shared by both response shapes so their output is identical.
 */
function renderNutritionLines(values: NutrientMap): string[] {
  const bases = new Set(values.keys())

  // `energy` repeats whichever of energy-kj / energy-kcal the producer entered,
  // so drop it when a specific unit is already listed.
  if (bases.has('energy') && (bases.has('energy-kj') || bases.has('energy-kcal'))) {
    bases.delete('energy')
  }

  const ordered = [
    ...NUTRIENT_ORDER.filter((b) => bases.has(b)),
    ...[...bases].filter((b) => !NUTRIENT_ORDER.includes(b)).sort(),
  ]

  const lines: string[] = []
  for (const base of ordered) {
    const entry = values.get(base)
    if (!entry) continue
    const { unit, per100, perServing } = entry
    if (per100 === null && perServing === null) continue

    const parts: string[] = []
    if (per100 !== null) {
      parts.push(`${formatNumber(per100)}${unit ? ' ' + unit : ''} per 100 g`)
    }
    if (perServing !== null) {
      parts.push(`${formatNumber(perServing)}${unit ? ' ' + unit : ''} per serving`)
    }
    const label = NUTRIENT_LABELS[base] ?? base.replace(/-/g, ' ')
    const suffix = base === 'energy-kj' && NUTRIENT_LABELS[base] ? ' (kJ)' : ''
    const kcalSuffix = base === 'energy-kcal' ? ' (kcal)' : ''
    lines.push(`- ${label}${kcalSuffix}${suffix}: ${parts.join(', ')}`)
  }
  return lines
}

/** Rendered nutrition facts plus the context needed to label them. */
type NutritionBlock = {
  lines: string[]
  /** True when the figures describe the product as prepared, not as sold. */
  prepared: boolean
  /** Serving size recovered from the nutrition data, e.g. "15 g". */
  servingSize: string
}

const EMPTY_NUTRITION: NutritionBlock = { lines: [], prepared: false, servingSize: '' }

type V3Nutrient = {
  value?: unknown
  /** OFF's derived value, e.g. kJ computed from a declared kcal figure. */
  value_computed?: unknown
  unit?: unknown
  source?: unknown
}

/**
 * Prefers the declared `value`; falls back to OFF's derived `value_computed`,
 * which is the only figure present for e.g. per-serving `energy-kj`. A declared
 * `0` is kept (`??` only falls through on null/undefined).
 */
function nutrientValue(entry: V3Nutrient | undefined): number | null {
  if (!entry) return null
  return numeric(entry.value ?? entry.value_computed)
}

type V3NutrientSet = {
  per?: unknown
  per_quantity?: unknown
  per_unit?: unknown
  preparation?: unknown
  source?: unknown
  nutrients?: Record<string, V3Nutrient>
}

function setNutrients(set: V3NutrientSet | undefined): Record<string, V3Nutrient> {
  const n = set?.nutrients
  return n && typeof n === 'object' ? n : {}
}

/**
 * The serving a per-serving set is measured against, e.g. "15 g". Products can
 * carry per-serving figures with no `serving_size` field (Nutella does), which
 * would leave the model with values and no denominator.
 */
function servingSizeOf(set: V3NutrientSet | undefined): string {
  if (!set || set.per !== 'serving') return ''
  const qty = numeric(set.per_quantity)
  if (qty === null) return ''
  const unit = typeof set.per_unit === 'string' ? set.per_unit.trim() : ''
  return `${formatNumber(qty)}${unit ? ' ' + unit : ''}`
}

/**
 * Reads the v3.6 `nutrition` object.
 *
 * `aggregated_set` holds one basis (`per`), and the complementary basis is
 * recovered from the matching entry in `input_sets`. Nutrients whose
 * `source` is `estimate` are skipped: v3.6 folds OFF's "estimate from
 * ingredients" values into the aggregate, which would otherwise bury the dozen
 * real figures under ~50 estimated trace minerals. Pre-3.6 kept those in a
 * separate `nutriments_estimated` field, which this client never read.
 */
function nutritionLinesV3(p: OffProduct): NutritionBlock {
  const nutrition = p.nutrition as
    | { aggregated_set?: V3NutrientSet; input_sets?: V3NutrientSet[] }
    | undefined
  if (!nutrition || typeof nutrition !== 'object') return EMPTY_NUTRITION

  const aggregated = nutrition.aggregated_set
  const aggregatedNutrients = setNutrients(aggregated)
  if (Object.keys(aggregatedNutrients).length === 0) return EMPTY_NUTRITION

  const aggregatedPer = aggregated?.per === 'serving' ? 'serving' : '100g'
  const otherPer = aggregatedPer === '100g' ? 'serving' : '100g'
  // Both bases must describe the same preparation, or we would pair e.g.
  // prepared per-100 g values with as-sold per-serving ones.
  const preparation = aggregated?.preparation ?? 'as_sold'

  const otherSet = (
    Array.isArray(nutrition.input_sets) ? nutrition.input_sets : []
  ).find(
    (set) =>
      set?.per === otherPer &&
      set.source !== 'estimate' &&
      (set.preparation ?? 'as_sold') === preparation &&
      Object.keys(setNutrients(set)).length > 0,
  )
  const otherNutrients = setNutrients(otherSet)

  const values: NutrientMap = new Map()
  for (const [base, entry] of Object.entries(aggregatedNutrients)) {
    if (NUTRIENT_SKIP.test(base)) continue
    if (entry?.source === 'estimate') continue

    const other = otherNutrients[base]
    const aggregatedValue = nutrientValue(entry)
    const otherValue = nutrientValue(other)
    if (aggregatedValue === null && otherValue === null) continue

    values.set(base, {
      unit: unitFor(base, entry?.unit ?? other?.unit),
      per100: aggregatedPer === '100g' ? aggregatedValue : otherValue,
      perServing: aggregatedPer === 'serving' ? aggregatedValue : otherValue,
    })
  }

  return {
    lines: renderNutritionLines(values),
    prepared: preparation === 'prepared',
    servingSize: servingSizeOf(otherPer === 'serving' ? otherSet : aggregated),
  }
}

/** Reads the flat pre-3.6 `nutriments` map (`<nutrient>_100g` / `_serving`). */
function nutrimentLinesFlat(p: OffProduct): NutritionBlock {
  const n = p.nutriments
  if (!n || typeof n !== 'object') return EMPTY_NUTRITION
  const nutriments = n as Record<string, unknown>

  const values: NutrientMap = new Map()
  for (const key of Object.keys(nutriments)) {
    const m = /^(.*)_(100g|serving)$/.exec(key)
    if (!m || NUTRIENT_SKIP.test(m[1])) continue
    const base = m[1]
    if (values.has(base)) continue

    const per100 = numeric(nutriments[`${base}_100g`])
    const perServing = numeric(nutriments[`${base}_serving`])
    if (per100 === null && perServing === null) continue

    values.set(base, {
      unit: unitFor(base, nutriments[`${base}_unit`]),
      per100,
      perServing,
    })
  }

  return { lines: renderNutritionLines(values), prepared: false, servingSize: '' }
}

/** v3.6 shape first, flat `nutriments` as the pre-3.6 fallback. */
function nutritionLines(p: OffProduct): NutritionBlock {
  const v3 = nutritionLinesV3(p)
  return v3.lines.length > 0 ? v3 : nutrimentLinesFlat(p)
}

function tagsToText(p: OffProduct, key: string, limit = 25): string {
  const v = p[key]
  if (!Array.isArray(v)) return ''
  return v
    .filter((t): t is string => typeof t === 'string')
    .slice(0, limit)
    // Tags look like "en:milk" — drop the language prefix.
    .map((t) => t.replace(/^[a-z]{2}:/, '').replace(/-/g, ' '))
    .join(', ')
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

/**
 * Turns the product JSON into readable plain text for the LLM prompt.
 * Missing fields are omitted entirely rather than printed as "undefined".
 */
export function formatProductForPrompt(p: OffProduct, barcode: string): string {
  const lang = browserLang()
  const out: string[] = []

  const push = (label: string, value: string) => {
    if (value) out.push(`${label}: ${value}`)
  }

  const nutrition = nutritionLines(p)

  push('Product', productName(p))
  push('Brand', str(p, 'brands'))
  push('Barcode', barcode)
  push('Package quantity', str(p, 'quantity'))
  push('Serving size', str(p, 'serving_size') || nutrition.servingSize)
  // v3.6 drops the comma-joined strings, so fall back to the tags arrays.
  push('Categories', clip(str(p, 'categories') || tagsToText(p, 'categories_tags'), 400))
  // Tags first for labels: v3.6's plain `labels` string can be malformed
  // (e.g. "Sans gluten, en:no-gluten"), while `labels_tags` is canonical.
  push('Labels', clip(tagsToText(p, 'labels_tags') || str(p, 'labels'), 300))

  const ingredients = firstNonEmpty(p, [
    `ingredients_text_${lang}`,
    'ingredients_text',
    'ingredients_text_en',
  ])
  push('Ingredients', clip(ingredients, 1500))

  push('Allergens', str(p, 'allergens') || tagsToText(p, 'allergens_tags'))
  push('Traces', str(p, 'traces') || tagsToText(p, 'traces_tags'))
  push('Additives', tagsToText(p, 'additives_tags'))

  const nutriscore = str(p, 'nutriscore_grade').toLowerCase()
  if (!EMPTY_GRADES.has(nutriscore)) push('Nutri-Score', nutriscore.toUpperCase())

  const nova = numeric(p.nova_group)
  if (nova !== null) push('NOVA group', `${nova} (1 = unprocessed … 4 = ultra-processed)`)

  // `ecoscore_grade` was renamed `environmental_score_grade` in v3.6.
  const eco = (
    str(p, 'environmental_score_grade') || str(p, 'ecoscore_grade')
  ).toLowerCase()
  if (!EMPTY_GRADES.has(eco)) push('Eco-Score', eco.toUpperCase())

  if (nutrition.lines.length > 0) {
    out.push('')
    out.push(nutrition.prepared ? 'Nutrition facts (as prepared):' : 'Nutrition facts:')
    out.push(...nutrition.lines)
  }

  return out.join('\n')
}
