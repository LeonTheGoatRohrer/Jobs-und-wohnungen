export type ListingKind = 'jobs' | 'housing'
export type RegionId = 'innsbruck' | 'surroundings'
export type SuitabilityLevel = 'very-suitable' | 'suitable' | 'limited'

export interface SuitabilityResult {
  level: SuitabilityLevel
  score: number
  reasons: string[]
}

export interface ContactDetails {
  names: string[]
  emails: string[]
  phones: string[]
  websites: string[]
  applicationUrls: string[]
}

export interface ListingImage {
  sourceUrl: string
  path?: string
  alt?: string
}

export interface ListingBase {
  id: string
  title: string
  originalUrl: string
  source: 'oeh-jobs' | 'oeh-housing'
  fetchedAt: string
  publishedAt?: string
  validUntil?: string
  location?: string
  description?: string
  contact?: ContactDetails
}

export interface JobListing extends ListingBase {
  source: 'oeh-jobs'
  employer?: string
  employmentType?: string
  salary?: string
  workingHours?: string
  startDate?: string
  tasks: string[]
  requirements: string[]
  categories: string[]
  suitability?: SuitabilityResult
}

export type HousingType = 'garconniere' | 'apartment' | 'shared-room' | 'other'

export interface HousingListing extends ListingBase {
  source: 'oeh-housing'
  housingType: HousingType
  sizeM2?: number
  rooms?: number
  totalRent?: number
  operatingCosts?: string
  heatingCosts?: string
  electricityCosts?: string
  deposit?: string
  oneTimeCosts?: string
  availableFrom?: string
  amenities: string[]
  conditions: string[]
  images?: ListingImage[]
  suitability?: SuitabilityResult
}

export type Listing = JobListing | HousingListing

export interface DataMeta {
  fetchedAt: string
  updateIntervalHours: number
  jobsCount: number
  housingCount: number
  sources: { jobs: string; housing: string }
}

export interface ListingDataFile<T extends Listing> {
  fetchedAt: string
  source: string
  listings: T[]
}

export interface ManualListingEdits {
  [field: string]: string | number | undefined
}
