import type {
  AiComparison,
  AiComparisonRow,
  AiProductHit,
  Product,
  ServiceArea,
  Shop,
} from '@/types'
import { effectivePrice } from '@/services/feeService'
import { formatINR } from '@/utils'
import { envConfig, integrationStatus } from '@/config/env'

/**
 * Mock LocalizeIt AI.
 *
 * This service only *discovers* products from the local mock catalogue.
 * It never places or pays for an order. When a real AI endpoint is added,
 * only this module needs to change — the assistant UI stays the same.
 */

export interface AiContext {
  products: Product[]
  shops: Shop[]
  area: ServiceArea
  favouriteShopIds: string[]
}

export interface AiAnswer {
  text: string
  hits: AiProductHit[]
  comparison?: AiComparison
  clarification?: string[]
  suggestions: string[]
}

const STOPWORDS = new Set([
  'find',
  'show',
  'nearby',
  'near',
  'me',
  'all',
  'the',
  'for',
  'from',
  'under',
  'below',
  'than',
  'less',
  'per',
  'and',
  'with',
  'shop',
  'shops',
  'store',
  'stores',
  'selling',
  'sells',
  'cheapest',
  'cheap',
  'lowest',
  'compare',
  'price',
  'prices',
  'across',
  'list',
  'items',
  'item',
  'buy',
  'my',
  'in',
  'at',
  'of',
  'a',
  'to',
  'is',
  'are',
  'available',
  'availability',
  'stock',
  'today',
  'nearby',
  'village',
  'town',
  'city',
  'local',
  'localizeit',
  'please',
  'want',
  'need',
  'give',
  'which',
  'what',
  'where',
  'how',
  'much',
  'does',
  'cost',
  'costs',
  'rupees',
  'rs',
])

const SYNONYMS: Record<string, string> = {
  chawal: 'rice',
  doodh: 'milk',
  dudh: 'milk',
  tel: 'oil',
  namak: 'salt',
  cheeni: 'sugar',
  shakkar: 'sugar',
  atta: 'atta',
  aata: 'atta',
  dal: 'dal',
  daal: 'dal',
  sabzi: 'vegetables',
  aloo: 'potato',
  pyaz: 'onion',
  tamatar: 'tomato',
  dhania: 'coriander',
  palak: 'spinach',
  dahi: 'curd',
  chai: 'tea',
  patti: 'tea',
  meds: 'medicine',
  dawai: 'medicine',
  kapda: 'saree',
  sari: 'saree',
  copy: 'notebook',
  kalam: 'pen',
  biscuit: 'biscuit',
  soap: 'soap',
}

const KNOWN_ITEMS = [
  'rice',
  'milk',
  'oil',
  'atta',
  'dal',
  'salt',
  'sugar',
  'tea',
  'paneer',
  'ghee',
  'curd',
  'butter',
  'notebook',
  'pen',
  'pencil',
  'potato',
  'onion',
  'tomato',
  'spinach',
  'coriander',
  'brinjal',
  'peas',
  'banana',
  'bread',
  'cake',
  'cookies',
  'paracetamol',
  'ors',
  'bulb',
  'paint',
  'saree',
  'kurta',
  'dupatta',
  'seeds',
  'fertiliser',
  'sprayer',
  'honey',
  'earphones',
  'charger',
  'power bank',
  'biscuit',
  'noodles',
  'soap',
  'detergent',
  'poha',
  'besan',
  'sattu',
  'chana',
  'papad',
  'lassi',
  'cake',
  'thermometer',
  'stole',
]

export const aiSuggestedQueries = [
  'Find rice under ₹100 per kg',
  'Show nearby shops selling milk',
  'Find the cheapest notebook',
  'Find all items on my grocery list: rice, milk, notebook, oil',
  'Compare prices for Tata Salt across local shops',
]

function extractPriceCeiling(query: string): number | undefined {
  const match =
    query.match(/(?:under|below|less than|upto|up to|budget of|₹|rs\.?)\s*₹?\s*(\d+)/i) ??
    query.match(/(\d+)\s*(?:rupees|rs|₹)?\s*(?:se kam|ke andar)/i)
  return match ? Number(match[1]) : undefined
}

