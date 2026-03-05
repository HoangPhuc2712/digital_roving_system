<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'

import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseImageViewer from '@/components/common/BaseImageViewer.vue'

import type { ReportRow } from '@/modules/reports/reports.types'

type BaseImageItem = {
  id: string | number
  src: string
  alt?: string
  title?: string
}

export type ReportFormModel = ReportRow

const props = defineProps<{
  visible: boolean
  model: ReportFormModel | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'close'): void
}>()

const viewerVisible = ref(false)
const viewerTitle = ref('Photos')
const viewerItems = ref<BaseImageItem[]>([])

function close() {
  emit('update:visible', false)
  emit('close')
}

function formatDateTime(iso: string) {
  const s = (iso ?? '').trim()
  if (!s) return '—'
  const d = new Date(s)
  if (!Number.isFinite(d.getTime())) return s
  const pad2 = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes(),
  )}:${pad2(d.getSeconds())}`
}

function formatSeconds(sec: number) {
  const s = Math.max(0, Number(sec) || 0)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = String(m).padStart(2, '0')
  const rr = String(r).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${rr}` : `${m}:${rr.padStart(2, '0')}`
}

function issueStatusLabel(s: number) {
  switch (s) {
    case 0:
      return 'Pending'
    case 1:
      return 'In Progress'
    case 2:
      return 'Completed'
    case 3:
      return 'Incompleted'
    default:
      return '—'
  }
}

function issueStatusSeverity(s: number) {
  // PrimeVue Tag severity: success | info | warning | danger | secondary
  switch (s) {
    case 0:
      return 'warning'
    case 1:
      return 'info'
    case 2:
      return 'success'
    case 3:
      return 'danger'
    default:
      return 'secondary'
  }
}

const inspectionOk = computed(() => (props.model ? props.model.pr_has_problem === false : true))

const images = computed<BaseImageItem[]>(() => {
  const m = props.model
  const list = m?.report_images ?? []
  return list
    .map((x, idx) => ({
      id: x.pri_id || `${idx + 1}`,
      src: x.pri_image,
      title: `Photo ${idx + 1}`,
      alt: `Photo ${idx + 1}`,
    }))
    .filter((x) => !!(x.src ?? '').trim())
})

const thumbnailImages = computed(() => images.value.slice(0, 3))
const hasMore = computed(() => images.value.length > 3)

function openViewer(startIndex: number) {
  const items = images.value
  if (!items.length) return

  const idx = Math.max(0, Math.min(startIndex, items.length - 1))
  // Move clicked image to front so gallery opens at it
  const rotated = items.slice(idx).concat(items.slice(0, idx))

  viewerTitle.value = `Photos (${items.length})`
  viewerItems.value = rotated
  viewerVisible.value = true
}

watch(
  () => props.visible,
  (v) => {
    if (!v) {
      viewerVisible.value = false
      viewerItems.value = []
    }
  },
)
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Report Detail"
    :style="{ width: '980px', maxWidth: '95vw' }"
    :contentStyle="{ maxHeight: '78vh', overflow: 'auto' }"
    @update:visible="emit('update:visible', $event)"
    @hide="close"
  >
    <div v-if="!model" class="text-slate-500">No data.</div>

    <div v-else class="space-y-4">
      <div class="space-y-1">
        <div class="text-lg font-semibold text-slate-800">
          {{ model.cp_code }} - {{ model.cp_name }}
        </div>
        <div class="text-sm text-slate-600">
          Area:
          <span class="text-slate-800 font-semibold"
            >{{ model.area_code }} - {{ model.area_name }}</span
          >
        </div>
        <div class="text-sm text-slate-600">
          Guard:
          <span class="text-slate-800 font-semibold">{{
            model.created_name || model.created_by
          }}</span>
        </div>
        <div class="text-sm text-slate-600">
          Patrol Date:
          <span class="text-slate-800 font-semibold">{{
            formatDateTime(model.scan_at || model.created_at)
          }}</span>
        </div>

        <div class="flex flex-wrap gap-2 pt-1">
          <Tag
            :value="issueStatusLabel(model.pr_status)"
            :severity="issueStatusSeverity(model.pr_status)"
          />
          <Tag
            :value="inspectionOk ? 'OK' : 'Not OK'"
            :severity="inspectionOk ? 'success' : 'danger'"
          />
          <Tag :value="`Actual: ${formatSeconds(model.pr_second)}`" severity="secondary" />
          <Tag :value="`Standard: ${formatSeconds(model.rd_second)}`" severity="secondary" />
        </div>
      </div>

      <div class="border-t border-slate-200 pt-3">
        <div class="text-sm font-semibold text-slate-800 mb-1">Note</div>
        <div class="text-slate-700 whitespace-pre-wrap">
          {{ (model.pr_note || '').trim() || '-' }}
        </div>
      </div>

      <div class="border-t border-slate-200 pt-3">
        <div class="text-sm font-semibold text-slate-800 mb-2">Photos</div>

        <div v-if="images.length === 0" class="text-sm text-slate-500">No photos.</div>

        <div v-else class="flex items-center gap-3 flex-wrap">
          <button
            v-for="(img, idx) in thumbnailImages"
            :key="img.id"
            type="button"
            class="border border-slate-200 rounded-lg overflow-hidden hover:border-slate-400 transition"
            @click="openViewer(idx)"
          >
            <img :src="img.src" :alt="img.alt" class="h-16 w-16 object-cover" />
          </button>

          <BaseButton
            v-if="hasMore"
            label="View more"
            severity="secondary"
            outlined
            @click="openViewer(0)"
          />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <BaseButton label="Close" severity="secondary" outlined @click="close" />
      </div>
    </div>

    <BaseImageViewer v-model:visible="viewerVisible" :title="viewerTitle" :images="viewerItems" />
  </Dialog>
</template>
