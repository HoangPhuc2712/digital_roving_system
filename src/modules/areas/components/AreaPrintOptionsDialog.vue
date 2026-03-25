<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import Column from 'primevue/column'
import { useToast } from 'primevue/usetoast'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseDataTable from '@/components/common/BaseDataTable.vue'
import type { CheckpointRow, RoleOption } from '@/modules/checkpoints/checkpoints.types'
import { fetchCheckpointRows, fetchRoleOptions } from '@/modules/checkpoints/checkpoints.api'
import {
  printCheckpointQrSheets,
  type CheckpointPrintItem,
} from '@/services/print/checkpoints.print'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

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
}

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
const selectedRoleId = ref<number | 'ALL'>('ALL')
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
  () => selectedAreaIds.value.length > 0 || selectedRoleId.value !== 'ALL',
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

      if (selectedRoleId.value !== 'ALL') {
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
    if (!visible) return
    await ensureLoaded()
  },
)

function normalizeQr(src: string) {
  const s = String(src ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:image/')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return `data:image/png;base64,${s}`
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
      detail: String(e?.message ?? 'Failed to load print options.'),
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function closeDialog() {
  visibleProxy.value = false
}

function buildPrintItems(rows: PreviewRow[]): CheckpointPrintItem[] {
  return rows.map((row) => ({
    areaLabel: row.area_label,
    cpName: row.cp_name,
    cpCode: row.cp_code,
    cpPriority: row.cp_priority,
    qrSrc: row.cp_qr,
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
  <Dialog
    v-model:visible="visibleProxy"
    modal
    header="Print Options"
    :style="{ width: '1100px', maxWidth: '96vw' }"
  >
    <div class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label class="block text-sm font-medium text-slate-700">Area</label>
          <MultiSelect
            v-model="selectedAreaIds"
            :options="areaOptions"
            optionLabel="label"
            optionValue="value"
            filter
            display="chip"
            placeholder="Select area"
            class="w-full"
            :disabled="loading"
            :maxSelectedLabels="2"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-slate-700">Role</label>
          <Select
            v-model="selectedRoleId"
            :options="roleFilterOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select role"
            class="w-full"
            :disabled="loading"
          />
        </div>
      </div>

      <div v-if="hasAppliedFilter">
        <BaseDataTable
          title=""
          :value="previewRows"
          :loading="loading"
          dataKey="cp_id"
          :paginator="false"
        >
          <template #empty>
            <div class="py-6 text-center text-slate-500">No check points found.</div>
          </template>

          <Column header="CP Priority" style="min-width: 8rem" sortField="cp_priority">
            <template #body="{ data }">
              <div class="text-center">{{ data.cp_priority }}</div>
            </template>
          </Column>

          <Column header="Check Point Name" style="min-width: 16rem" sortField="cp_name">
            <template #body="{ data }">
              <div class="flex flex-col">
                <div class="text-slate-800 font-medium">{{ data.cp_name || '-' }}</div>
                <div class="text-slate-600 text-xs mt-1">{{ data.cp_code || '-' }}</div>
              </div>
            </template>
          </Column>

          <Column header="Qr Code" style="min-width: 10rem" sortDisabled>
            <template #body="{ data }">
              <div class="flex justify-center">
                <div class="border border-slate-200 rounded-md overflow-hidden bg-white w-12 h-12">
                  <img
                    v-if="normalizeQr(data.cp_qr)"
                    :src="normalizeQr(data.cp_qr)"
                    alt="QR"
                    class="w-full h-full object-cover block"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-[10px] text-slate-500"
                  >
                    N/A
                  </div>
                </div>
              </div>
            </template>
          </Column>
        </BaseDataTable>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton label="Cancel" severity="secondary" outlined @click="closeDialog" />
        <BaseIconButton
          icon="pi pi-file-pdf"
          label="Print"
          severity="secondary"
          :disabled="!previewRows.length"
          :loading="printing"
          @click="onPrint"
        />
      </div>
    </template>
  </Dialog>
</template>
