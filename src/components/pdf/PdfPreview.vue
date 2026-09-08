<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

const props = defineProps<{ url: string; fileName: string }>()
defineEmits<{ close: []; download: [] }>()

const isMobile = ref(false)
const loading = ref(false)
const renderError = ref('')
const pageNumbers = ref<number[]>([])
const canvasElements = new Map<number, HTMLCanvasElement>()
const mobileViewer = ref<HTMLElement>()
const desktopUrl = computed(() => `${props.url}#view=FitH&zoom=page-width`)
let mediaQuery: MediaQueryList | undefined
let pdfDocument: PDFDocumentProxy | undefined
let renderTasks: RenderTask[] = []
let resizeTimer: ReturnType<typeof setTimeout> | undefined
let renderVersion = 0

function isRenderCancellation(error: unknown): boolean {
  return error instanceof Error && error.name === 'RenderingCancelledException'
}

function registerCanvas(element: Element | ComponentPublicInstance | null, pageNumber: number): void {
  if (element instanceof HTMLCanvasElement) canvasElements.set(pageNumber, element)
}

async function loadMobilePdf(): Promise<void> {
  if (!isMobile.value) return
  const version = ++renderVersion
  loading.value = true
  renderError.value = ''
  try {
    const [pdfjs, workerModule] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default
    if (!pdfDocument) {
      const response = await fetch(props.url)
      if (!response.ok) throw new Error(`PDF konnte nicht geladen werden (${response.status}).`)
      const loadedDocument = await pdfjs.getDocument({ data: await response.arrayBuffer() }).promise
      pdfDocument = loadedDocument
      pageNumbers.value = Array.from({ length: loadedDocument.numPages }, (_, index) => index + 1)
      await nextTick()
    }
    await renderMobilePages(version)
  } catch (error) {
    if (version === renderVersion && !isRenderCancellation(error)) {
      renderError.value = 'Die mobile PDF-Vorschau konnte nicht dargestellt werden. Die PDF kann weiterhin heruntergeladen werden.'
    }
  } finally {
    if (version === renderVersion) loading.value = false
  }
}

async function renderMobilePages(version = ++renderVersion): Promise<void> {
  if (!pdfDocument || !mobileViewer.value || !isMobile.value) return
  renderTasks.forEach((task) => task.cancel())
  renderTasks = []
  const availableWidth = Math.max(240, mobileViewer.value.clientWidth - 24)
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

  for (const pageNumber of pageNumbers.value) {
    if (version !== renderVersion) return
    const canvas = canvasElements.get(pageNumber)
    if (!canvas) continue
    const page = await pdfDocument.getPage(pageNumber)
    const natural = page.getViewport({ scale: 1 })
    const displayScale = availableWidth / natural.width
    const renderViewport = page.getViewport({ scale: displayScale * pixelRatio })
    canvas.width = Math.floor(renderViewport.width)
    canvas.height = Math.floor(renderViewport.height)
    canvas.style.width = `${availableWidth}px`
    canvas.style.height = `${Math.floor(natural.height * displayScale)}px`
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) continue
    const task = page.render({ canvas, canvasContext: context, viewport: renderViewport })
    renderTasks.push(task)
    await task.promise
  }
}

function updateMode(): void {
  isMobile.value = mediaQuery?.matches ?? false
  if (isMobile.value) void loadMobilePdf()
}

function scheduleResize(): void {
  if (!isMobile.value) return
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    void renderMobilePages().catch((error: unknown) => {
      if (!isRenderCancellation(error)) {
        renderError.value = 'Die mobile PDF-Vorschau konnte nicht neu skaliert werden. Die PDF kann weiterhin heruntergeladen werden.'
      }
    })
  }, 120)
}

onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 640px)')
  updateMode()
  mediaQuery.addEventListener('change', updateMode)
  window.addEventListener('resize', scheduleResize)
})

onBeforeUnmount(() => {
  renderVersion += 1
  if (resizeTimer) clearTimeout(resizeTimer)
  renderTasks.forEach((task) => task.cancel())
  mediaQuery?.removeEventListener('change', updateMode)
  window.removeEventListener('resize', scheduleResize)
  void pdfDocument?.destroy()
})
</script>

<template>
  <div class="modal-backdrop" role="presentation" @click.self="$emit('close')">
    <section class="pdf-modal" role="dialog" aria-modal="true" aria-labelledby="pdf-title">
      <header><div><span>PDF-Vorschau</span><h2 id="pdf-title">{{ fileName }}</h2></div><button type="button" aria-label="Vorschau schließen" @click="$emit('close')">Schließen</button></header>
      <div v-if="isMobile" ref="mobileViewer" class="mobile-pdf-viewer" aria-live="polite">
        <p v-if="loading" class="pdf-render-status">PDF-Seiten werden an die Bildschirmbreite angepasst …</p>
        <p v-if="renderError" class="pdf-render-error" role="alert">{{ renderError }}</p>
        <canvas
          v-for="pageNumber in pageNumbers"
          :key="pageNumber"
          :ref="(element) => registerCanvas(element, pageNumber)"
          class="mobile-pdf-page"
          :aria-label="`PDF-Seite ${pageNumber} von ${pageNumbers.length}`"
        ></canvas>
      </div>
      <iframe v-else :src="desktopUrl" title="Vorschau der ausgewählten Angebote"></iframe>
      <footer><button class="secondary" type="button" @click="$emit('close')">Zurück zur Auswahl</button><button class="primary" type="button" @click="$emit('download')">PDF herunterladen</button></footer>
    </section>
  </div>
</template>
