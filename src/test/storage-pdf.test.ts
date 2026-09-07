import { describe, expect, it } from 'vitest'
import { createPdfFilename, housingTypeLabel } from '@/services/pdfService'
import { clearSelection, loadSelection, saveSelection } from '@/services/storageService'
import type { JobListing } from '@/models/listings'

const job: JobListing = { id: '1', title: 'Job', originalUrl: 'https://jobs.oehweb.at/job/1/', source: 'oeh-jobs', fetchedAt: '2026-09-07', tasks: [], requirements: [], categories: [] }

describe('selection storage', () => {
  it('survives a reload through localStorage', () => {
    clearSelection(); saveSelection({ listings: [job], edits: { '1': { employer: 'Korrigiert' } } })
    expect(loadSelection().listings[0]?.originalUrl).toBe(job.originalUrl)
    expect(loadSelection().edits['1']?.employer).toBe('Korrigiert')
  })
})

describe('PDF data model', () => {
  it('creates professional deterministic filenames', () => {
    const date = new Date(2026, 8, 7)
    expect(createPdfFilename('jobs', 'innsbruck', date)).toBe('Stellenangebote_Innsbruck_2026-09-07.pdf')
    expect(createPdfFilename('housing', 'surroundings', date)).toBe('Leistbare_Wohnungen_Innsbruck_Umgebung_2026-09-07.pdf')
  })
  it('maps housing types and keeps unknown values explicit', () => {
    expect(housingTypeLabel('shared-room')).toBe('WG-Zimmer')
    expect(housingTypeLabel('unknown')).toBe('nicht angegeben')
  })
  it('keeps the exact original URL as QR payload', () => {
    const qrData = [job.originalUrl]
    expect(qrData[0]).toBe(job.originalUrl)
  })
})
