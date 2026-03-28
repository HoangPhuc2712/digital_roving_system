<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseDataTable from '@/components/common/BaseDataTable.vue'
import type { CheckpointRow, RoleOption } from '@/modules/checkpoints/checkpoints.types'
import { fetchCheckpointRows, fetchRoleOptions } from '@/modules/checkpoints/checkpoints.api'
import {
  printCheckpointQrSheets,
  type CheckpointPrintItem,
} from '@/services/print/checkpoints.print'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import QrPreview from '@/modules/checkpoints/components/QrPreview.vue'
import { normalizeImageSource } from '@/utils/base64'

type AreaOption = {
  label: string
  value: number
}

type PreviewRow = {
  cp_id: number
  cp_priority: number
  cp_name: string
  cp_code: string
  cp_qr: string
  area_id: number
  area_label: string
  role_label: string
}

const { t, locale } = useI18n()
const props = defineProps<{
  visible: boolean
  areaOptions: AreaOption[]
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const toast = useToast()

const loading = ref(false)
const printing = ref(false)
const selectedAreaIds = ref<number[]>([])
const selectedRoleId = ref<number | 'ALL' | null>(null)
const checkpoints = ref<CheckpointRow[]>([])
const roleOptions = ref<RoleOption[]>([])
const initialized = ref(false)

const visibleProxy = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const roleFilterOptions = computed(() => [
  { label: 'All', value: 'ALL' as const },
  ...roleOptions.value,
])

const hasAppliedFilter = computed(
  () =>
    selectedAreaIds.value.length > 0 ||
    selectedRoleId.value === 'ALL' ||
    typeof selectedRoleId.value === 'number',
)

const previewRows = computed<PreviewRow[]>(() => {
  if (!hasAppliedFilter.value) return []

  return (checkpoints.value ?? [])
    .filter((row) => {
      if (
        selectedAreaIds.value.length > 0 &&
        !selectedAreaIds.value.includes(Number(row.area_id))
      ) {
        return false
      }

      if (typeof selectedRoleId.value === 'number') {
        const roleIds = Array.isArray(row.role_ids) ? row.role_ids : []
        if (!roleIds.includes(Number(selectedRoleId.value))) return false
      }

      return true
    })
    .map((row) => ({
      cp_id: row.cp_id,
      cp_priority: Number(row.cp_priority ?? 0),
      cp_name: row.cp_name,
      cp_code: row.cp_code,
      cp_qr: row.cp_qr,
      area_id: Number(row.area_id ?? 0),
      area_label: row.area_code || row.area_name || '',
      role_label: Array.isArray(row.role_names) ? row.role_names.join(', ') : '',
    }))
    .sort(
      (a, b) =>
        String(a.area_label ?? '').localeCompare(String(b.area_label ?? '')) ||
        Number(a.cp_priority ?? 0) - Number(b.cp_priority ?? 0) ||
        String(a.cp_code ?? '').localeCompare(String(b.cp_code ?? '')),
    )
})

watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      await ensureLoaded()
      return
    }

    resetFilters()
    await nextTick()
  },
)

function normalizeQr(src: string) {
  return normalizeImageSource(src, { fallbackExt: 'png' })
}

