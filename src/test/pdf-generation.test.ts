// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createListingsPdf } from '@/services/pdfService'
import type { JobListing } from '@/models/listings'

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
})
