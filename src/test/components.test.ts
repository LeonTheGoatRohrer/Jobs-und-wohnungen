import { fireEvent, render } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import SearchPanel from '@/components/search/SearchPanel.vue'
import ListingCard from '@/components/results/ListingCard.vue'
import type { JobListing } from '@/models/listings'
import type { SearchFilters } from '@/services/searchService'

const filters: SearchFilters = { kind: 'jobs', region: 'innsbruck', query: '', employmentType: 'all', withoutTraining: false, jobCategory: 'all', housingType: 'all', preferIndependent: false, sort: 'best' }
const listing: JobListing = { id: 'j1', title: 'Putzkraft', originalUrl: 'https://jobs.oehweb.at/job/j1/', source: 'oeh-jobs', fetchedAt: '2026-09-07', location: 'Innsbruck', employer: 'Familienzentrum', employmentType: 'Geringfügig', tasks: [], requirements: [], categories: [], suitability: { level: 'very-suitable', score: 5, reasons: ['Bezahlung ist angegeben'] } }

describe('search and result components', () => {
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
})
