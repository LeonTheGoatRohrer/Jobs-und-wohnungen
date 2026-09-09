<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ListingImage } from '@/models/listings'

const props = withDefaults(defineProps<{
  images: ListingImage[]
  title: string
  compact?: boolean
  showCaption?: boolean
}>(), {
  compact: false,
  showCaption: true,
})

const failedSources = ref(new Set<string>())
const displayedImages = computed(() => props.images
  .slice(0, 2)
  .filter((image) => !failedSources.value.has(image.sourceUrl)))

function imageSource(image: ListingImage): string {
  return image.path
    ? `${import.meta.env.BASE_URL}${image.path.replace(/^\/+/, '')}`
    : image.sourceUrl
}

function markFailed(image: ListingImage): void {
  failedSources.value = new Set([...failedSources.value, image.sourceUrl])
}
</script>

<template>
  <figure
    v-if="displayedImages.length"
    class="listing-gallery"
    :class="{ 'listing-gallery--single': displayedImages.length === 1, 'listing-gallery--compact': compact }"
  >
    <div class="listing-gallery__grid">
      <img
        v-for="(image, index) in displayedImages"
        :key="image.sourceUrl"
        :src="imageSource(image)"
        :alt="image.alt?.trim() || `${title}, Bild ${index + 1}`"
        loading="lazy"
        decoding="async"
        @error="markFailed(image)"
      />
    </div>
    <figcaption v-if="showCaption">
      {{ displayedImages.length }} {{ displayedImages.length === 1 ? 'Bild' : 'Bilder' }} aus dem Originalinserat
    </figcaption>
  </figure>
</template>
