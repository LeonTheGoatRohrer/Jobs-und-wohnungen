<script setup lang="ts">
import { faArrowUpRightFromSquare, faCheck, faLocationDot } from '@fortawesome/free-solid-svg-icons'
import type { Listing } from '@/models/listings'
import { housingTypeLabel } from '@/services/pdfService'
import ListingImageGallery from '@/components/common/ListingImageGallery.vue'

const props = defineProps<{ listing: Listing; selected: boolean }>()
defineEmits<{ toggle: [listing: Listing] }>()

const levelLabel = { 'very-suitable': 'Sehr passend', suitable: 'Passend', limited: 'Eingeschränkt passend' }
const formatRent = (rent: number | undefined): string => rent === undefined ? 'nicht angegeben' : `${rent.toLocaleString('de-AT')} € / Monat`
</script>

<template>
  <article class="listing-card" :class="listing.suitability?.level" :data-testid="`listing-${listing.id}`">
    <header>
      <span class="rating"><i aria-hidden="true"></i>{{ levelLabel[listing.suitability?.level ?? 'limited'] }}</span>
      <span class="source-label">ÖH {{ listing.source === 'oeh-jobs' ? 'Jobbörse' : 'Wohnungsbörse' }}</span>
    </header>
    <ListingImageGallery
      v-if="listing.source === 'oeh-housing' && listing.images?.length"
      :images="listing.images"
      :title="listing.title"
    />
    <h3>{{ listing.title }}</h3>
    <p v-if="listing.source === 'oeh-jobs'" class="subline">{{ listing.employer || 'Arbeitgeber nicht angegeben' }}</p>
    <p class="location"><FontAwesomeIcon :icon="faLocationDot" /> {{ listing.location || 'Ort nicht angegeben' }}</p>
    <dl v-if="listing.source === 'oeh-jobs'">
      <div><dt>Beschäftigung</dt><dd>{{ listing.employmentType || 'nicht angegeben' }}</dd></div>
      <div><dt>Bezahlung</dt><dd>{{ listing.salary || 'nicht angegeben' }}</dd></div>
    </dl>
    <dl v-else>
      <div><dt>Unterkunft</dt><dd>{{ housingTypeLabel(listing.housingType) }}</dd></div>
      <div><dt>Größe</dt><dd>{{ listing.sizeM2 ? `${listing.sizeM2} m²` : 'nicht angegeben' }}</dd></div>
      <div class="price"><dt>Gesamtmiete</dt><dd>{{ formatRent(listing.totalRent) }}</dd></div>
    </dl>
    <div class="reasons" aria-label="Gründe für die Bewertung">
      <p v-for="reason in listing.suitability?.reasons" :key="reason"><FontAwesomeIcon :icon="faCheck" /> {{ reason }}</p>
    </div>
    <div class="card-actions">
      <details><summary>Details</summary><p>{{ listing.description || 'Beschreibung nicht angegeben' }}</p></details>
      <a :href="listing.originalUrl" target="_blank" rel="noopener noreferrer">Originalinserat <FontAwesomeIcon :icon="faArrowUpRightFromSquare" /></a>
    </div>
    <label class="select-listing"><input type="checkbox" :checked="props.selected" @change="$emit('toggle', listing)" /> <span>Für PDF auswählen</span></label>
  </article>
</template>
