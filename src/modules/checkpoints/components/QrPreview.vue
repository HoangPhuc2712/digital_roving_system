<script setup lang="ts">
import { computed, ref } from 'vue'
import Dialog from 'primevue/dialog'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'
import {
  printSingleCheckpointQr,
  type CheckpointPrintItem,
} from '@/services/print/checkpoints.print'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import { normalizeImageSource } from '@/utils/base64'

const props = defineProps<{
  value: string // base64 hoặc text
  size?: number // thumbnail size
  printItem?: Omit<CheckpointPrintItem, 'qrSrc'> | null
}>()

const auth = useAuthStore()
const toast = useToast()
const visible = ref(false)
const printing = ref(false)
const { t, locale } = useI18n()

function normalizeSrc(v: string) {
  return normalizeImageSource(v, { fallbackExt: 'png' })
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
          ? t('qrPreview.error.noQrAvailablie')
          : msg === 'QR_IMAGE_FORMAT_NOT_SUPPORTED'
            ? t('qrPreview.error.qrFormatNotSupport')
            : msg || t('qrPreview.error.exportPdfFailed'),
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
      :header="t('qrPreview.qrImg')"
      :style="{ width: '520px', maxWidth: '95vw' }"
    >
      <div class="flex justify-center bg-white">
        <img v-if="src" :src="src" alt="QR" class="max-w-full max-h-[70vh] object-contain block" />
        <div v-else class="text-slate-600">{{ t('qrPreview.noQrImg') }}.</div>
      </div>

      <template v-if="canPrint" #footer>
        <div class="flex justify-end">
          <BaseIconButton
            icon="pi pi-file-pdf"
            size="small"
            :label="t('qrPreview.exportQrPdf')"
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
