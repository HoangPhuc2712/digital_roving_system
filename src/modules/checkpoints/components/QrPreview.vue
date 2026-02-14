<script setup lang="ts">
import { computed, ref } from 'vue'
import Dialog from 'primevue/dialog'

const props = defineProps<{
  value: string // base64 hoặc text
  size?: number // thumbnail size
}>()

const visible = ref(false)

function normalizeSrc(v: string) {
  const s = (v ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:image/')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return ''
}

const src = computed(() => normalizeSrc(props.value))
const thumb = computed(() => props.size ?? 44)

function open() {
  if (!src.value) return
  visible.value = true
}
</script>

<template>
  <div class="inline-flex items-center">
    <div
      class="border border-slate-200 rounded-md overflow-hidden bg-white cursor-pointer"
      :style="{ width: thumb + 'px', height: thumb + 'px' }"
      @click="open"
    >
      <img v-if="src" :src="src" alt="QR" class="w-full h-full object-cover block" />
      <div v-else class="w-full h-full flex items-center justify-center text-xs text-slate-500">
        N/A
      </div>
    </div>

    <Dialog
      v-model:visible="visible"
      modal
      header="QR Image"
      :style="{ width: '520px', maxWidth: '95vw' }"
    >
      <div class="flex justify-center bg-white">
        <img v-if="src" :src="src" alt="QR" class="max-w-full max-h-[70vh] object-contain block" />
        <div v-else class="text-slate-600">No QR image.</div>
      </div>
    </Dialog>
  </div>
</template>
