<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import { useI18n } from 'vue-i18n'

import { useAuthStore } from '@/stores/auth.store'
import type { CheckpointPrintItem } from '@/services/print/checkpoints.print'
import { normalizeImageSource } from '@/utils/base64'
import QrExportLayoutButton from '@/modules/checkpoints/components/QrExportLayoutButton.vue'

const props = defineProps<{
  value: string
  size?: number
  printItem?: Omit<CheckpointPrintItem, 'qrSrc'> | null
}>()

const emit = defineEmits<{
  (e: 'dialog-visible-change', value: boolean): void
}>()

const auth = useAuthStore()
const visible = ref(false)
const { t } = useI18n()

function normalizeSrc(v: string) {
  return normalizeImageSource(v, { fallbackExt: 'png' })
}

const src = computed(() => normalizeSrc(props.value))
const thumb = computed(() => props.size ?? 44)
const canViewQr = computed(() => auth.isAdminUser && !!src.value)
const exportItem = computed<CheckpointPrintItem | null>(() => {
  if (!auth.isAdminUser || !props.printItem || !src.value) return null
  return {
    ...props.printItem,
    qrSrc: src.value,
  }
})

function open() {
  if (!canViewQr.value) return
  visible.value = true
}
watch(
  visible,
  (nextVisible) => {
    emit('dialog-visible-change', nextVisible)
  },
  { immediate: true },
)
</script>

<template>
  <div class="inline-flex items-center">
    <div
      class="border border-slate-200 rounded-md overflow-hidden bg-white relative"
      :class="canViewQr ? 'cursor-pointer' : 'cursor-not-allowed'"
      :style="{ width: thumb + 'px', height: thumb + 'px' }"
      @click="open"
    >
      <img
        v-if="src"
        :src="src"
        alt="QR"
        class="w-full h-full object-cover block transition"
        :class="canViewQr ? '' : 'blur-sm scale-110 select-none pointer-events-none'"
        draggable="false"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-xs text-slate-500">
        N/A
      </div>
      <div v-if="src && !canViewQr" class="absolute inset-0 bg-white/20" aria-hidden="true" />
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

      <template v-if="exportItem" #footer>
        <div class="flex justify-end">
          <QrExportLayoutButton
            :item="exportItem"
            icon="pi pi-file-pdf"
            :label="t('qrPreview.exportQrPdf')"
            severity="secondary"
            outlined
            :disabled="!exportItem"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>
