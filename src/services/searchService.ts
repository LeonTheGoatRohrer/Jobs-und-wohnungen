import { matchesRegion } from '@/config/regions'
import type { HousingListing, JobListing, Listing, RegionId } from '@/models/listings'
import { rankHousing, rankJob } from './rankingService'

export interface SearchFilters {
  kind: 'jobs' | 'housing'
  region: RegionId
  query: string
  employmentType: string
  withoutTraining: boolean
  jobCategory: string
  maxRent?: number
  housingType: string
  preferIndependent: boolean
  sort: string
}

const normalized = (value: string): string => value.toLocaleLowerCase('de-AT')

export function searchListings(listings: Listing[], filters: SearchFilters): Listing[] {
  const query = normalized(filters.query.trim())
  const filtered = listings.filter((item) => {
    if (filters.kind === 'jobs' && item.source !== 'oeh-jobs') return false
    if (filters.kind === 'housing' && item.source !== 'oeh-housing') return false
    if (!matchesRegion(item.location, filters.region)) return false
    if (query && !normalized(searchableText(item)).includes(query)) return false
    if (item.source === 'oeh-jobs') return matchesJob(item, filters)
    return matchesHousing(item, filters)
  }).map((item) => ({ ...item, suitability: item.source === 'oeh-jobs' ? rankJob(item) : rankHousing(item) }))
  return sortListings(filtered, filters.sort)
}

function searchableText(item: Listing): string {
  if (item.source === 'oeh-jobs') return `${item.title} ${item.employer ?? ''} ${item.description ?? ''} ${item.location ?? ''}`
  return `${item.title} ${item.description ?? ''} ${item.location ?? ''}`
}

function matchesJob(item: JobListing, filters: SearchFilters): boolean {
  if (filters.employmentType !== 'all' && !normalized(item.employmentType ?? '').includes(filters.employmentType)) return false
  if (filters.withoutTraining) {
    const text = normalized(`${item.description ?? ''} ${item.requirements.join(' ')}`)
    if (!['keine ausbildung erforderlich', 'keine vorkenntnisse', 'quereinsteiger'].some((term) => text.includes(term))) return false
  }
  if (filters.jobCategory !== 'all') {
    const text = normalized(`${item.title} ${item.categories.join(' ')} ${item.description ?? ''}`)
    if (!text.includes(filters.jobCategory)) return false
  }
  return true
}

function matchesHousing(item: HousingListing, filters: SearchFilters): boolean {
  if (filters.maxRent !== undefined && (item.totalRent === undefined || item.totalRent > filters.maxRent)) return false
  if (filters.housingType !== 'all' && item.housingType !== filters.housingType) return false
  if (filters.preferIndependent && item.housingType === 'shared-room') return false
  return true
}

export function sortListings(listings: Listing[], sort: string): Listing[] {
  return [...listings].sort((a, b) => {
    if (sort === 'newest') return Date.parse(b.publishedAt ?? '1970-01-01') - Date.parse(a.publishedAt ?? '1970-01-01')
    if (sort === 'rent-low') return (a.source === 'oeh-housing' ? a.totalRent ?? Infinity : Infinity) - (b.source === 'oeh-housing' ? b.totalRent ?? Infinity : Infinity)
    if (sort === 'size') return (b.source === 'oeh-housing' ? b.sizeM2 ?? 0 : 0) - (a.source === 'oeh-housing' ? a.sizeM2 ?? 0 : 0)
    return (b.suitability?.score ?? 0) - (a.suitability?.score ?? 0)
  })
}
