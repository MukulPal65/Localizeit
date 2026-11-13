import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, Crosshair, Loader2, MapPin, Search } from 'lucide-react'
import type { ServiceArea } from '@/types'
import { buildGeoTree, areaLabel, serviceAreas, serviceabilityLabel } from '@/data/locations'
import { useLocationStore } from '@/store/location'
import { toast } from '@/store/toast'
import { cn } from '@/utils'
import { Badge, Button, Input, Modal, Select } from '@/components/ui/primitives'

const geoTree = buildGeoTree(serviceAreas)

export function LocationChip({ className, dark = false }: { className?: string; dark?: boolean }) {
  const [open, setOpen] = useState(false)
  const areaId = useLocationStore((s) => s.areaId)
  const area = serviceAreas.find((a) => a.id === areaId) ?? serviceAreas[0]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1.5 text-left transition-colors',
          dark
            ? 'border-white/20 bg-white/10 text-cream hover:bg-white/15'
            : 'border-cream-4 bg-white/70 text-brown-700 hover:border-orange-300',
          className,
        )}
      >
        <MapPin className={cn('h-3.5 w-3.5 shrink-0', dark ? 'text-orange-300' : 'text-orange-500')} />
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-semibold leading-3">
            Delivering to {area.village || area.town}
          </span>
          <span className={cn('block truncate text-[9px] leading-3', dark ? 'text-cream/60' : 'text-brown-400')}>
            {area.district}, {area.state} · {area.pincode}
          </span>
        </span>
        <ChevronDown className={cn('h-3 w-3 shrink-0', dark ? 'text-cream/60' : 'text-brown-300')} />
      </button>
      <LocationPicker open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function LocationPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentAreaId = useLocationStore((s) => s.areaId)
  const setArea = useLocationStore((s) => s.setArea)
  const setCoordinates = useLocationStore((s) => s.setCoordinates)
  const [query, setQuery] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)

  const currentArea = serviceAreas.find((a) => a.id === currentAreaId) ?? serviceAreas[0]
  const [state, setState] = useState(currentArea.state)
  const [district, setDistrict] = useState(currentArea.district)
  const [town, setTown] = useState(currentArea.town)

  const states = geoTree
  const districts = useMemo(() => states.find((s) => s.state === state)?.districts ?? [], [state])
  const towns = useMemo(
    () => districts.find((d) => d.district === district)?.towns ?? [],
    [districts, district],
  )
  const areas = useMemo(() => towns.find((t) => t.town === town)?.areas ?? [], [towns, town])

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return [] as ServiceArea[]
    return serviceAreas.filter((area) =>
      `${area.village} ${area.town} ${area.district} ${area.state} ${area.pincode}`
        .toLowerCase()
        .includes(term),
    )
  }, [query])

  const choose = (area: ServiceArea, viaGps = false) => {
    setArea(area.id, viaGps)
    toast(
      `Location set to ${areaLabel(area)}`,
      area.serviceability === 'none'
        ? 'LocalizeIt is not serviceable here yet. You can still browse shops in nearby towns.'
        : area.serviceability === 'pickup'
          ? 'Pickup is available. Delivery is not yet available in this village.'
          : 'Delivery and pickup are both available.',
      area.serviceability === 'full' ? 'success' : 'info',
    )
    onClose()
  }

  const useGps = () => {
    setGpsLoading(true)
    if (!navigator.geolocation) {
      setGpsLoading(false)
      toast('Location unavailable', 'This browser does not support GPS location.', 'error')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${coords.latitude}&lon=${coords.longitude}`,
          )
          const result = response.ok ? ((await response.json()) as { display_name?: string; address?: Record<string, string> }) : {}
          const address = result.address ?? {}
          const detected =
            serviceAreas.find((area) => area.pincode === address.postcode) ??
            serviceAreas.find((area) => area.town.toLowerCase() === (address.town ?? address.city ?? '').toLowerCase()) ??
            currentArea
          setCoordinates({ latitude: coords.latitude, longitude: coords.longitude }, result.display_name)
          setState(detected.state)
          setDistrict(detected.district)
          setTown(detected.town)
          setQuery('')
          choose(detected, true)
        } catch (error) {
          console.warn('Reverse geocoding failed:', error)
          setCoordinates({ latitude: coords.latitude, longitude: coords.longitude })
          toast('Location detected', 'We could not resolve the address, but your coordinates were saved.', 'info')
        } finally {
          setGpsLoading(false)
        }
      },
      (error) => {
        setGpsLoading(false)
        toast('Location permission needed', error.message, 'error')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Choose your location"
      description="Village, town or city — LocalizeIt works across all of them."
      placement="sheet"
      size="md"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            leftIcon={gpsLoading ? Loader2 : Crosshair}
            className="flex-1"
            onClick={useGps}
            disabled={gpsLoading}
          >
            {gpsLoading ? 'Detecting…' : 'Use my location (mock)'}
          </Button>
          <span className="flex items-center rounded-xl border border-dashed border-warning/40 bg-warning-soft px-2 text-[9px] font-medium leading-tight text-warning">
            Uses your
            <br />
            device GPS
          </span>
        </div>

        <Input
          placeholder="Search village, town or PIN code"
          leftIcon={Search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {results.length > 0 && (
          <div className="space-y-1.5">
            {results.slice(0, 5).map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => choose(area)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-cream-3 bg-white/80 px-3 py-2.5 text-left transition-colors hover:border-orange-300"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-brown-900">
                    {area.village ? `${area.village} · ${area.town}` : area.town}
                  </span>
                  <span className="text-[11px] text-brown-400">
                    {area.district}, {area.state} · {area.pincode}
                  </span>
                </span>
                <ServiceTag area={area} />
              </button>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-cream-3 bg-white/70 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brown-400">
            Browse the service area
          </p>
          <div className="grid gap-2">
            <Select
              label="State"
              value={state}
              onChange={(event) => {
                const nextState = event.target.value
                setState(nextState)
                const nextDistrict = states.find((s) => s.state === nextState)?.districts[0]
                setDistrict(nextDistrict?.district ?? '')
                setTown(nextDistrict?.towns[0]?.town ?? '')
              }}
              options={states.map((s) => ({ value: s.state, label: s.state }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="District"
                value={district}
                onChange={(event) => {
                  const nextDistrict = event.target.value
                  setDistrict(nextDistrict)
                  setTown(districts.find((d) => d.district === nextDistrict)?.towns[0]?.town ?? '')
                }}
                options={districts.map((d) => ({ value: d.district, label: d.district }))}
              />
              <Select
                label="Town / Tehsil"
                value={town}
                onChange={(event) => setTown(event.target.value)}
                options={towns.map((t) => ({ value: t.town, label: t.town }))}
              />
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            {areas.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => choose(area)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                  area.id === currentAreaId
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-transparent bg-cream-2/60 hover:border-orange-200',
                )}
              >
                <span>
                  <span className="block text-xs font-medium text-brown-800">
                    {area.village || area.town}
                  </span>
                  <span className="text-[10px] text-brown-400">PIN {area.pincode}</span>
                </span>
                {area.id === currentAreaId ? (
                  <CheckCircle2 className="h-4 w-4 text-orange-500" />
                ) : (
                  <ServiceTag area={area} />
                )}
              </button>
            ))}
            {areas.length === 0 && (
              <p className="py-2 text-center text-[11px] text-brown-400">
                No localities listed for this town yet.
              </p>
            )}
          </div>
        </div>

        <p className="text-[10px] leading-relaxed text-brown-400">
          {serviceabilityLabel[currentArea.serviceability]} in {currentArea.town}. Serviceability is mock
          demo data and does not represent a live coverage map.
        </p>
      </div>
    </Modal>
  )
}

function ServiceTag({ area }: { area: ServiceArea }) {
  if (area.serviceability === 'full') return <Badge tone="success">Delivery</Badge>
  if (area.serviceability === 'pickup') return <Badge tone="info">Pickup only</Badge>
  return <Badge tone="neutral">Waitlist</Badge>
}

/** Inline banner explaining serviceability for the selected area. */
export function ServiceabilityBanner({ area }: { area: ServiceArea }) {
  if (area.serviceability === 'full') return null
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed',
        area.serviceability === 'pickup'
          ? 'border-info/20 bg-info-soft text-info'
          : 'border-warning/20 bg-warning-soft text-warning',
      )}
    >
      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {area.serviceability === 'pickup'
          ? `${area.village || area.town} mein abhi pickup available hai. Delivery jald shuru hoga — aap shop se collect kar sakte hain.`
          : `${area.village || area.town} abhi serviceable nahi hai. Nearby town shops browse karein ya waitlist join karein.`}
      </span>
    </div>
  )
}