function extractKeywords(query: string): string[] {
  const lower = query.toLowerCase()
  const found = new Set<string>()
  for (const [alias, canonical] of Object.entries(SYNONYMS)) {
    if (new RegExp(`\\b${alias}\\b`, 'i').test(lower)) found.add(canonical)
  }
  for (const item of KNOWN_ITEMS) {
    if (lower.includes(item)) found.add(item)
  }
  if (found.size === 0) {
    for (const token of lower.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)) {
      if (token.length >= 3 && !STOPWORDS.has(token) && !/^\d+$/.test(token)) {
        found.add(token)
      }
    }

  }
  return Array.from(found)
}

function matchesItem(product: Product, keyword: string): boolean {
  const haystack = `${product.name} ${product.tags.join(' ')}`.toLowerCase()
  return haystack.includes(keyword)
}

function buildHit(
  product: Product,
  shop: Shop,
  explanation: string,
): AiProductHit {
  return {
    productId: product.id,
    name: product.name,
    unit: product.unit,
    price: effectivePrice(product),
    mrp: product.mrp,
    shopId: product.shopId,
    shopName: shop.name,
    distanceKm: shop.distanceKm,
    inStock: product.inStock,
    stock: product.stock,
    explanation,
    categoryId: product.categoryId,
  }
}

function comparisonFor(
  label: string,
  rows: Array<{ product: Product; shop: Shop }>,
): AiComparison {
  const comparisonRows: AiComparisonRow[] = rows.map(({ product, shop }) => ({
    shopId: shop.id,
    shopName: shop.name,
    town: shop.town,
    distanceKm: shop.distanceKm,
    price: effectivePrice(product),
    unit: product.unit,
    inStock: product.inStock,
    delivery: shop.delivery,
    deal: Boolean(product.deal),
  }))
  return { label, rows: comparisonRows }
}

function sortHits(hits: AiProductHit[]): AiProductHit[] {
  return [...hits].sort((a, b) => {
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1
    return a.price - b.price
  })
}

