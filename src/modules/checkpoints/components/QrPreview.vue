<script setup lang="ts">
import { computed, ref } from 'vue'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'

import { useAuthStore } from '@/stores/auth.store'
import {
  printSingleCheckpointQr,
  type CheckpointPrintItem,
} from '@/services/print/checkpoints.print'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

const props = defineProps<{
  value: string // base64 hoặc text
  size?: number // thumbnail size
  printItem?: Omit<CheckpointPrintItem, 'qrSrc'> | null
}>()

const auth = useAuthStore()
const toast = useToast()
const visible = ref(false)
const printing = ref(false)

function normalizeSrc(v: string) {
  const s = (v ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:image/')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return `data:image/png;base64,${s}`
}

const src = computed(() => normalizeSrc(props.value))
const thumb = computed(() => props.size ?? 44)
const canPrint = computed(() => auth.isAdminUser && !!props.printItem && !!src.value)

function open() {
  if (!src.value) return
  visible.value = true
}

async function onPrint() {
  if (!props.printItem || !src.value) return

  printing.value = true
  try {
    await printSingleCheckpointQr({
      ...props.printItem,
      qrSrc: src.value,
    })
  } catch (e: any) {
    const msg = String(e?.message ?? '')
    toast.add({
      severity: 'error',
      summary: 'QR PDF Error',
      detail:
        msg === 'QR_IMAGE_NOT_FOUND'
          ? 'No QR image available to export.'
          : msg === 'QR_IMAGE_FORMAT_NOT_SUPPORTED'
            ? 'QR image format is not supported.'
            : msg || 'Failed to export QR PDF.',
      life: 3500,
    })
  } finally {
    printing.value = false
  }
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

      <template v-if="canPrint" #footer>
        <div class="flex justify-end">
          <BaseIconButton
            icon="pi pi-file-pdf"
            size="small"
            label="Export Qr PDF"
            severity="secondary"
            outlined
            :loading="printing"
            :disabled="printing"
            @click="onPrint"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
