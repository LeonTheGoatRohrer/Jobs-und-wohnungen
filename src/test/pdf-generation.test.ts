// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createListingsPdf } from '@/services/pdfService'
import type { HousingListing, JobListing } from '@/models/listings'

const makeJob = (id: string): JobListing => ({
  id,
  title: `Lagermitarbeiter:in ${id}`,
  originalUrl: `https://jobs.oehweb.at/job/${id}/`,
  source: 'oeh-jobs',
  fetchedAt: '2026-09-07T12:00:00Z',
  location: 'Innsbruck',
  employer: 'Arbeitgeber',
  salary: '13,90 € brutto / Stunde',
  tasks: ['Waren sortieren'],
  requirements: [],
  categories: ['Lager'],
  suitability: { level: 'very-suitable', score: 5, reasons: ['Bezahlung ist angegeben'] },
})

describe('PDF generation', () => {
  it('creates a non-empty PDF with every exact URL also used as QR payload', async () => {
    const listings = [makeJob('eins'), makeJob('zwei')]
    const result = await createListingsPdf(listings, {}, 'innsbruck', '2026-09-07T12:00:00Z')
    expect(result.blob.size).toBeGreaterThan(2_000)
    expect(result.qrData).toEqual(listings.map((item) => item.originalUrl))
    expect(result.fileName).toMatch(/^Stellenangebote_Innsbruck_\d{4}-\d{2}-\d{2}\.pdf$/)
    const source = new TextDecoder('latin1').decode(await result.blob.arrayBuffer())
    listings.forEach((item) => expect(source).toContain(item.originalUrl))
  })

  it('creates a separate housing PDF with exact link and QR data', async () => {
    const listing: HousingListing = {
      id: 'wohnung-eins', title: 'Garçonnière in Innsbruck', originalUrl: 'https://wohnen.oehweb.at/wohnung/wohnung-eins/',
      source: 'oeh-housing', fetchedAt: '2026-09-07T12:00:00Z', location: 'Wilten, Innsbruck',
      housingType: 'garconniere', totalRent: 650, sizeM2: 32, rooms: 1, operatingCosts: 'inklusive',
      amenities: ['Balkon'], conditions: [], suitability: { level: 'very-suitable', score: 6, reasons: ['Vergleichsweise niedrige Monatsmiete'] },
    }
    const result = await createListingsPdf([listing], {}, 'surroundings', '2026-09-07T12:00:00Z')
    expect(result.blob.size).toBeGreaterThan(2_000)
    expect(result.fileName).toMatch(/^Leistbare_Wohnungen_Innsbruck_Umgebung_\d{4}-\d{2}-\d{2}\.pdf$/)
    expect(result.qrData).toEqual([listing.originalUrl])
    expect(new TextDecoder('latin1').decode(await result.blob.arrayBuffer())).toContain(listing.originalUrl)
  })
})