function askLocalizeItLocal(rawQuery: string, ctx: AiContext): AiAnswer {
  const query = rawQuery.trim()
  const shopMap = new Map(ctx.shops.map((s) => [s.id, s]))
  const availableShops = ctx.shops.filter((s) => s.status === 'approved')
  const allowedShopIds = new Set(availableShops.map((s) => s.id))
  const catalogue = ctx.products.filter((p) => !p.archived && allowedShopIds.has(p.shopId))

  const place = ctx.area.village ? `${ctx.area.village}, ${ctx.area.town}` : ctx.area.town
  const keywords = extractKeywords(query)
  const ceiling = extractPriceCeiling(query)
  const wantsCompare = /compare|comparison|difference|across shops/i.test(query)
  const wantsCheapest = /cheap|lowest|best price|sasta|kam daam/i.test(query)
  const wantsShops = /shops? (?:selling|that sell)|which shop|nearby shops/i.test(query)
  const isList = /list|,| and /i.test(query) && keywords.length >= 2

  const suggestions = aiSuggestedQueries.slice(0, 3)

  if (keywords.length === 0) {
    return {
      text: `Main aapke ${place} ke aas-paas ke shops se dhoondh sakta hoon. Kis cheez ki talash hai — grocery, dairy, stationery ya kuch aur?`,
      hits: [],
      clarification: [
        'Which product are you looking for?',
        'Do you want the cheapest or the nearest shop?',
        'Any budget or quantity in mind?',
      ],
      suggestions: aiSuggestedQueries,
    }
  }

  const matched = catalogue
    .filter((product) => keywords.some((keyword) => matchesItem(product, keyword)))
    .filter((product) => (ceiling ? effectivePrice(product) <= ceiling : true))

  if (!matched.length) {
    return {
      text: ceiling
        ? `${place} ke nearby shops mein ${keywords.join(', ')} ₹${ceiling} ke andar nahi mila. Thoda budget badha kar dekhein, ya main aapko out-of-stock items bata doon?`
        : `${place} ke nearby shops mein "${keywords.join(', ')}" ke liye koi match nahi mila. Doosra naam try karein.`,
      hits: [],
      clarification: [
        'Do you want me to relax the price limit?',
        'Should I look in shops of a nearby town?',
      ],
      suggestions: aiSuggestedQueries,
    }
  }

  const scored = matched
    .map((product) => {
      const shop = shopMap.get(product.shopId)!
      return { product, shop }
    })
    .filter((row) => row.shop)

  // Grocery-list intent: cheapest in-stock option for each requested item.
  if (isList) {
    const picks: Array<{ product: Product; shop: Shop; keyword: string }> = []
    for (const keyword of keywords) {
      const candidates = scored
        .filter((row) => matchesItem(row.product, keyword))
        .sort((a, b) => {
          if (a.product.inStock !== b.product.inStock) return a.product.inStock ? -1 : 1
          return effectivePrice(a.product) - effectivePrice(b.product)
        })
      if (candidates[0]) picks.push({ ...candidates[0], keyword })
    }
    const hits = sortHits(
      picks.map(({ product, shop, keyword }) =>
        buildHit(
          product,
          shop,
          `Cheapest in-stock option for ${keyword} · ${shop.name}`,
        ),
      ),
    )
    const total = picks.reduce(
      (sum, pick) => sum + effectivePrice(pick.product),
      0,
    )
    return {
      text: `Aapki list ke ${picks.length} items ${place} ke paas mil gaye. Sabse sasta combination ${formatINR(total)} ka hai. Ye discovery result hai — main order place nahi kar sakta, aap cart mein add kar sakte hain.`,
      hits,
      suggestions: [
        'Show me the nearest shop with all these items',
        'Compare prices for milk',
        'Find deals under ₹100',
      ],
    }
  }

  const hits = sortHits(
    scored.map(({ product, shop }) => {
      const cheapest = scored.every(
        (row) => effectivePrice(row.product) >= effectivePrice(product),
      )
      const nearest = scored.every((row) => row.shop.distanceKm >= shop.distanceKm)
      const favourite = ctx.favouriteShopIds.includes(shop.id)
      let explanation = 'Available at a nearby shop'
      if (!product.inStock) explanation = 'Currently out of stock'
      else if (product.deal) explanation = 'Near-expiry deal price'
      else if (cheapest) explanation = 'Lowest price among nearby shops'
      else if (nearest) explanation = 'Closest shop with this item'
      else if (favourite) explanation = 'From your favourite shop'
      return buildHit(product, shop, explanation)
    }),
  )

  const comparison =
    wantsCompare || wantsShops
      ? comparisonFor(
          `${keywords[0].replace(/\b\w/g, (c) => c.toUpperCase())} · price comparison`,
          scored,
        )
      : undefined

  const inStockHits = hits.filter((hit) => hit.inStock)
  const cheapestHit = inStockHits[0]
  const nearestHit = [...inStockHits].sort((a, b) => a.distanceKm - b.distanceKm)[0]

  let text: string
  if (wantsShops) {
    const shopsCount = new Set(scored.map((row) => row.shop.id)).size
    text = `${keywords.join(', ')} ${shopsCount} nearby shop${shopsCount > 1 ? 's' : ''} mein milta hai. ${
      nearestHit
        ? `Sabse paas ${nearestHit.shopName} (${nearestHit.distanceKm} km) hai, ${formatINR(nearestHit.price)} per ${nearestHit.unit}.`
        : 'Filhaal stock khatam hai.'
    } ${wantsCompare ? 'Neeche price comparison dekhein.' : 'Neeche sab options hain.'}`
  } else if (wantsCheapest && cheapestHit) {
    text = `Sabse sasta option ${cheapestHit.shopName} mein ${formatINR(cheapestHit.price)} per ${cheapestHit.unit} hai, ${cheapestHit.distanceKm} km door. ${ceiling ? `Ye aapke ${formatINR(ceiling)} budget ke andar hai.` : ''} ${
      inStockHits.length > 1
        ? `${inStockHits.length} options stock mein hain.`
        : ''
    }`
  } else if (wantsCompare) {
    text = `${keywords.join(', ')} ke prices ${new Set(scored.map((row) => row.shop.id)).size} nearby shops mein compare kiye. Delivery fee aur distance ke hisaab se sabse accha value option highlight kiya hai.`
  } else {
    text = `Mujhe ${keywords.join(', ')} ke ${hits.length} options mile ${place} ke aas-paas. ${
      cheapestHit
        ? `Sabse accha value: ${cheapestHit.name} at ${formatINR(cheapestHit.price)} — ${cheapestHit.shopName}, ${cheapestHit.distanceKm} km.`
        : 'Filhaal koi option stock mein nahi hai.'
    } ${ceiling ? `Aapka ${formatINR(ceiling)} budget apply kiya gaya hai.` : ''}`
  }

  return {
    text,
    hits,
    comparison,
    clarification:
      hits.length > 1
        ? ['Do you want the nearest shop or the lowest price?', 'Should I add this to your cart?']
        : undefined,
    suggestions: [
      'Compare prices for milk',
      'Find rice under ₹100 per kg',
      'Show nearby shops selling notebook',
    ],
  }
}

