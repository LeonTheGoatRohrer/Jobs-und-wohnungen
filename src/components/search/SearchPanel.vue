<script setup lang="ts">
import type { SearchFilters } from '@/services/searchService'

const model = defineModel<SearchFilters>({ required: true })
defineProps<{ loading: boolean }>()
defineEmits<{ search: [] }>()
</script>

<template>
  <form class="search-panel" aria-label="Angebote suchen" @submit.prevent="$emit('search')">
    <fieldset>
      <legend><span>01</span> Was möchtest du suchen?</legend>
      <div class="choice-grid two">
        <label :class="{ selected: model.kind === 'jobs' }">
          <input v-model="model.kind" type="radio" value="jobs" />
          <strong>Jobs</strong><small>Stellenangebote und Hilfstätigkeiten</small>
        </label>
        <label :class="{ selected: model.kind === 'housing' }">
          <input v-model="model.kind" type="radio" value="housing" />
          <strong>Wohnungen</strong><small>Wohnungen, Garçonnièren und WG-Zimmer</small>
        </label>
      </div>
    </fieldset>
    <fieldset>
      <legend><span>02</span> Wo möchtest du suchen?</legend>
      <div class="choice-grid two">
        <label :class="{ selected: model.region === 'innsbruck' }"><input v-model="model.region" type="radio" value="innsbruck" /><strong>Innsbruck</strong><small>Nur Innsbruck Stadt</small></label>
        <label :class="{ selected: model.region === 'surroundings' }"><input v-model="model.region" type="radio" value="surroundings" /><strong>Innsbruck + Umgebung</strong><small>Stadt und relevanter Raum Innsbruck-Land</small></label>
      </div>
    </fieldset>
    <fieldset class="filters">
      <legend><span>03</span> Suche eingrenzen <small>optional</small></legend>
      <div class="field-grid">
        <label class="field wide"><span>Suchbegriff</span><input v-model.trim="model.query" type="search" placeholder="z. B. Reinigung, Lager, Wilten" /></label>
        <template v-if="model.kind === 'jobs'">
          <label class="field"><span>Beschäftigungsart</span><select v-model="model.employmentType"><option value="all">Alle</option><option value="vollzeit">Vollzeit</option><option value="teilzeit">Teilzeit</option><option value="geringfügig">Geringfügig</option><option value="fallweise">Fallweise</option></select></label>
          <label class="field"><span>Bereich</span><select v-model="model.jobCategory"><option value="all">Alle Bereiche</option><option value="reinigung">Reinigung</option><option value="gastronomie">Küche / Gastronomie</option><option value="lager">Lager</option><option value="verkauf">Verkauf</option><option value="zustellung">Zustellung</option><option value="produktion">Produktion</option><option value="veranstaltung">Veranstaltungen</option><option value="aushilfe">Sonstige Hilfstätigkeiten</option></select></label>
          <label class="check wide"><input v-model="model.withoutTraining" type="checkbox" /> <span><strong>Ohne abgeschlossene Ausbildung geeignet</strong><small>Zeigt nur Inserate mit einer ausdrücklichen passenden Aussage.</small></span></label>
        </template>
        <template v-else>
          <label class="field"><span>Maximalmiete in Euro</span><input v-model.number="model.maxRent" type="number" min="0" step="50" placeholder="z. B. 700" /></label>
          <label class="field"><span>Unterkunftsart</span><select v-model="model.housingType"><option value="all">Alle</option><option value="garconniere">Garçonnière</option><option value="apartment">Wohnung</option><option value="shared-room">WG-Zimmer</option></select></label>
          <label class="check wide"><input v-model="model.preferIndependent" type="checkbox" /> <span><strong>Eigenständige Unterkunft bevorzugen</strong><small>WG-Zimmer werden ausgeblendet.</small></span></label>
        </template>
      </div>
    </fieldset>
    <button class="primary search-button" type="submit" :disabled="loading">
      {{ loading ? 'Aktuelle Inserate werden geladen …' : 'Angebote suchen' }}
    </button>
  </form>
</template>
