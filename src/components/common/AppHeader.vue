<script setup lang="ts">
defineProps<{ selectedCount: number; step: 'search' | 'selection' }>()
defineEmits<{ openSelection: [] }>()
</script>

<template>
  <header class="site-header">
    <div class="brand-block">
      <span class="brand-mark" aria-hidden="true"></span>
      <div><strong>Jobs &amp; Wohnungen</strong><span>Bahnhofssozialdienst</span></div>
    </div>
    <button v-if="selectedCount" class="selection-shortcut" type="button" @click="$emit('openSelection')">
      {{ selectedCount }} {{ selectedCount === 1 ? 'Angebot' : 'Angebote' }} ausgewählt
      <span>Auswahl ansehen</span>
    </button>
  </header>
  <nav class="step-nav" aria-label="Fortschritt">
    <span :class="{ active: step === 'search' }"><b>01</b> Suchen &amp; auswählen</span>
    <span :class="{ active: step === 'selection' }"><b>02</b> Prüfen &amp; PDF</span>
  </nav>
</template>
