<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'
import PublicationStatus from '@/components/common/PublicationStatus.vue'
import SearchPanel from '@/components/search/SearchPanel.vue'
import ListingCard from '@/components/results/ListingCard.vue'
import SelectionPanel from '@/components/selection/SelectionPanel.vue'
import PdfPreview from '@/components/pdf/PdfPreview.vue'
import { loadAllData } from '@/providers/staticProvider'
import { searchListings, type SearchFilters } from '@/services/searchService'
import { clearSelection, loadSelection, saveSelection } from '@/services/storageService'
import { createListingsPdf, type PdfDocumentResult } from '@/services/pdfService'
import type { DataMeta, Listing, ManualListingEdits } from '@/models/listings'

const allListings = ref<Listing[]>([])
const meta = ref<DataMeta>()
const loading = ref(true)
const error = ref('')
const searched = ref(false)
const visibleCount = ref(10)
const step = ref<'search' | 'selection'>('search')
const stored = loadSelection()
const selected = ref<Listing[]>(stored.listings)
const edits = reactive<Record<string, ManualListingEdits>>(stored.edits)
const generating = ref(false)
const preview = ref<(PdfDocumentResult & { url: string })>()
const selectionNotice = ref('')
const buildTimestamp = __BUILD_TIMESTAMP__

const filters = reactive<SearchFilters>({
  kind: 'jobs', region: 'innsbruck', query: '', employmentType: 'all', withoutTraining: false,
  jobCategory: 'all', housingType: 'all', preferIndependent: false, sort: 'best',
})

