import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MapPin, Store } from 'lucide-react'
import { areaById } from '@/data/locations'
import { shopsForArea } from '@/services/catalogService'
import { useBuyerStore } from '@/store/buyer'
import { useCatalogStore } from '@/store/catalog'
import { useLocationStore } from '@/store/location'
import { Chip, EmptyState, Card, Button } from '@/components/ui/primitives'
import { ShopCard } from '@/components/shared/ProductCard'
import { ServiceabilityBanner } from '@/components/shared/LocationPicker'
import { SearchBar } from '@/components/shared/SearchBar'

const tabs = [
  { id: 'all', label: 'All shops' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'pickup', label: 'Pickup' },
  { id: 'favourites', label: 'Favourites' },
]

export function BuyerShopsPage() {
  const shops = useCatalogStore((s) => s.shops)
  const favourites = useBuyerStore((s) => s.profile.favouriteShopIds)
  const areaId = useLocationStore((s) => s.areaId)
  const area = areaById(areaId) ?? areaById('area-gyanpur')!
  const [tab, setTab] = useState('all')
  const [nearbyOnly, setNearbyOnly] = useState(true)
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const approved = shops.filter((shop) => shop.status === 'approved')
    const pool = nearbyOnly ? shopsForArea(shops, area) : approved
    const term = query.trim().toLowerCase()
    return pool.filter((shop) => {
      if (tab === 'delivery' && !shop.delivery) return false
      if (tab === 'pickup' && !shop.pickup) return false
      if (tab === 'favourites' && !favourites.includes(shop.id)) return false
      if (!term) return true
      return `${shop.name} ${shop.categoryName} ${shop.tagline} ${shop.town}`.toLowerCase().includes(term)
    })
  }, [shops, nearbyOnly, area, tab, favourites, query])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-brown-900">Nearby shops</h1>
        <p className="mt-1 text-xs text-brown-400">
          Verified local shops in {area.village || area.town}. Each shop sets its own pickup and delivery.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((item) => (
          <Chip key={item.id} active={tab === item.id} onClick={() => setTab(item.id)}>
            {item.id === 'favourites' && <Heart className="h-3 w-3" />}
            {item.label}
            {item.id === 'favourites' && favourites.length > 0 && (
              <span className="rounded-full bg-orange-500/15 px-1 text-[9px] font-semibold text-orange-700">
                {favourites.length}
              </span>
            )}
          </Chip>
        ))}
        <Chip active={nearbyOnly} onClick={() => setNearbyOnly(!nearbyOnly)}>
          <MapPin className="h-3 w-3" /> {nearbyOnly ? 'My area' : 'All towns'}
        </Chip>
      </div>

      <SearchBar
        placeholder="Search shop name or category…"
        onSubmit={(value) => setQuery(value)}
        showAi={false}
        compact
      />

      <ServiceabilityBanner area={area} />

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-brown-400">
          {results.length} shop{results.length === 1 ? '' : 's'} found
          {tab === 'favourites' && ' in your favourites'}
        </p>
        <button
          type="button"
          onClick={() => setTab('all')}
          className="text-[10px] font-medium text-orange-600 hover:text-orange-700"
        >
          Reset filters
        </button>
      </div>

      {results.length > 0 ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {results.map((shop) => (
            <ShopCard key={shop.id} shop={shop} variant="horizontal" />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Store}
            title={tab === 'favourites' ? 'No favourite shops yet' : 'No shops match these filters'}
            description={
              tab === 'favourites'
                ? 'Tap the heart on any shop to keep it handy for reordering.'
                : 'Try clearing the filters or searching in all demo towns.'
            }
            action={
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setNearbyOnly(false)}>
                  Search all towns
                </Button>
                <Button size="sm" onClick={() => setTab('all')}>
                  Show all shops
                </Button>
              </div>
            }
          />
        </Card>
      )}

      <p className="text-center text-[10px] text-brown-300">
        Want your shop listed?{' '}
        <Link to="/" className="font-medium text-orange-600">
          Apply as a shopkeeper
        </Link>{' '}
        from the demo entry screen.
      </p>
    </div>
  )
}
