<script setup lang="ts">
defineProps<{ url: string; fileName: string }>()
defineEmits<{ close: []; download: [] }>()
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="$emit('close')">
    <section class="pdf-modal" role="dialog" aria-modal="true" aria-labelledby="pdf-title">
      <header><div><span>PDF-Vorschau</span><h2 id="pdf-title">{{ fileName }}</h2></div><button type="button" aria-label="Vorschau schließen" @click="$emit('close')">Schließen</button></header>
      <iframe :src="url" title="Vorschau der ausgewählten Angebote"></iframe>
      <footer><button class="secondary" type="button" @click="$emit('close')">Zurück zur Auswahl</button><button class="primary" type="button" @click="$emit('download')">PDF herunterladen</button></footer>
    </section>
  </div>
</template>