async function ensureLoaded() {
  if (initialized.value) return

  loading.value = true
  try {
    const roles = await fetchRoleOptions().catch(() => [])
    roleOptions.value = roles
    checkpoints.value = await fetchCheckpointRows(roles)
    initialized.value = true
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: String(e?.message ?? t('areaPrintOptionsDialog.error.printLoadFailed')),
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  selectedAreaIds.value = []
  selectedRoleId.value = null
}

function clearFilters() {
  resetFilters()
}

function closeDialog() {
  resetFilters()
  visibleProxy.value = false
}

function buildPrintItems(rows: PreviewRow[]): CheckpointPrintItem[] {
  return rows.map((row) => ({
    areaLabel: row.area_label,
    cpName: row.cp_name,
    cpCode: row.cp_code,
    cpPriority: row.cp_priority,
    qrSrc: normalizeQr(row.cp_qr),
  }))
}

async function onPrint() {
  if (!previewRows.value.length) return

  printing.value = true
  try {
    await printCheckpointQrSheets(buildPrintItems(previewRows.value), 'Check Point Qr Codes')
  } catch (e: any) {
    const msg = String(e?.message ?? '')
    toast.add({
      severity: 'error',
      summary: 'QR PDF Error',
      detail:
        msg === 'QR_IMAGE_NOT_FOUND'
          ? t('areaPrintOptionsDialog.error.noQrAvailablie')
          : msg === 'QR_IMAGE_FORMAT_NOT_SUPPORTED'
            ? t('areaPrintOptionsDialog.error.qrFormatNotSupport')
            : msg || t('areaPrintOptionsDialog.error.exportPdfFailed'),
      life: 3500,
    })
  } finally {
    printing.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visibleProxy"
    modal
    :header="t('areaPrintOptionsDialog.title')"
    :style="{ width: '1100px', maxWidth: '96vw' }"
  >
    <div class="flex max-h-[78vh] flex-col gap-4 overflow-hidden">
      <div class="shrink-0 space-y-4 bg-white">
        <div
          class="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
        >
          <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-700">{{
              t('areaPrintOptionsDialog.areaFilter')
            }}</label>
            <MultiSelect
              v-model="selectedAreaIds"
              :options="areaOptions"
              optionLabel="label"
              size="small"
              optionValue="value"
              filter
              display="chip"
              :placeholder="t('areaPrintOptionsDialog.selectArea')"
              class="w-full"
              :disabled="loading"
              :maxSelectedLabels="2"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-700">{{
              t('areaPrintOptionsDialog.roleFilter')
            }}</label>
            <Select
              v-model="selectedRoleId"
              :options="roleFilterOptions"
              optionLabel="label"
              size="small"
              optionValue="value"
              :placeholder="t('areaPrintOptionsDialog.selectRole')"
              showClear
              class="w-full"
              :disabled="loading"
            />
          </div>

          <div class="flex md:justify-end">
            <BaseButton
              :label="t('common.clearFilters')"
              size="small"
              severity="secondary"
              outlined
              :disabled="loading"
              @click="clearFilters"
            />
          </div>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white p-3">
        <BaseDataTable
          title=""
          :value="previewRows"
          :loading="loading"
          dataKey="cp_id"
          :paginator="false"
        >
          <template #empty>
            <div class="py-10 text-center text-slate-500">
              {{
                hasAppliedFilter
                  ? t('areaPrintOptionsDialog.noCheckpointFound')
                  : t('areaPrintOptionsDialog.noCheckpointExport')
              }}
            </div>
          </template>

          <Column
            :header="t('areaPrintOptionsDialog.checkpointPriority')"
            style="min-width: 8rem"
            sortField="cp_priority"
          >
            <template #body="{ data }">
              <div class="text-left">{{ data.cp_priority }}</div>
            </template>
          </Column>

          <Column
            :header="t('areaPrintOptionsDialog.checkpointName')"
            style="min-width: 16rem"
            sortField="cp_name"
          >
            <template #body="{ data }">
              <div class="flex flex-col">
                <div class="text-slate-800 font-medium">{{ data.cp_name || '-' }}</div>
                <div class="text-slate-600 text-xs mt-1">{{ data.cp_code || '-' }}</div>
              </div>
            </template>
          </Column>

          <Column
            :header="t('areaPrintOptionsDialog.area')"
            style="min-width: 10rem"
            sortField="area_label"
          >
            <template #body="{ data }">
              <div class="text-slate-800">{{ data.area_label || '-' }}</div>
            </template>
          </Column>

          <Column :header="t('areaPrintOptionsDialog.qrImg')" style="min-width: 10rem" sortDisabled>
            <template #body="{ data }">
              <div class="flex justify-start">
                <QrPreview
                  :value="data.cp_qr"
                  :printItem="{
                    areaLabel: data.area_label,
                    cpName: data.cp_name,
                    cpCode: data.cp_code,
                    cpPriority: data.cp_priority,
                  }"
                />
              </div>
            </template>
          </Column>
        </BaseDataTable>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton
          :label="t('common.cancel')"
          size="small"
          severity="secondary"
          outlined
          @click="closeDialog"
        />
        <BaseIconButton
          icon="pi pi-file-pdf"
          :label="t('areaPrintOptionsDialog.exportPdf')"
          size="small"
          severity="secondary"
          :disabled="!previewRows.length"
          :loading="printing"
          @click="onPrint"
        />
      </div>
    </template>
  </Dialog>
</template>
