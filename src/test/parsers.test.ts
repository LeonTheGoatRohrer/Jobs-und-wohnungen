import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseJobDetail, type JobApiItem } from '@/parsers/jobsParser'
import { parseHousingDetail } from '@/parsers/housingParser'
import { parseEuro } from '@/parsers/shared'

const fixture = (name: string): string => readFileSync(resolve(process.cwd(), 'src', 'test', 'fixtures', name), 'utf8')

describe('listing parsers', () => {
  it('parses a real job-page structure without inventing fields', () => {
    const api: JobApiItem = {
      id: 101803, date: '2026-09-03T08:50:40', link: 'https://jobs.oehweb.at/job/example/',
      title: { rendered: 'Mitarbeiter:in Kassa &#8211; IKEA' }, content: { rendered: '<p>Beschreibung</p>' },
      meta: { _job_location: 'Innsbruck', _company_name: 'IKEA Innsbruck' },
      _embedded: { 'wp:term': [[{ name: 'Verkauf', taxonomy: 'job_listing_category' }]] },
    }
    const result = parseJobDetail(api, fixture('job-detail.html'), '2026-09-07T12:00:00Z')
    expect(result.title).toBe('Mitarbeiter:in Kassa – IKEA')
    expect(result.employer).toBe('IKEA Innsbruck')
    expect(result.salary).toContain('2.535')
    expect(result.validUntil).toContain('2026-09-17')
    expect(result.originalUrl).toBe(api.link)
  })

  it('parses housing costs and missing fields as missing', () => {
    const result = parseHousingDetail('https://wohnen.oehweb.at/wohnung/example/', fixture('housing-detail.html'), '2026-09-07T12:00:00Z')
    expect(result.title).toBe('Garconniere in Wilten')
    expect(result.totalRent).toBe(650)
    expect(result.sizeM2).toBe(32)
    expect(result.operatingCosts).toBe('inklusive')
    expect(result.electricityCosts).toBeUndefined()
    expect(result.housingType).toBe('garconniere')
  })
})

describe('price parser', () => {
  it.each([['€ 650', 650], ['1.250,50 EUR', 1250.5], ['EUR 1.100', 1100], ['nicht angegeben', undefined]])('parses %s', (input, expected) => expect(parseEuro(input)).toBe(expected))
})
