import type { ServiceArea } from '@/types'

/**
 * Rural + Tier-2/3 service area seeds.
 * Villages intentionally include pickup-only and unserved PIN codes so the
 * serviceability experience can be demonstrated end to end.
 */
export const serviceAreas: ServiceArea[] = [
  {
    id: 'area-gyanpur',
    state: 'Uttar Pradesh',
    district: 'Bhadohi',
    town: 'Gyanpur',
    village: '',
    pincode: '221304',
    serviceability: 'full',
    deliveryEtaMins: 35,
  },
  {
    id: 'area-aurai',
    state: 'Uttar Pradesh',
    district: 'Bhadohi',
    town: 'Gyanpur',
    village: 'Aurai',
    pincode: '221301',
    serviceability: 'pickup',
    deliveryEtaMins: 0,
  },
  {
    id: 'area-bhadohi',
    state: 'Uttar Pradesh',
    district: 'Bhadohi',
    town: 'Bhadohi',
    village: '',
    pincode: '221401',
    serviceability: 'full',
    deliveryEtaMins: 40,
  },
  {
    id: 'area-suriyawan',
    state: 'Uttar Pradesh',
    district: 'Bhadohi',
    town: 'Suriyawan',
    village: '',
    pincode: '221308',
    serviceability: 'full',
    deliveryEtaMins: 45,
  },
  {
    id: 'area-varanasi',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    town: 'Varanasi',
    village: 'Sarnath',
    pincode: '221007',
    serviceability: 'full',
    deliveryEtaMins: 50,
  },
  {
    id: 'area-prayagraj',
    state: 'Uttar Pradesh',
    district: 'Prayagraj',
    town: 'Prayagraj',
    village: '',
    pincode: '211001',
    serviceability: 'full',
    deliveryEtaMins: 55,
  },
  {
    id: 'area-biharsharif',
    state: 'Bihar',
    district: 'Nalanda',
    town: 'Biharsharif',
    village: '',
    pincode: '232101',
    serviceability: 'full',
    deliveryEtaMins: 38,
  },
  {
    id: 'area-rajgir',
    state: 'Bihar',
    district: 'Nalanda',
    town: 'Rajgir',
    village: '',
    pincode: '803116',
    serviceability: 'pickup',
    deliveryEtaMins: 0,
  },
  {
    id: 'area-chhindwara',
    state: 'Madhya Pradesh',
    district: 'Chhindwara',
    town: 'Chhindwara',
    village: '',
    pincode: '480001',
    serviceability: 'full',
    deliveryEtaMins: 42,
  },
  {
    id: 'area-seoni',
    state: 'Madhya Pradesh',
    district: 'Seoni',
    town: 'Seoni',
    village: 'Barghat',
    pincode: '480667',
    serviceability: 'none',
    deliveryEtaMins: 0,
  },
  {
    id: 'area-banswara',
    state: 'Rajasthan',
    district: 'Banswara',
    town: 'Banswara',
    village: '',
    pincode: '327001',
    serviceability: 'full',
    deliveryEtaMins: 40,
  },
  {
    id: 'area-kushalgarh',
    state: 'Rajasthan',
    district: 'Banswara',
    town: 'Kushalgarh',
    village: 'Kushalgarh',
    pincode: '327601',
    serviceability: 'pickup',
    deliveryEtaMins: 0,
  },
]

export const areaById = (id: string) => serviceAreas.find((a) => a.id === id)

export const defaultAreaId = 'area-gyanpur'

/** Build India → State → District → Town → Area cascade for the picker. */
export interface GeoState {
  state: string
  districts: Array<{
    district: string
    towns: Array<{
      town: string
      areas: ServiceArea[]
    }>
  }>
}

export function buildGeoTree(areas: ServiceArea[]): GeoState[] {
  const states = new Map<string, Map<string, Map<string, ServiceArea[]>>>()
  for (const area of areas) {
    if (!states.has(area.state)) states.set(area.state, new Map())
    const districts = states.get(area.state)!
    if (!districts.has(area.district)) districts.set(area.district, new Map())
    const towns = districts.get(area.district)!
    if (!towns.has(area.town)) towns.set(area.town, [])
    towns.get(area.town)!.push(area)
  }
  return Array.from(states.entries()).map(([state, districts]) => ({
    state,
    districts: Array.from(districts.entries()).map(([district, towns]) => ({
      district,
      towns: Array.from(towns.entries()).map(([town, areasInTown]) => ({
        town,
        areas: areasInTown,
      })),
    })),
  }))
}

export const geoTree = buildGeoTree(serviceAreas)

export const areaLabel = (area: ServiceArea) =>
  area.village ? `${area.village} · ${area.town}` : area.town

export const areaFullLabel = (area: ServiceArea) =>
  [area.village, area.town, area.district, area.state].filter(Boolean).join(', ')

export const serviceabilityLabel: Record<ServiceArea['serviceability'], string> = {
  full: 'Delivery & pickup available',
  pickup: 'Pickup only · delivery not yet available',
  none: 'Not serviceable yet',
}
