import { fireEvent, render } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import SearchPanel from '@/components/search/SearchPanel.vue'
import ListingCard from '@/components/results/ListingCard.vue'
import PublicationStatus from '@/components/common/PublicationStatus.vue'
import type { HousingListing, JobListing } from '@/models/listings'
import type { SearchFilters } from '@/services/searchService'

const filters: SearchFilters = { kind: 'jobs', region: 'innsbruck', query: '', employmentType: 'all', withoutTraining: false, jobCategory: 'all', housingType: 'all', preferIndependent: false, sort: 'best' }
const listing: JobListing = { id: 'j1', title: 'Putzkraft', originalUrl: 'https://jobs.oehweb.at/job/j1/', source: 'oeh-jobs', fetchedAt: '2026-09-07', location: 'Innsbruck', employer: 'Familienzentrum', employmentType: 'Geringfügig', tasks: [], requirements: [], categories: [], suitability: { level: 'very-suitable', score: 5, reasons: ['Bezahlung ist angegeben'] } }
const housing: HousingListing = { id: 'h1', title: 'Wohnung in Wilten', originalUrl: 'https://wohnen.oehweb.at/wohnung/h1/', source: 'oeh-housing', fetchedAt: '2026-09-07', location: 'Innsbruck', housingType: 'apartment', amenities: [], conditions: [], images: [{ sourceUrl: 'https://wohnen.oehweb.at/wp-content/uploads/wohnung.jpg', path: 'data/images/h1/01.jpg', alt: 'Wohnraum' }] }

describe('search and result components', () => {
  it('shows the publication time and automatic data interval', () => {
    const view = render(PublicationStatus, { props: { publishedAt: '2026-09-07T20:02:35Z', dataFetchedAt: '2026-09-07T19:48:47Z', updateIntervalHours: 6 } })
    expect(view.getByText('Webseite zuletzt veröffentlicht')).toBeTruthy()
    expect(view.getByText('Alle 6 Stunden')).toBeTruthy()
    expect(view.getAllByText('07.09.2026')).toHaveLength(2)
    expect(view.getByText('22:02 Uhr · Wiener Zeit')).toBeTruthy()
    expect(view.getByText('21:48 Uhr · Wiener Zeit')).toBeTruthy()
  })
  it('shows the simple two-part search and submits', async () => {
    const view = render(SearchPanel, { props: { modelValue: { ...filters }, loading: false } })
    expect(view.getByText('Was möchtest du suchen?')).toBeTruthy()
    expect(view.getByText('Wo möchtest du suchen?')).toBeTruthy()
    await fireEvent.click(view.getByRole('button', { name: 'Angebote suchen' }))
    expect(view.emitted().search).toHaveLength(1)
  })
  it('renders evidence, original link and selection control', async () => {
    const view = render(ListingCard, { props: { listing, selected: false }, global: { stubs: { FontAwesomeIcon: true } } })
    expect(view.getByText('Putzkraft')).toBeTruthy()
    expect(view.getByText('Bezahlung ist angegeben')).toBeTruthy()
    expect(view.getByRole('link', { name: /Originalinserat/ }).getAttribute('href')).toBe(listing.originalUrl)
    await fireEvent.click(view.getByRole('checkbox'))
    expect(view.emitted()['toggle']).toHaveLength(1)
  })
  it('shows available original images for housing listings', () => {
    const view = render(ListingCard, { props: { listing: housing, selected: false }, global: { stubs: { FontAwesomeIcon: true } } })
    const image = view.getByRole('img', { name: 'Wohnraum' })
    expect(image.getAttribute('src')).toContain('/data/images/h1/01.jpg')
    expect(view.getByText('1 Bild aus dem Originalinserat')).toBeTruthy()
  })
  it('clearly identifies housing listings without images', () => {
    const view = render(ListingCard, { props: { listing: { ...housing, images: [] }, selected: false }, global: { stubs: { FontAwesomeIcon: true } } })
    expect(view.getByText('Keine Bilder verfügbar')).toBeTruthy()
    expect(view.getByText('Im Originalinserat wurden keine verwendbaren Wohnungsbilder gefunden.')).toBeTruthy()
  })
})
