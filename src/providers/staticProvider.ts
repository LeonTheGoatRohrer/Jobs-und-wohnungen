import type { DataMeta, JobListing, HousingListing, ListingDataFile } from '@/models/listings'
import type { DataBundle, DataProvider } from './DataProvider'

const baseUrl = import.meta.env.BASE_URL

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}data/${path}`, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Daten konnten nicht geladen werden (${response.status}).`)
  return response.json() as Promise<T>
}

export class OehJobsProvider implements DataProvider<JobListing> {
  async load(): Promise<JobListing[]> {
    return (await loadJson<ListingDataFile<JobListing>>('jobs.json')).listings
  }
}

export class OehHousingProvider implements DataProvider<HousingListing> {
  async load(): Promise<HousingListing[]> {
    return (await loadJson<ListingDataFile<HousingListing>>('housing.json')).listings
  }
}

export async function loadAllData(): Promise<DataBundle> {
  const jobsProvider = new OehJobsProvider()
  const housingProvider = new OehHousingProvider()
  const [jobs, housing, meta] = await Promise.all([
    jobsProvider.load(),
    housingProvider.load(),
    loadJson<DataMeta>('meta.json'),
  ])
  return { listings: [...jobs, ...housing], meta }
}
