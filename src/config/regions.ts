import type { RegionId } from '@/models/listings'

export interface RegionConfig {
  id: RegionId
  label: string
  pdfLabel: string
  places: readonly string[]
}

const cityDistricts = [
  'innsbruck', 'amras', 'arlz', 'arzler', 'hötting', 'hoetting', 'höttinger au',
  'hötting west', 'igls', 'innenstadt', 'kranebitten', 'mariahilf', 'mühlau',
  'olympisches dorf', 'pradl', 'reichenau', 'saggen', 'sieglanger', 'wilten',
] as const

const surroundingPlaces = [
  'absam', 'aldrans', 'ampass', 'axams', 'birgitz', 'fritzens', 'götzens', 'goetzens',
  'hall in tirol', 'hall', 'hatting', 'kematen', 'lans', 'mils', 'mutters', 'natters',
  'polling', 'rum', 'scharnitz', 'schönberg', 'schoenberg', 'sistrans', 'telfs', 'thaur',
  'völs', 'voels', 'wattens', 'zirl', 'innsbruck umgebung', 'innsbruck-land',
] as const

export const REGIONS: Record<RegionId, RegionConfig> = {
  innsbruck: {
    id: 'innsbruck',
    label: 'Innsbruck',
    pdfLabel: 'Innsbruck',
    places: cityDistricts,
  },
  surroundings: {
    id: 'surroundings',
    label: 'Innsbruck + Umgebung',
    pdfLabel: 'Innsbruck und Umgebung',
    places: [...cityDistricts, ...surroundingPlaces],
  },
}

const normalize = (value: string): string => value.toLocaleLowerCase('de-AT').trim()

export function matchesRegion(location: string | undefined, region: RegionId): boolean {
  if (!location) return false
  const normalized = normalize(location)
  if (region === 'innsbruck' && /innsbruck[ -]?(?:land|umgebung)|innsbruck und umgebung/.test(normalized)) return false
  return REGIONS[region]!.places.some((place) => normalized.includes(place))
}
