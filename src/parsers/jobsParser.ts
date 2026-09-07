import { load } from 'cheerio'
import type { JobListing } from '@/models/listings'
import { cleanText, linesFromText } from './shared'

interface JobApiItem {
  id: number
  date: string
  link: string
  title: { rendered: string }
  content: { rendered: string }
  meta?: { _job_location?: string; _company_name?: string }
  _embedded?: { 'wp:term'?: Array<Array<{ name: string; taxonomy: string }>> }
}

export function parseJobDetail(api: JobApiItem, detailHtml: string, fetchedAt: string): JobListing {
  const $ = load(detailHtml)
  const schema = $('script[type="application/ld+json"]').toArray()
    .map((element) => {
      try { return JSON.parse($(element).text()) as Record<string, unknown> } catch { return undefined }
    })
    .find((value) => value?.['@type'] === 'JobPosting')
  const metaItems = $('.job-listing-meta li').toArray().map((el) => cleanText($(el).html()))
  const detailSalary = metaItems.find((item) => /^Bezahlung:/i.test(item))?.replace(/^Bezahlung:\s*/i, '')
  const detailStartDate = metaItems.find((item) => /^Ab:/i.test(item))?.replace(/^Ab:\s*/i, '')
  const detailDescription = cleanText($('.job_description').html()) || cleanText(api.content.rendered)
  const employer = cleanText($('.company .firmenname').first().text()) || api.meta?._company_name || undefined
  const location = cleanText($('.job-listing-meta .location').first().text()) || api.meta?._job_location || undefined
  const taxonomy = api._embedded?.['wp:term']?.flat() ?? []
  const employmentType = cleanText($('.job-listing-meta .job-type').first().text()) || cleanText(taxonomy.find((term) => term.taxonomy === 'job_listing_type')?.name) || undefined
  const categories = taxonomy.filter((term) => term.taxonomy === 'job_listing_category').map((term) => cleanText(term.name))
  const requirements = extractSection(detailDescription, ['Voraussetzungen', 'Profil', 'mitbringen', 'Anforderungen'])
  const tasks = extractSection(detailDescription, ['Aufgaben', 'Tätigkeit', 'Was du machst'])
  const workingHours = extractWorkingHours(detailDescription)
  const validUntil = typeof schema?.validThrough === 'string' ? schema.validThrough : undefined
  const salary = detailSalary || extractSalary(detailDescription)
  const startDate = detailStartDate || extractStartDate(detailDescription)

  return {
    id: String(api.id), title: cleanText(api.title.rendered), originalUrl: api.link,
    source: 'oeh-jobs', fetchedAt, publishedAt: api.date, ...(validUntil ? { validUntil } : {}),
    ...(location ? { location } : {}), ...(detailDescription ? { description: detailDescription } : {}),
    ...(employer ? { employer } : {}), ...(employmentType ? { employmentType } : {}),
    ...(salary ? { salary } : {}), ...(startDate ? { startDate } : {}),
    ...(workingHours ? { workingHours } : {}), tasks, requirements, categories,
  }
}

function extractSection(text: string, headings: string[]): string[] {
  const lines = linesFromText(text)
  const index = lines.findIndex((line) => headings.some((heading) => line.toLocaleLowerCase('de-AT').includes(heading.toLocaleLowerCase('de-AT'))))
  if (index < 0) return []
  return lines.slice(index + 1, index + 5).filter((line) => line.length < 240)
}

function extractWorkingHours(text: string): string | undefined {
  const explicit = text.match(/Arbeitszeit(?:en)?\s*:\s*([^\n]{3,120})/i)
  if (explicit?.[1]) return explicit[1].trim()
  const weekly = text.match(/\b\d{1,2}(?:[,.]\d+)?\s*(?:Wochenstunden|Stunden pro Woche)\b/i)
  if (weekly?.[0]) return weekly[0].trim()
  const range = text.match(/\bzwischen\s+\d{1,2}(?::\d{2})?\s*(?:Uhr)?\s+und\s+\d{1,2}(?::\d{2})?\s*Uhr\b/i)
  return range?.[0]?.trim()
}

function extractSalary(text: string): string | undefined {
  const labeled = text.match(/(?:Bezahlung|Gehalt|Entgelt|Lohn)\s*:?\s*([^\n]{0,100}(?:€|EUR)[^\n]{0,80})/i)
  if (labeled?.[1]) return labeled[1].trim()
  const amount = text.match(/(?:(?:€|EUR)\s*\d[\d.,-]*|\d[\d.,-]*\s*(?:€|EUR))(?:\s*(?:brutto|netto))?(?:\s*(?:pro|\/|je)\s*(?:Stunde|Monat))?/i)
  return amount?.[0]?.trim()
}

function extractStartDate(text: string): string | undefined {
  const match = text.match(/(?:Arbeitsbeginn|Dienstbeginn|Start|Beginn)\s*:?\s*(sofort|ab sofort|\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}-\d{2}-\d{2})/i)
  return match?.[1]?.trim()
}

export type { JobApiItem }