const results = computed(() => searched.value ? searchListings(allListings.value, filters) : [])
const visibleResults = computed(() => results.value.slice(0, visibleCount.value))
const sourceAgeHours = computed(() => meta.value ? (Date.now() - Date.parse(meta.value.fetchedAt)) / 3_600_000 : 0)
const updatedLabel = computed(() => meta.value ? new Intl.DateTimeFormat('de-AT', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Vienna' }).format(new Date(meta.value.fetchedAt)) : 'nicht verfügbar')

onMounted(async () => {
  try {
    const bundle = await loadAllData()
    allListings.value = bundle.listings
    meta.value = bundle.meta
    if (selected.value.length) {
      const current = new Map(bundle.listings.map((listing) => [`${listing.source}-${listing.id}`, listing]))
      selected.value = selected.value.map((listing) => current.get(`${listing.source}-${listing.id}`) ?? listing)
      persistSelection()
    }
  } catch { error.value = 'Die ÖH-Daten konnten derzeit nicht geladen werden.' }
  finally { loading.value = false }
})

onBeforeUnmount(() => { if (preview.value) URL.revokeObjectURL(preview.value.url) })

function persistSelection(): void { saveSelection({ listings: selected.value, edits }) }

function runSearch(): void { searched.value = true; visibleCount.value = 10; step.value = 'search'; requestAnimationFrame(() => document.querySelector('#results-title')?.scrollIntoView({ behavior: 'smooth' })) }
function isSelected(item: Listing): boolean { return selected.value.some((entry) => entry.id === item.id && entry.source === item.source) }
function toggle(item: Listing): void {
  if (isSelected(item)) {
    selected.value = selected.value.filter((entry) => !(entry.id === item.id && entry.source === item.source))
    persistSelection()
    return
  }
  const existingSource = selected.value[0]?.source
  if (existingSource && existingSource !== item.source) {
    selectionNotice.value = 'Jobs und Wohnungen werden getrennt exportiert. Setze die bestehende Auswahl zurück, bevor du den Angebotstyp wechselst.'
    return
  }
  selectionNotice.value = ''
  selected.value = [...selected.value, item]
  persistSelection()
}
function resetSelection(): void { selected.value = []; Object.keys(edits).forEach((key) => delete edits[key]); clearSelection() }
function updateEdit(id: string, field: string, value: string): void { edits[id] = { ...(edits[id] ?? {}), [field]: value }; persistSelection() }
async function makePreview(): Promise<void> {
  if (!meta.value || !selected.value.length) return
  generating.value = true
  try {
    const result = await createListingsPdf(selected.value, edits, filters.region, meta.value.fetchedAt)
    if (preview.value) URL.revokeObjectURL(preview.value.url)
    preview.value = { ...result, url: URL.createObjectURL(result.blob) }
  } finally { generating.value = false }
}
function downloadPdf(): void {
  if (!preview.value) return
  const link = document.createElement('a'); link.href = preview.value.url; link.download = preview.value.fileName; link.click()
}
</script>

<template>
  <AppHeader :selected-count="selected.length" :step="step" @open-selection="step = 'selection'" />
  <main id="main-content">
    <template v-if="step === 'search'">
      <section class="intro"><div><p class="eyebrow">Ein Werkzeug für die Sozialberatung</p><h1>Aktuelle Angebote.<br><em>Klar zusammengestellt.</em></h1></div><p>ÖH-Inserate durchsuchen, geeignete Angebote auswählen und als professionelle PDF weitergeben.</p></section>
      <PublicationStatus :published-at="buildTimestamp" :data-fetched-at="meta?.fetchedAt" :update-interval-hours="meta?.updateIntervalHours ?? 6" />
      <div v-if="sourceAgeHours > 24" class="warning" role="status"><strong>Daten möglicherweise veraltet.</strong> Der letzte erfolgreiche Abruf liegt mehr als 24 Stunden zurück.</div>
      <div v-if="error" class="error-state" role="alert"><strong>Datenquelle nicht erreichbar</strong><span>{{ error }}</span></div>
      <SearchPanel v-model="filters" :loading="loading" @search="runSearch" />
      <div v-if="selectionNotice" class="warning" role="status"><strong>Getrennte PDF-Typen</strong><span>{{ selectionNotice }}</span></div>
      <section v-if="searched" class="results-section" aria-labelledby="results-title">
        <div class="results-head"><div><span>Suchergebnis</span><h2 id="results-title">{{ results.length }} {{ results.length === 1 ? 'Angebot' : 'Angebote' }} gefunden</h2><p>Daten zuletzt aktualisiert: {{ updatedLabel }}</p></div><label class="sort"><span>Sortieren nach</span><select v-model="filters.sort"><option value="best">Beste Übereinstimmung</option><option value="newest">Neueste</option><option v-if="filters.kind === 'housing'" value="rent-low">Niedrigste Miete</option><option v-if="filters.kind === 'housing'" value="size">Größe</option></select></label></div>
        <div v-if="!results.length" class="empty-state"><h3>Keine passenden Angebote</h3><p>Für diese Suchkriterien wurden keine passenden Angebote gefunden.</p></div>
        <div v-else class="results-grid"><ListingCard v-for="item in visibleResults" :key="`${item.source}-${item.id}`" :listing="item" :selected="isSelected(item)" @toggle="toggle" /></div>
        <button v-if="visibleCount < results.length" class="load-more" type="button" @click="visibleCount += 10">Weitere Ergebnisse anzeigen <span>{{ Math.min(10, results.length - visibleCount) }} weitere</span></button>
      </section>
    </template>
    <SelectionPanel v-else :listings="selected" :edits="edits" :generating="generating" @back="step = 'search'" @remove="toggle" @reset="resetSelection" @preview="makePreview" @update-edit="updateEdit" />
  </main>
  <footer class="site-footer"><span>Bahnhofssozialdienst</span><span>Keine Anmeldung · kein Tracking · keine Datenbank</span><a href="https://www.oehweb.at/kontakt/impressum/" target="_blank" rel="noopener noreferrer">ÖH Innsbruck</a></footer>
  <PdfPreview v-if="preview" :url="preview.url" :file-name="preview.fileName" @close="preview = undefined" @download="downloadPdf" />
</template>
