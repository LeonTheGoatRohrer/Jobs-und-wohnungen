import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { load } from 'cheerio'
import type { DataMeta, HousingListing, JobListing, ListingDataFile } from '../src/models/listings'
import { parseJobDetail, type JobApiItem } from '../src/parsers/jobsParser'
import { parseHousingDetail } from '../src/parsers/housingParser'
import { matchesRegion } from '../src/config/regions'

const JOBS_API = 'https://jobs.oehweb.at/wp-json/wp/v2/job-listings'
const HOUSING_BASE = 'https://wohnen.oehweb.at'
const outputDirectory = new URL('../public/data/', import.meta.url)
const tempDirectory = new URL('../public/data-next/', import.meta.url)
const fetchedAt = new Date().toISOString()
const userAgent = 'Jobs-und-Wohnungen/1.0 (+https://leonrohrer.at/Jobs-und-wohnungen/; public-data-refresh)'

async function fetchText(url: string, attempt = 1): Promise<{ body: string; headers: Headers }> {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': userAgent, Accept: 'text/html,application/json' }, signal: AbortSignal.timeout(45_000) })
    if (!response.ok) {
      if (attempt < 4 && response.status >= 500) return fetchText(url, attempt + 1)
      throw new Error(`${url} returned ${response.status}`)
    }
    return { body: await response.text(), headers: response.headers }
  } catch (error) {
    if (attempt < 4 && !(error instanceof Error && error.message.includes('returned 404'))) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
      return fetchText(url, attempt + 1)
    }
    throw error
  }
}

async function mapConcurrent<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++
      const item = items[index]
      if (item !== undefined) results[index] = await task(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

async function fetchJobs(): Promise<JobListing[]> {
  const after = new Date(Date.now() - 15 * 86_400_000).toISOString()
  const url = `${JOBS_API}?per_page=100&orderby=date&order=desc&after=${encodeURIComponent(after)}&_embed=1`
  const { body, headers } = await fetchText(url)
  const first = JSON.parse(body) as JobApiItem[]
  const pages = Number(headers.get('x-wp-totalpages') ?? '1')
  const additional = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, async (_, index) => {
    const page = index + 2
    return JSON.parse((await fetchText(`${url}&page=${page}`)).body) as JobApiItem[]
  }))
  const apiItems = [...first, ...additional.flat()].filter((item) => matchesRegion(item.meta?._job_location, 'surroundings'))
  console.log(`Found ${apiItems.length} recent job records in the configured region.`)
  const listings = apiItems.map((item) => parseJobDetail(item, '<html><body></body></html>', fetchedAt))
  const now = Date.now()
  const active = listings.filter((item) => {
    if (item.validUntil) return Date.parse(item.validUntil) >= now
    return Date.parse(item.publishedAt ?? '1970-01-01') >= now - 15 * 86_400_000
  })
  console.log(`Validated ${active.length} current regional job records from the public REST collection.`)
  return active
}

async function categoryLinks(category: string): Promise<Set<string>> {
  const links = new Set<string>()
  for (let page = 1; page <= 30; page += 1) {
    const url = `${HOUSING_BASE}/kategorie/${category}/${page === 1 ? '' : `page/${page}/`}`
    let body: string
    try {
      body = (await fetchText(url)).body
    } catch (error) {
      if (error instanceof Error && error.message.includes('returned 404') && page > 1) break
      throw error
    }
    const $ = load(body)
    let added = 0
    $('.property_listing a[href*="/wohnung/"]').each((_, element) => {
      const href = $(element).attr('href')
      if (!href) return
      const normalized = new URL(href, HOUSING_BASE).href
      const pathname = new URL(normalized).pathname
      if (!pathname.startsWith('/wohnung/') || pathname === '/wohnung/') return
      if (!links.has(normalized)) { links.add(normalized); added += 1 }
    })
    const hasNext = $(`a[href*="/page/${page + 1}/"]`).length > 0
    if (!hasNext || added === 0) break
  }
  return links
}

async function fetchHousing(): Promise<HousingListing[]> {
  const categories = ['wohnung', 'garconniere', 'wg']
  const sets = await Promise.all(categories.map(categoryLinks))
  const typeByUrl = new Map<string, string>()
  sets.forEach((set, index) => set.forEach((url) => typeByUrl.set(url, categories[index] ?? '')))
  const urls = [...typeByUrl.keys()]
  console.log(`Found ${urls.length} unique housing detail pages.`)
  const listings = await mapConcurrent(urls, 3, async (url) => parseHousingDetail(url, (await fetchText(url)).body, fetchedAt, typeByUrl.get(url)))
  console.log(`Parsed ${listings.length} housing detail pages.`)
  return listings
}

function validate(jobs: JobListing[], housing: HousingListing[]): void {
  if (jobs.length < 1) throw new Error(`Validation failed: only ${jobs.length} current jobs`)
  if (housing.length < 3) throw new Error(`Validation failed: only ${housing.length} housing listings`)
  const all = [...jobs, ...housing]
  const urls = new Set<string>()
  for (const listing of all) {
    if (!listing.title || listing.title.length < 3) throw new Error(`Validation failed: missing title for ${listing.id}`)
    const url = new URL(listing.originalUrl)
    if (!['jobs.oehweb.at', 'wohnen.oehweb.at'].includes(url.hostname)) throw new Error(`Validation failed: invalid source URL ${url}`)
    if (urls.has(listing.originalUrl)) throw new Error(`Validation failed: duplicate URL ${listing.originalUrl}`)
    urls.add(listing.originalUrl)
    if (/404|not found|anmeldung|login/i.test(listing.title)) throw new Error(`Validation failed: error page parsed as listing ${listing.title}`)
  }
}

async function main(): Promise<void> {
  console.log('Fetching public ÖH listings…')
  const mode = process.argv[2]
  const existingJobs = async (): Promise<JobListing[]> => JSON.parse(await readFile(new URL('jobs.json', outputDirectory), 'utf8')).listings as JobListing[]
  const existingHousing = async (): Promise<HousingListing[]> => JSON.parse(await readFile(new URL('housing.json', outputDirectory), 'utf8')).listings as HousingListing[]
  const [jobs, housing] = await Promise.all([
    mode === '--housing-only' ? existingJobs() : fetchJobs(),
    mode === '--jobs-only' ? existingHousing() : fetchHousing(),
  ])
  validate(jobs, housing)
  const meta: DataMeta = { fetchedAt, jobsCount: jobs.length, housingCount: housing.length, sources: { jobs: JOBS_API, housing: `${HOUSING_BASE}/` } }
  const jobsFile: ListingDataFile<JobListing> = { fetchedAt, source: JOBS_API, listings: jobs }
  const housingFile: ListingDataFile<HousingListing> = { fetchedAt, source: `${HOUSING_BASE}/`, listings: housing }
  await rm(tempDirectory, { recursive: true, force: true })
  await mkdir(tempDirectory, { recursive: true })
  await Promise.all([
    writeFile(new URL('jobs.json', tempDirectory), JSON.stringify(jobsFile, null, 2)),
    writeFile(new URL('housing.json', tempDirectory), JSON.stringify(housingFile, null, 2)),
    writeFile(new URL('meta.json', tempDirectory), JSON.stringify(meta, null, 2)),
  ])
  await rm(outputDirectory, { recursive: true, force: true })
  await rename(tempDirectory, outputDirectory)
  console.log(`Validated and wrote ${jobs.length} jobs and ${housing.length} housing listings.`)
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message)
    if (error.cause) console.error('Cause:', error.cause)
  } else console.error(error)
  process.exitCode = 1
})
