import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgePercent,
  Bot,
  MapPin,
  Plus,
  RotateCcw,
  Send,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
} from 'lucide-react'
import type { AiMessage } from '@/types'
import { areaById, defaultAreaId } from '@/data/locations'
import { askLocalizeIt, aiSuggestedQueries } from '@/services/aiService'
import { useBuyerStore } from '@/store/buyer'
import { useCartStore } from '@/store/cart'
import { useCatalogStore } from '@/store/catalog'
import { useLocationStore } from '@/store/location'
import { toast } from '@/store/toast'
import { Badge, Button, Card, PageHeader } from '@/components/ui/primitives'
import { ProductImage } from '@/components/ui/images'
import { cn, formatDistance, formatINR, makeId } from '@/utils'
import { integrationStatus } from '@/config/env'

const starterPrompts = [
  'Find rice under ₹100 per kg',
  'Show nearby shops selling milk',
  'Find the cheapest notebook',
  'Compare prices for Tata Salt across local shops',
  'Find all items on my grocery list: rice, milk, notebook, oil',
]

export function AiAssistantPage() {
  const navigate = useNavigate()
  const products = useCatalogStore((s) => s.products)
  const shops = useCatalogStore((s) => s.shops)
  const favourites = useBuyerStore((s) => s.profile.favouriteShopIds)
  const areaId = useLocationStore((s) => s.areaId)
  const area = areaById(areaId) ?? areaById(defaultAreaId)!
  const addToCart = useCartStore((s) => s.add)

  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  const context = useMemo(
    () => ({ products: products.filter((p) => !p.archived), shops, area, favouriteShopIds: favourites }),
    [products, shops, area, favourites],
  )

  useEffect(() => {
    setMessages([
      {
        id: makeId('AI'),
        role: 'assistant',
        text: `Namaste! Main LocalizeIt AI hoon. ${area.village || area.town} ke nearby shops se products dhoondh sakta hoon — prices compare karna, budget ke andar options, ya grocery list ke items. Main sirf discovery karta hoon; order aap khud cart se place karte hain.`,
        suggestions: starterPrompts.slice(0, 3),
        at: new Date().toISOString(),
      },
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, thinking])

  const send = (raw: string) => {
    const query = raw.trim()
    if (!query || thinking) return
    setInput('')
    const userMessage: AiMessage = {
      id: makeId('AI'),
      role: 'user',
      text: query,
      at: new Date().toISOString(),
    }
    setMessages((current) => [...current, userMessage])
    setThinking(true)
    void askLocalizeIt(query, context).then((answer) => {
      setMessages((current) => [
        ...current,
        {
          id: makeId('AI'),
          role: 'assistant',
          text: answer.text,
          hits: answer.hits,
          comparison: answer.comparison,
          clarification: answer.clarification,
          suggestions: answer.suggestions,
          at: new Date().toISOString(),
        },
      ])
      setThinking(false)
    })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ask LocalizeIt AI"
        subtitle={
          integrationStatus.ai
            ? 'AI-powered product discovery using your configured provider. It never places orders or takes payments.'
            : 'Product discovery assistant. Add AI provider keys to enable natural-language recommendations.'
        }
        backTo={() => navigate('/buyer')}
        action={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={RotateCcw}
            onClick={() =>
              setMessages((current) => (current.length > 1 ? current.slice(0, 1) : current))
            }
          >
            Clear chat
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="flex min-h-[560px] flex-col overflow-hidden p-0">
          <div className="flex items-center gap-2.5 border-b border-cream-3 bg-brown-900 px-4 py-3 text-cream">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">LocalizeIt AI · demo</p>
              <p className="text-[9.5px] text-cream/50">
                Searching {shops.filter((s) => s.status === 'approved').length} approved shops · {area.town}
              </p>
            </div>
            <Badge tone="orange">Mock model</Badge>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-cream/60 p-3.5 sm:max-h-[520px]">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onSuggestion={send}
                onAdd={(productId, shopId, name) => {
                  addToCart(productId, shopId)
                  toast('Added to cart', `${name} from the AI suggestion.`, 'success')
                }}
              />
            ))}
            {thinking && (
              <div className="flex items-center gap-2 text-[11px] text-brown-400">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brown-900 text-cream">
                  <Bot className="h-3.5 w-3.5" />
                </span>
                <span className="flex gap-1 rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-card">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-brown-300" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-brown-300 [animation-delay:150ms]" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-brown-300 [animation-delay:300ms]" />
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 border-t border-cream-3 bg-white/80 p-2.5"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about prices, stock, nearby shops…"
              aria-label="Message LocalizeIt AI"
              className="h-10 min-w-0 flex-1 rounded-xl border border-cream-4 bg-white px-3 text-xs text-brown-900 placeholder:text-brown-300 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
            <Button type="submit" size="sm" leftIcon={Send} disabled={!input.trim() || thinking}>
              Send
            </Button>
          </form>
        </Card>

        <div className="space-y-3">
          <Card>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brown-900">
              <Sparkles className="h-3.5 w-3.5 text-orange-500" /> Try a question
            </p>
            <div className="mt-2 space-y-1.5">
              {aiSuggestedQueries.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="flex w-full items-start gap-2 rounded-lg border border-cream-3 bg-white/70 px-2.5 py-2 text-left text-[10.5px] leading-relaxed text-brown-600 transition-colors hover:border-orange-200 hover:text-orange-700"
                >
                  <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-orange-400" />
                  {suggestion}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-3.5">
            <p className="text-xs font-semibold text-brown-900">How this demo works</p>
            <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-brown-400">
              <li>• Matches Hindi/English product words to the local catalogue.</li>
              <li>• Applies a budget filter and sorts by price and stock.</li>
              <li>• Compares the same item across nearby shops.</li>
              <li>• Never places an order — you add items to your cart yourself.</li>
            </ul>
            <div className="mt-2 rounded-lg bg-warning-soft px-2.5 py-2 text-[9.5px] leading-relaxed text-warning">
              This is a deterministic mock, not a live AI model. No prompt or product data leaves your browser.
            </div>
          </Card>

          <Card className="flex items-start gap-2.5 p-3.5">
            <SpanIcon />
            <div>
              <p className="text-[11px] font-semibold text-brown-900">Prefer to browse?</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-brown-400">
                See all products with filters and shop-wise prices.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Link to="/buyer/search">
                  <Button size="sm" variant="secondary" leftIcon={ShoppingBag}>
                    Search
                  </Button>
                </Link>
                <Link to="/buyer/compare">
                  <Button size="sm" variant="secondary" leftIcon={BadgePercent}>
                    Compare
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  onSuggestion,
  onAdd,
}: {
  message: AiMessage
  onSuggestion: (value: string) => void
  onAdd: (productId: string, shopId: string, name: string) => void
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brown-900 px-3 py-2 text-[11.5px] leading-relaxed text-cream">
          {message.text}
        </div>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream-3 text-brown-500">
          <UserRound className="h-3.5 w-3.5" />
        </span>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brown-900 text-cream">
        <Bot className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 max-w-[92%] space-y-2">
        <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 text-[11.5px] leading-relaxed text-brown-600 shadow-card">
          {message.text}
        </div>

        {message.hits && message.hits.length > 0 && (
          <div className="space-y-1.5">
            {message.hits.slice(0, 6).map((hit) => (
              <div key={`${hit.productId}-${hit.shopId}`} className="flex items-center gap-2 rounded-xl border border-cream-3 bg-white/80 p-2">
                <ProductImage name={hit.name} categoryId={hit.categoryId} size="xs" />
                <div className="min-w-0 flex-1">
                  <Link to={`/buyer/products/${hit.productId}`} className="block truncate text-[11px] font-medium text-brown-900">
                    {hit.name}
                  </Link>
                  <p className="truncate text-[9.5px] text-brown-400">
                    {hit.shopName} · {formatDistance(hit.distanceKm)} · {hit.explanation}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-semibold text-brown-800">{formatINR(hit.price)}</p>
                  <p className="text-[8.5px] text-brown-300">/{hit.unit}</p>
                </div>
                <button
                  type="button"
                  disabled={!hit.inStock}
                  onClick={() => onAdd(hit.productId, hit.shopId, hit.name)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-orange-500/40 bg-orange-50 text-orange-600 disabled:opacity-40"
                  aria-label={`Add ${hit.name} to cart`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {message.comparison && (
          <div className="overflow-hidden rounded-xl border border-cream-3 bg-white/85">
            <div className="flex items-center gap-1.5 border-b border-cream-3 bg-cream-2/50 px-2.5 py-1.5">
              <Store className="h-3 w-3 text-orange-500" />
              <p className="text-[10px] font-semibold text-brown-800">{message.comparison.label}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[380px] text-left text-[9.5px]">
                <thead className="bg-cream-2/30 text-brown-400">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Shop</th>
                    <th className="px-2 py-1.5 font-medium">Town</th>
                    <th className="px-2 py-1.5 font-medium">Distance</th>
                    <th className="px-2 py-1.5 font-medium">Price</th>
                    <th className="px-2 py-1.5 font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-2 text-brown-600">
                  {message.comparison.rows.map((row) => (
                    <tr key={row.shopId}>
                      <td className="px-2 py-1.5">
                        <Link to={`/buyer/shops/${row.shopId}`} className="font-medium text-brown-800 hover:text-orange-600">
                          {row.shopName}
                        </Link>
                        {row.deal && <span className="ml-1 text-danger">deal</span>}
                      </td>
                      <td className="px-2 py-1.5">{row.town}</td>
                      <td className="px-2 py-1.5">{formatDistance(row.distanceKm)}</td>
                      <td className="px-2 py-1.5 font-semibold text-brown-800">
                        {formatINR(row.price)}
                        <span className="font-normal text-brown-300">/{row.unit}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        {row.inStock ? <span className="text-success">In stock</span> : <span className="text-danger">Out</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {message.clarification && message.clarification.length > 0 && (
          <div className="rounded-xl border border-info/20 bg-info-soft/50 p-2.5">
            <p className="text-[9.5px] font-semibold text-info">To narrow it down:</p>
            <ul className="mt-1 space-y-0.5 text-[9.5px] text-info/90">
              {message.clarification.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestion(suggestion)}
                className="inline-flex items-center gap-1 rounded-full border border-cream-4 bg-white/80 px-2 py-1 text-[9px] text-brown-500 hover:border-orange-300 hover:text-orange-600"
              >
                <Sparkles className="h-2.5 w-2.5" /> {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SpanIcon() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
      <MapPin className="h-4 w-4" />
    </span>
  )
}