export async function askLocalizeIt(rawQuery: string, ctx: AiContext): Promise<AiAnswer> {
  if (!integrationStatus.ai) {
    return {
      text: 'AI is not configured. Add VITE_AI_API_KEY and VITE_AI_BASE_URL to enable the real shopping assistant.',
      hits: [],
      suggestions: aiSuggestedQueries.slice(0, 3),
    }
  }

  const provider = envConfig.ai.provider.toLowerCase()
  const providerKey =
    provider === 'groq'
      ? envConfig.ai.groqApiKey
      : provider === 'huggingface'
        ? envConfig.ai.huggingFaceApiKey
        : provider === 'openrouter'
          ? envConfig.ai.openRouterApiKey
          : provider === 'gemini'
            ? envConfig.ai.geminiApiKey
            : envConfig.ai.apiKey
  const model =
    envConfig.ai.model ||
    (provider === 'groq'
      ? 'llama-3.1-8b-instant'
      : provider === 'huggingface'
        ? 'meta-llama/Llama-3.1-8B-Instruct'
        : provider === 'openrouter'
          ? 'google/gemma-3-27b-it:free'
          : provider === 'gemini'
            ? 'gemini-2.5-flash-lite'
            : 'gpt-4o-mini')
  const baseUrl =
    envConfig.ai.baseUrl ||
    (provider === 'groq'
      ? 'https://api.groq.com/openai/v1'
      : provider === 'huggingface'
        ? 'https://router.huggingface.co/v1'
        : provider === 'openrouter'
          ? 'https://openrouter.ai/api/v1'
          : '')
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`
  const catalogue = ctx.products.filter((product) => !product.archived).map((product) => ({
    id: product.id,
    name: product.name,
    unit: product.unit,
    price: effectivePrice(product),
    stock: product.stock,
    shopId: product.shopId,
    shop: ctx.shops.find((shop) => shop.id === product.shopId)?.name,
    distanceKm: ctx.shops.find((shop) => shop.id === product.shopId)?.distanceKm,
  }))

  try {
    const systemPrompt =
      'You are LocalizeIt shopping AI. Use only the supplied catalogue. Never place orders or claim payment. Return JSON with text, productIds (array), and suggestions (array).'
    const userPrompt = JSON.stringify({
      query: rawQuery,
      area: ctx.area,
      favouriteShopIds: ctx.favouriteShopIds,
      catalogue,
    })
    let content: string | undefined
    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${providerKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          }),
        },
      )
      if (!response.ok) throw new Error(`Gemini request failed with HTTP ${response.status}`)
      const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
      content = payload.candidates?.[0]?.content?.parts?.[0]?.text
    } else {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${providerKey}`,
          ...(provider === 'openrouter' ? { 'HTTP-Referer': window.location.origin, 'X-Title': 'LocalizeIt' } : {}),
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      })
      if (!response.ok) throw new Error(`${provider} request failed with HTTP ${response.status}`)
      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
      content = payload.choices?.[0]?.message?.content
    }
    if (!content) throw new Error('AI response did not contain a message')
    const parsed = JSON.parse(content) as { text?: string; productIds?: string[]; suggestions?: string[] }
    const shopMap = new Map(ctx.shops.map((shop) => [shop.id, shop]))
    const hits = (parsed.productIds ?? [])
      .map((id) => ctx.products.find((product) => product.id === id))
      .filter((product): product is Product => Boolean(product))
      .map((product) => {
        const shop = shopMap.get(product.shopId)
        return shop ? buildHit(product, shop, 'Recommended by LocalizeIt AI') : undefined
      })
      .filter((hit): hit is AiProductHit => Boolean(hit))
    return {
      text: parsed.text?.trim() || 'I could not find a useful answer for that request.',
      hits,
      suggestions: parsed.suggestions?.filter(Boolean).slice(0, 5) ?? aiSuggestedQueries.slice(0, 3),
    }
  } catch (error) {
    console.warn('LocalizeIt AI request failed:', error)
    return {
      text: 'The AI provider could not be reached. Please try again shortly.',
      hits: [],
      suggestions: aiSuggestedQueries.slice(0, 3),
    }
  }
}
