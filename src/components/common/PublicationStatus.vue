<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  publishedAt: string
  dataFetchedAt: string | undefined
  updateIntervalHours: number
}>()

const viennaDate = new Intl.DateTimeFormat('de-AT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Vienna',
})
const viennaTime = new Intl.DateTimeFormat('de-AT', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Vienna',
})

function formatDate(value?: string): string {
  if (!value || Number.isNaN(Date.parse(value))) return 'Nicht verfügbar'
  return viennaDate.format(new Date(value))
}

function formatTime(value?: string): string {
  if (!value || Number.isNaN(Date.parse(value))) return ''
  return `${viennaTime.format(new Date(value))} Uhr · Wiener Zeit`
}

const publishedDate = computed(() => formatDate(props.publishedAt))
const publishedTime = computed(() => formatTime(props.publishedAt))
const dataDate = computed(() => formatDate(props.dataFetchedAt))
const dataTime = computed(() => formatTime(props.dataFetchedAt))
</script>

<template>
  <section class="publication-status" aria-label="Veröffentlichung und Datenaktualisierung">
    <div class="publication-status__item publication-status__item--primary">
      <span>Webseite zuletzt veröffentlicht</span>
      <time :datetime="publishedAt">
        <strong>{{ publishedDate }}</strong>
        <small>{{ publishedTime }}</small>
      </time>
    </div>
    <div class="publication-status__item publication-status__item--interval">
      <span>Neue ÖH-Daten</span>
      <strong>Alle {{ updateIntervalHours }} Stunden</strong>
      <small>Nach erfolgreicher Prüfung automatisch veröffentlicht</small>
    </div>
    <div class="publication-status__item">
      <span>Letzter Datenabruf</span>
      <time v-if="dataFetchedAt" :datetime="dataFetchedAt">
        <strong>{{ dataDate }}</strong>
        <small>{{ dataTime }}</small>
      </time>
      <strong v-else>Daten werden geladen</strong>
    </div>
  </section>
</template>
