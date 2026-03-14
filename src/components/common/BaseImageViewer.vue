<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Galleria from 'primevue/galleria'

type BaseImageItem = {
  id: string | number
  src: string
  alt?: string
  title?: string
}

const props = defineProps<{
  visible: boolean
  title?: string
  images: BaseImageItem[]
  startIndex?: number
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const activeIndex = ref(0)

const responsiveOptions = [
  {
    breakpoint: '1300px',
    numVisible: 4,
  },
  {
    breakpoint: '575px',
    numVisible: 1,
  },
]

function close() {
  emit('update:visible', false)
}

function normalizeSrc(src: string) {
  const s = (src ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:image/')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return `data:image/jpeg;base64,${s}`
}

const galleryItems = computed(() =>
  (props.images ?? [])
    .map((x, idx) => {
      const finalSrc = normalizeSrc(x.src)
      return {
        id: x.id,
        itemImageSrc: finalSrc,
        thumbnailImageSrc: finalSrc,
        alt: x.alt || `Image ${idx + 1}`,
        title: x.title || '',
      }
    })
    .filter((x) => !!x.itemImageSrc),
)

const dialogTitle = computed(() => {
  const total = galleryItems.value.length
  if (!total) return props.title || 'Photos'

  const current = galleryItems.value[activeIndex.value]
  const note = String(current?.title ?? props.title ?? '').trim()
  const position = `Photo ${activeIndex.value + 1} of ${total}`

  return note ? `${note} - ${position}` : position
})

watch(
  () => [props.visible, props.images, props.startIndex],
  () => {
    if (!props.visible) return

    const total = galleryItems.value.length
    if (!total) {
      activeIndex.value = 0
      return
    }

    const idx = Number(props.startIndex ?? 0)
    activeIndex.value = Math.max(0, Math.min(Number.isFinite(idx) ? idx : 0, total - 1))
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <Dialog
    :visible="visible"
    class="base-image-viewer"
    modal
    :header="dialogTitle"
    :style="{ width: '700px', maxWidth: '95vw' }"
    :contentStyle="{ maxHeight: '78vh', padding: '0.75rem 1rem 1rem' }"
    @update:visible="emit('update:visible', $event)"
    @hide="close"
  >
    <div v-if="galleryItems.length === 0" class="text-slate-600">No images to display.</div>

    <div v-else class="viewer-shell">
      <Galleria
        v-model:activeIndex="activeIndex"
        :value="galleryItems"
        :responsiveOptions="responsiveOptions"
        :numVisible="5"
        :showItemNavigators="false"
        :showThumbnailNavigators="true"
        :circular="false"
        :containerStyle="{ width: '100%' }"
      >
        <template #item="slotProps">
          <div class="galleria-item-box">
            <img
              :src="slotProps.item.itemImageSrc"
              :alt="slotProps.item.alt"
              class="galleria-item-img"
            />
          </div>
        </template>

        <template #thumbnail="slotProps">
          <div class="thumbnail-box">
            <img
              :src="slotProps.item.thumbnailImageSrc"
              :alt="slotProps.item.alt"
              class="thumbnail-img"
            />
          </div>
        </template>
      </Galleria>
    </div>
  </Dialog>
</template>

<style scoped>
.viewer-shell {
  width: 100%;
}

.galleria-item-box {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

.galleria-item-img {
  width: 100%;
  max-height: 56vh;
  object-fit: contain;
  display: block;
}

.thumbnail-box {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 72px;
  padding: 4px;
  box-sizing: border-box;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  max-width: 72px;
  max-height: 64px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}

:deep(.p-galleria-thumbnail-item) {
  display: block;
}

:deep(.base-image-viewer .p-dialog-content) {
  overflow: auto;
}

:deep(.base-image-viewer .p-galleria) {
  width: 100%;
}

:deep(.base-image-viewer .p-galleria-content) {
  display: block;
}

:deep(.base-image-viewer .p-galleria-item-container) {
  background: #ffffff;
}

:deep(.base-image-viewer .p-galleria-thumbnail-wrapper) {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

:deep(.base-image-viewer .p-galleria-thumbnail-container) {
  background: transparent;
}

:deep(.base-image-viewer .p-galleria-thumbnail-items-container) {
  padding-bottom: 0;
}

:deep(.base-image-viewer .p-galleria-thumbnail-item) {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

:deep(.base-image-viewer .p-galleria-thumbnail-item-current) {
  opacity: 1;
}

:deep(.base-image-viewer .p-galleria-thumbnail-item:hover) {
  opacity: 1;
}

:deep(.base-image-viewer .p-galleria-thumbnail-prev),
:deep(.base-image-viewer .p-galleria-thumbnail-next) {
  color: #64748b;
}

:deep(.base-image-viewer .p-galleria-thumbnail-prev:hover),
:deep(.base-image-viewer .p-galleria-thumbnail-next:hover) {
  color: #334155;
}
</style>
