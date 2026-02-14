<script setup lang="ts">
import { computed } from 'vue'
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
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

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
        title: x.title || `Image ${idx + 1}`,
      }
    })
    .filter((x) => !!x.itemImageSrc),
)
</script>

<template>
  <Dialog
    :visible="visible"
    class="base-image-viewer"
    modal
    :header="title || `Photos (${galleryItems.length})`"
    :style="{ width: '860px', maxWidth: '95vw' }"
    :contentStyle="{ height: '72vh' }"
    @update:visible="emit('update:visible', $event)"
    @hide="close"
  >
    <div v-if="galleryItems.length === 0" class="text-slate-600">No images to display.</div>

    <div v-else class="h-full">
      <Galleria
        :value="galleryItems"
        :numVisible="6"
        :circular="true"
        :showItemNavigators="true"
        :showThumbnails="true"
        :containerStyle="{ width: '100%', height: '100%' }"
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
          <div class="galleria-thumb-box">
            <img
              :src="slotProps.item.thumbnailImageSrc"
              :alt="slotProps.item.alt"
              class="galleria-thumb-img"
            />
          </div>
        </template>
      </Galleria>
    </div>
  </Dialog>
</template>

<style scoped>
.galleria-item-box {
  height: 56vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

.galleria-item-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.galleria-thumb-box {
  width: 88px;
  height: 64px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.galleria-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

:deep(.base-image-viewer .p-galleria-thumbnail-items) {
  display: flex;
  gap: 10px;
  align-items: center;
}

:deep(.base-image-viewer .p-galleria-thumbnail-item) {
  flex: 0 0 auto;
}
</style>
