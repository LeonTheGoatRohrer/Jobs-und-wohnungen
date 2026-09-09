<script setup lang="ts">
import type { Listing, ManualListingEdits } from '@/models/listings'
import ListingImageGallery from '@/components/common/ListingImageGallery.vue'

defineProps<{ listings: Listing[]; edits: Record<string, ManualListingEdits>; generating: boolean }>()
defineEmits<{ back: []; remove: [Listing]; reset: []; preview: []; updateEdit: [string, string, string] }>()
</script>

<template>
  <section class="selection-page" aria-labelledby="selection-title">
    <button class="text-button" type="button" @click="$emit('back')">Zurück zu den Ergebnissen</button>
    <div class="section-heading"><div><span>Schritt 02</span><h1 id="selection-title">Auswahl prüfen</h1><p>Korrigiere bei Bedarf einzelne Angaben. Änderungen gelten nur für diese PDF.</p></div><button class="danger-link" type="button" @click="$emit('reset')">Auswahl zurücksetzen</button></div>
    <div v-if="!listings.length" class="empty-state"><h2>Noch keine Angebote ausgewählt</h2><p>Wähle zuerst mindestens ein Angebot für die PDF aus.</p></div>
    <article v-for="(listing, index) in listings" :key="listing.id" class="edit-card">
      <div class="edit-number">{{ String(index + 1).padStart(2, '0') }}</div>
      <div class="edit-content">
        <div class="edit-title"><div><span>{{ listing.source === 'oeh-jobs' ? 'Job' : 'Wohnung' }}</span><h2>{{ listing.title }}</h2></div><button type="button" @click="$emit('remove', listing)">Entfernen</button></div>
        <ListingImageGallery
          v-if="listing.source === 'oeh-housing'"
          :images="listing.images ?? []"
          :title="listing.title"
          compact
          :show-caption="false"
        />
        <div class="field-grid compact">
          <label class="field wide"><span>Titel</span><input :value="edits[listing.id]?.title ?? listing.title" @input="$emit('updateEdit', listing.id, 'title', ($event.target as HTMLInputElement).value)" /></label>
          <label class="field"><span>Ort</span><input :value="edits[listing.id]?.location ?? listing.location ?? ''" placeholder="nicht angegeben" @input="$emit('updateEdit', listing.id, 'location', ($event.target as HTMLInputElement).value)" /></label>
          <template v-if="listing.source === 'oeh-jobs'">
            <label class="field"><span>Arbeitgeber</span><input :value="edits[listing.id]?.employer ?? listing.employer ?? ''" placeholder="nicht angegeben" @input="$emit('updateEdit', listing.id, 'employer', ($event.target as HTMLInputElement).value)" /></label>
            <label class="field"><span>Gehalt</span><input :value="edits[listing.id]?.salary ?? listing.salary ?? ''" placeholder="nicht angegeben" @input="$emit('updateEdit', listing.id, 'salary', ($event.target as HTMLInputElement).value)" /></label>
            <label class="field"><span>Beginn</span><input :value="edits[listing.id]?.startDate ?? listing.startDate ?? ''" placeholder="nicht angegeben" @input="$emit('updateEdit', listing.id, 'startDate', ($event.target as HTMLInputElement).value)" /></label>
          </template>
          <template v-else>
            <label class="field"><span>Betriebskosten</span><input :value="edits[listing.id]?.operatingCosts ?? listing.operatingCosts ?? ''" placeholder="nicht angegeben" @input="$emit('updateEdit', listing.id, 'operatingCosts', ($event.target as HTMLInputElement).value)" /></label>
            <label class="field"><span>Kaution</span><input :value="edits[listing.id]?.deposit ?? listing.deposit ?? ''" placeholder="nicht angegeben" @input="$emit('updateEdit', listing.id, 'deposit', ($event.target as HTMLInputElement).value)" /></label>
          </template>
          <label class="field"><span>Ansprechperson</span><input :value="edits[listing.id]?.contactName ?? listing.contact?.names.join('; ') ?? ''" placeholder="nicht angegeben" @input="$emit('updateEdit', listing.id, 'contactName', ($event.target as HTMLInputElement).value)" /></label>
          <label class="field"><span>E-Mail</span><input type="text" inputmode="email" :value="edits[listing.id]?.contactEmail ?? listing.contact?.emails.join('; ') ?? ''" placeholder="nicht angegeben" @input="$emit('updateEdit', listing.id, 'contactEmail', ($event.target as HTMLInputElement).value)" /></label>
          <label class="field"><span>Telefon</span><input type="tel" :value="edits[listing.id]?.contactPhone ?? listing.contact?.phones.join('; ') ?? ''" placeholder="nicht angegeben" @input="$emit('updateEdit', listing.id, 'contactPhone', ($event.target as HTMLInputElement).value)" /></label>
        </div>
        <p v-if="listing.source === 'oeh-housing' && listing.images?.length" class="pdf-inclusion-note">{{ listing.images.length }} {{ listing.images.length === 1 ? 'Bild wird' : 'Bilder werden' }} aus dem Originalinserat übernommen.</p>
        <a :href="listing.originalUrl" target="_blank" rel="noopener noreferrer">Originaldaten bei der ÖH vergleichen</a>
      </div>
    </article>
    <div class="pdf-action-bar"><div><strong>{{ listings.length }} {{ listings.length === 1 ? 'Angebot' : 'Angebote' }}</strong><span>werden in eine {{ listings[0]?.source === 'oeh-jobs' ? 'Stellen-' : 'Wohnungs-' }}PDF übernommen</span></div><button class="primary" type="button" :disabled="!listings.length || generating" @click="$emit('preview')">{{ generating ? 'PDF wird erstellt …' : 'PDF-Vorschau öffnen' }}</button></div>
  </section>
</template>
