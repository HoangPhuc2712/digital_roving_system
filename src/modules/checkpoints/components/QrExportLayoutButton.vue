<script setup lang="ts">
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Popover from 'primevue/popover'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import {
  DEFAULT_CHECKPOINT_QR_LAYOUT,
  printSingleCheckpointQr,
  type CheckpointPrintItem,
  type CheckpointQrLayout,
} from '@/services/print/checkpoints.print'

type Severity = 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast'

const props = withDefaults(
  defineProps<{
    item?: CheckpointPrintItem | null
    icon?: string
    label?: string
    ariaLabel?: string
    size?: string
    severity?: Severity
    outlined?: boolean
    rounded?: boolean
    text?: boolean
    plain?: boolean
    disabled?: boolean
  }>(),
  {
    item: null,
    icon: 'pi pi-file-pdf',
    label: '',
    ariaLabel: '',
    size: 'small',
    severity: 'secondary',
    outlined: false,
    rounded: false,
    text: false,
    plain: false,
    disabled: false,
  },
)

const { t } = useI18n()
const toast = useToast()
const overlayRef = ref<any>(null)
const exporting = ref(false)
const selectedLayout = ref<CheckpointQrLayout>(DEFAULT_CHECKPOINT_QR_LAYOUT)

const canExport = computed(() => !props.disabled && !!props.item?.qrSrc)
const layoutOptions = computed(() => [
  { label: '1x2', value: '1x2' as CheckpointQrLayout },
  { label: '2x2', value: '2x2' as CheckpointQrLayout },
  { label: '3x2', value: '3x2' as CheckpointQrLayout },
])

function toggle(event: MouseEvent) {
  if (!canExport.value || exporting.value) return
  overlayRef.value?.toggle?.(event)
}

function closeOverlay() {
  overlayRef.value?.hide?.()
}

async function onExport() {
  if (!props.item) return

  exporting.value = true
  try {
    await printSingleCheckpointQr(props.item, selectedLayout.value)
    closeOverlay()
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
    exporting.value = false
  }
}
</script>

<template>
  <div class="inline-flex">
    <Button
      type="button"
      :icon="props.icon"
      :label="props.label || undefined"
      :aria-label="props.ariaLabel || undefined"
      :severity="props.severity"
      :size="props.size"
      :outlined="props.outlined"
      :rounded="props.rounded"
      :text="props.text"
      :plain="props.plain"
      :loading="exporting"
      :disabled="!canExport || exporting"
      @click="toggle"
    />

    <Popover ref="overlayRef">
      <div class="w-[260px] max-w-full p-1">
        <div class="text-sm font-semibold text-slate-800 mb-3">{{ t('common.selectLayout') }}</div>

        <Select
          v-model="selectedLayout"
          :options="layoutOptions"
          optionLabel="label"
          optionValue="value"
          size="small"
          class="w-full"
          :placeholder="t('common.selectLayout')"
          appendTo="self"
        />

        <div class="mt-3 flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
          <BaseButton
            :label="t('common.cancel')"
            size="small"
            severity="secondary"
            outlined
            :disabled="exporting"
            @click="closeOverlay"
          />
          <Button
            type="button"
            icon="pi pi-file-pdf"
            :label="t('qrPreview.exportQrPdf')"
            severity="secondary"
            size="small"
            :loading="exporting"
            :disabled="exporting"
            @click="onExport"
          />
        </div>
      </div>
    </Popover>
  </div>
</template>
