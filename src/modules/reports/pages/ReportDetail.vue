<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Dropdown from 'primevue/dropdown'
import Textarea from 'primevue/textarea'

import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

import { useAuthStore } from '@/stores/auth.store'
import { useReportsStore } from '@/modules/reports/reports.store'
import {
  fetchReportRowById,
  fetchReportImagesByReportId,
  updateReportMock,
} from '@/modules/reports/reports.api'
import type { ReportRow } from '@/modules/reports/reports.types'

import BaseImageViewer from '@/components/common/BaseImageViewer.vue'

type ExistingImg = {
  pri_id: number
  src: string
  removed: boolean
}

type NewImg = {
  id: string
  src: string
}

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const auth = useAuthStore()
const reportsStore = useReportsStore()

const loading = ref(false)
const row = ref<ReportRow | null>(null)

const canEdit = computed(() => auth.canAccess('reports.edit'))
const canDelete = computed(() => auth.canAccess('reports.delete'))
const canViewAll = computed(() => auth.canAccess('reports.view_all'))

const prId = computed(() => Number(route.params.id))

function formatDate(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function normalizeBase64ToSrc(base64: string) {
  const s = (base64 ?? '').trim()
  if (!s) return ''
  if (s.startsWith('data:image/')) return s
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return `data:image/jpeg;base64,${s}`
}

const headerTitle = computed(() => {
  const cp = row.value?.cp_name ?? ''
  return cp ? `${cp} Report Detail` : 'Report Detail'
})

const headerMeta = computed(() => {
  if (!row.value) return ''
  const guard = row.value.user_name || '-'
  const role = row.value.role_name || row.value.role_code || '-'
  const d = formatDate(row.value.created_at)
  const t = formatTime(row.value.created_at)
  return `${guard} - ${role} - ${d} - ${t}`
})

function goBack() {
  router.push({ name: 'reports' })
}

/* Photo viewer (reuse BaseImageViewer) */
const viewerVisible = ref(false)
const viewerImages = ref<{ id: number; src: string }[]>([])

async function openPhotoViewer() {
  if (!row.value) return

  loading.value = true
  try {
    const imgs = await fetchReportImagesByReportId(row.value.pr_id)
    viewerImages.value = imgs
      .map((x: any) => ({ id: x.pri_id, src: x.pri_image }))
      .filter((x: any) => !!String(x.src ?? '').trim())

    viewerVisible.value = true
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? 'Failed to load images.',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

/* Edit form state */
const isEditing = ref(false)

const formResult = ref<'OK' | 'NOT_OK'>('OK')
const formNote = ref('')

const existingImages = ref<ExistingImg[]>([])
const newImages = ref<NewImg[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

const resultOptions = [
  { label: 'OK', value: 'OK' },
  { label: 'Not OK', value: 'NOT_OK' },
]

function enterEdit() {
  if (!row.value) return
  if (!canEdit.value) return

  isEditing.value = true
  formResult.value = row.value.pr_check ? 'OK' : 'NOT_OK'
  formNote.value = row.value.pr_note ?? ''

  existingImages.value = []
  newImages.value = []

  loadImagesForEdit()
}

async function loadImagesForEdit() {
  if (!row.value) return

  loading.value = true
  try {
    const imgs = await fetchReportImagesByReportId(row.value.pr_id)
    existingImages.value = imgs
      .map((x: any) => ({
        pri_id: x.pri_id,
        src: normalizeBase64ToSrc(x.pri_image),
        removed: false,
      }))
      .filter((x: ExistingImg) => !!x.src)
  } finally {
    loading.value = false
  }
}

function cancelEdit() {
  isEditing.value = false
  existingImages.value = []
  newImages.value = []
}

function toggleRemoveExisting(id: number) {
  const item = existingImages.value.find((x) => x.pri_id === id)
  if (!item) return
  item.removed = !item.removed
}

function removeNew(id: string) {
  newImages.value = newImages.value.filter((x) => x.id !== id)
}

function clickChoosePhoto() {
  fileInputRef.value?.click()
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('READ_FILE_FAILED'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  })
}

async function onChooseFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''

  if (files.length === 0) return

  const maxAdd = 10
  const allowed = files.slice(0, maxAdd)

  for (const f of allowed) {
    const dataUrl = await fileToDataUrl(f)
    const id = `${Date.now()}-${Math.random()}`
    newImages.value.push({ id, src: dataUrl })
  }
}

async function submitEdit() {
  if (!row.value) return
  if (!canEdit.value) return

  const actor = auth.user?.user_id ?? ''
  if (!actor) return

  const delIds = existingImages.value.filter((x) => x.removed).map((x) => x.pri_id)
  const addImgs = newImages.value.map((x) => x.src)

  loading.value = true
  try {
    await updateReportMock({
      pr_id: row.value.pr_id,
      pr_check: formResult.value === 'OK',
      pr_note: formNote.value,
      delete_image_ids: delIds,
      add_images: addImgs,
      actor_id: actor,
    })

    await reportsStore.load()
    row.value = await fetchReportRowById(row.value.pr_id)

    isEditing.value = false
    existingImages.value = []
    newImages.value = []

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Report has been updated.',
      life: 2000,
    })
    const q: any = { ...route.query }
    if (q.edit) {
      delete q.edit
      router.replace({ query: q })
    }
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? 'Failed to update report.',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

function onDelete() {
  if (!row.value) return

  confirm.require({
    header: 'Confirm Delete',
    message: 'Delete this report?',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: () => {
      reportsStore.deleteLocal(row.value!.pr_id)
      toast.add({
        severity: 'success',
        summary: 'Deleted',
        detail: 'Report has been deleted.',
        life: 2000,
      })
      goBack()
    },
  })
}

onMounted(async () => {
  if (!Number.isFinite(prId.value) || prId.value <= 0) {
    router.replace({ name: 'reports' })
    return
  }

  loading.value = true
  try {
    const r = await fetchReportRowById(prId.value)

    if (!r) {
      toast.add({
        severity: 'warn',
        summary: 'Not Found',
        detail: 'Report not found.',
        life: 2500,
      })
      goBack()
      return
    }

    const currentUserId = auth.user?.user_id ?? ''
    if (!canViewAll.value && r.created_by !== currentUserId) {
      router.replace({ name: 'forbidden' })
      return
    }

    row.value = r

    const autoEdit = String(route.query.edit ?? '') === '1'
    if (autoEdit && canEdit.value) {
      enterEdit()
      const q: any = { ...route.query }
      delete q.edit
      router.replace({ query: q })
    }
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e?.message ?? 'Failed to load report detail.',
      life: 3000,
    })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-start justify-between gap-3">
      <div class="text-left">
        <div class="text-xl font-semibold text-slate-800">{{ headerTitle }}</div>
        <div class="text-sm text-slate-600 mt-1">{{ headerMeta }}</div>
      </div>

      <div class="flex gap-2">
        <BaseButton
          v-if="!isEditing"
          label="Edit"
          severity="warning"
          outlined
          :disabled="!canEdit || !row"
          @click="enterEdit"
        />
        <BaseButton
          v-if="!isEditing"
          label="Delete"
          severity="danger"
          outlined
          :disabled="!canDelete || !row"
          @click="onDelete"
        />
        <BaseButton label="Back" severity="secondary" outlined @click="goBack" />
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div v-if="loading" class="p-4 text-slate-600">Loading...</div>

      <div v-else-if="row" class="p-4">
        <table class="w-full border-collapse">
          <tbody>
            <tr class="border-b border-slate-200">
              <td class="w-48 py-3 text-sm text-slate-600 font-medium">Area</td>
              <td class="py-3 text-slate-800">{{ row.area_code }} - {{ row.area_name }}</td>
            </tr>

            <tr class="border-b border-slate-200">
              <td class="w-48 py-3 text-sm text-slate-600 font-medium">Scan Point</td>
              <td class="py-3 text-slate-800">{{ row.cp_name }}</td>
            </tr>

            <tr class="border-b border-slate-200">
              <td class="w-48 py-3 text-sm text-slate-600 font-medium">Result</td>
              <td class="py-3">
                <template v-if="!isEditing">
                  <Tag
                    :value="row.pr_check ? 'OK' : 'Not OK'"
                    :severity="row.pr_check ? 'success' : 'danger'"
                  />
                </template>

                <template v-else>
                  <Dropdown
                    v-model="formResult"
                    class="w-56"
                    :options="resultOptions"
                    optionLabel="label"
                    optionValue="value"
                  />
                </template>
              </td>
            </tr>

            <tr class="border-b border-slate-200">
              <td class="w-48 py-3 text-sm text-slate-600 font-medium">Note</td>
              <td class="py-3">
                <template v-if="!isEditing">
                  <div class="text-slate-800 whitespace-pre-wrap">
                    {{ row.pr_note?.trim() ? row.pr_note : '—' }}
                  </div>
                </template>

                <template v-else>
                  <BaseInput v-model="formNote" class="w-full" rows="4" size="medium" />
                </template>
              </td>
            </tr>

            <tr>
              <td class="w-48 py-3 text-sm text-slate-600 font-medium">Photo</td>
              <td class="py-3">
                <template v-if="!isEditing">
                  <div class="flex items-center gap-3">
                    <div class="text-sm text-slate-600">{{ row.image_count }} file(s)</div>
                    <BaseButton
                      label="View"
                      severity="secondary"
                      outlined
                      :disabled="row.image_count === 0"
                      @click="openPhotoViewer"
                    />
                  </div>
                </template>

                <template v-else>
                  <div class="space-y-3">
                    <div>
                      <div class="text-sm text-slate-600 mb-2">Existing Photos</div>

                      <div v-if="existingImages.length === 0" class="text-slate-600 text-sm">
                        No existing photos.
                      </div>

                      <div v-else class="flex flex-wrap gap-3">
                        <div
                          v-for="img in existingImages"
                          :key="img.pri_id"
                          class="border rounded-lg p-2"
                          :class="img.removed ? 'border-red-300 bg-red-50' : 'border-slate-200'"
                        >
                          <img
                            :src="img.src"
                            alt="Existing"
                            class="w-28 h-20 object-cover rounded"
                          />
                          <div class="mt-2 flex justify-end">
                            <BaseButton
                              :label="img.removed ? 'Undo' : 'Remove'"
                              severity="secondary"
                              outlined
                              size="small"
                              @click="toggleRemoveExisting(img.pri_id)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div class="text-sm text-slate-600 mb-2">Add New Photos</div>

                      <div class="flex items-center gap-2">
                        <input
                          ref="fileInputRef"
                          type="file"
                          accept="image/*"
                          multiple
                          class="hidden"
                          @change="onChooseFiles"
                        />
                        <BaseButton
                          label="Choose Photo"
                          severity="secondary"
                          outlined
                          @click="clickChoosePhoto"
                        />
                        <div class="text-sm text-slate-600">{{ newImages.length }} selected</div>
                      </div>

                      <div v-if="newImages.length > 0" class="mt-3 flex flex-wrap gap-3">
                        <div
                          v-for="img in newImages"
                          :key="img.id"
                          class="border border-slate-200 rounded-lg p-2"
                        >
                          <img :src="img.src" alt="New" class="w-28 h-20 object-cover rounded" />
                          <div class="mt-2 flex justify-end">
                            <BaseButton
                              label="Remove"
                              severity="secondary"
                              outlined
                              size="small"
                              @click="removeNew(img.id)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="flex justify-end gap-2 pt-2">
                      <BaseButton
                        label="Cancel"
                        severity="secondary"
                        outlined
                        @click="cancelEdit"
                      />
                      <BaseButton label="Submit" severity="success" @click="submitEdit" />
                    </div>
                  </div>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="p-4 text-slate-600">No data.</div>
    </div>

    <BaseImageViewer
      v-model:visible="viewerVisible"
      :title="`Photos (${viewerImages.length})`"
      :images="viewerImages"
    />
  </div>
</template>
