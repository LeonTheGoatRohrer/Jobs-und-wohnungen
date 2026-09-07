import { describe, expect, it } from 'vitest'
import { matchesRegion } from '@/config/regions'
import { rankHousing, rankJob } from '@/services/rankingService'
import { searchListings, sortListings, type SearchFilters } from '@/services/searchService'
import type { HousingListing, JobListing } from '@/models/listings'

const job: JobListing = { id: 'j1', title: 'Lagermitarbeiter:in', originalUrl: 'https://jobs.oehweb.at/job/j1/', source: 'oeh-jobs', fetchedAt: '2026-09-07', publishedAt: '2026-09-06', location: 'Polling bei Zirl', employer: 'Beispiel', employmentType: 'Teilzeit/Geringfügig', salary: '13,90 € brutto / Stunde', description: 'Quereinsteiger willkommen. Keine Ausbildung erforderlich. Führerschein B erforderlich.', tasks: [], requirements: [], categories: ['Lager'] }
const housing: HousingListing = { id: 'h1', title: 'Garçonnière', originalUrl: 'https://wohnen.oehweb.at/wohnung/h1/', source: 'oeh-housing', fetchedAt: '2026-09-07', publishedAt: '2026-09-05', location: 'Wilten, Innsbruck', housingType: 'garconniere', totalRent: 600, operatingCosts: 'inklusive', amenities: [], conditions: [] }
const base: SearchFilters = { kind: 'jobs', region: 'surroundings', query: '', employmentType: 'all', withoutTraining: false, jobCategory: 'all', housingType: 'all', preferIndependent: false, sort: 'best' }

describe('regions and search', () => {
  it('keeps Innsbruck city separate from surroundings', () => {
    expect(matchesRegion('Wilten, Innsbruck', 'innsbruck')).toBe(true)
    expect(matchesRegion('Hall in Tirol', 'innsbruck')).toBe(false)
    expect(matchesRegion('Innsbruck Umgebung', 'innsbruck')).toBe(false)
    expect(matchesRegion('Hall in Tirol', 'surroundings')).toBe(true)
  })
  it('filters by type, query and explicit no-training evidence', () => {
    expect(searchListings([job, housing], { ...base, query: 'Lager', withoutTraining: true })).toHaveLength(1)
    expect(searchListings([job, housing], { ...base, kind: 'housing', region: 'innsbruck' })).toHaveLength(1)
  })
  it('sorts housing by lowest rent and newest date', () => {
    const expensive = { ...housing, id: 'h2', totalRent: 900, publishedAt: '2026-09-07' }
    expect(sortListings([expensive, housing], 'rent-low')[0]?.id).toBe('h1')
    expect(sortListings([housing, expensive], 'newest')[0]?.id).toBe('h2')
  })
})

describe('deterministic ranking', () => {
  it('shows both positive and negative job evidence', () => {
    const ranked = rankJob(job)
    expect(ranked.reasons).toContain('Ausbildung laut Inserat nicht erforderlich')
    expect(ranked.reasons).toContain('Führerschein oder eigenes Fahrzeug wird verlangt')
  })
  it('never claims no training when the listing is silent', () => {
    const ranked = rankJob({ ...job, title: 'Projektkoordinator:in', categories: [], description: 'Freundliches Team.' })
    expect(ranked.reasons).toContain('Ausbildung im Inserat nicht eindeutig angegeben')
    expect(ranked.reasons).not.toContain('Ausbildung laut Inserat nicht erforderlich')
    expect(ranked.level).not.toBe('very-suitable')
  })
  it('ranks an affordable independent home transparently', () => {
    expect(rankHousing(housing).reasons).toEqual(expect.arrayContaining(['Vergleichsweise niedrige Monatsmiete', 'Eigenständige Unterkunft']))
  })
})
