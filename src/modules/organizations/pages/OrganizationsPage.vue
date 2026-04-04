<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import OrganizationChart from 'primevue/organizationchart'
import TreeTable from 'primevue/treetable'
import Column from 'primevue/column'

import BaseConfirmDelete from '@/components/common/BaseConfirmDelete.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import BaseSelectButton from '@/components/common/buttons/BaseSelectButton.vue'

import OrganizationNodeCard from '../components/OrganizationNodeCard.vue'
import { organizationMockMembers } from '../organizations.mock'
import type { OrganizationMember, OrganizationTreeNode } from '../organizations.types'

type OrganizationChartMember = OrganizationMember & {
  childrenCount?: number
  level?: number
}

const toast = useToast()
const { t } = useI18n()

type ViewMode = 'orgChart' | 'treeTable'
type SelectOptionValue = string | number | boolean | null
type SelectOption = { label: string; value: SelectOptionValue; icon?: string; disabled?: boolean }

const members = ref<OrganizationMember[]>(organizationMockMembers.map((item) => ({ ...item })))
const viewMode = ref<ViewMode>('orgChart')
const zoomScale = ref(1)
const chartViewport = ref<HTMLElement | null>(null)
const chartStage = ref<HTMLElement | null>(null)
const chartWidth = ref(0)
const chartHeight = ref(0)
const isDragging = ref(false)
const chartDragStart = ref({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })
const chartPadding = 32
const confirmDeleteVisible = ref(false)
const confirmDeleteLoading = ref(false)
const confirmDeleteMessage = ref('')
const pendingDeleteMember = ref<OrganizationMember | null>(null)
const organizationChartValue = computed<OrganizationTreeNode | null>(
  () => organizationNodes.value[0] ?? null,
)

const viewOptions = computed<SelectOption[]>(() => [
  {
    label: t('organizations.viewModes.orgChart'),
    value: 'orgChart',
    icon: 'pi pi-sitemap',
  },
  {
    label: t('organizations.viewModes.treeTable'),
    value: 'treeTable',
    icon: 'pi pi-table',
  },
])

const organizationNodes = computed(() => buildOrganizationTree(members.value))

const currentViewLabel = computed(() =>
  viewMode.value === 'orgChart'
    ? t('organizations.viewModes.orgChart')
    : t('organizations.viewModes.treeTable'),
)

const chartCanvasStyle = computed(() => ({
  width: `${Math.max(chartWidth.value * zoomScale.value + chartPadding * 2, 640)}px`,
  height: `${Math.max(chartHeight.value * zoomScale.value + chartPadding * 2, 420)}px`,
}))

const chartStageStyle = computed(() => ({
  transform: `translate(${chartPadding}px, ${chartPadding}px) scale(${zoomScale.value})`,
  transformOrigin: 'top left',
}))

let chartResizeObserver: ResizeObserver | null = null

watch(
  organizationNodes,
  async () => {
    await nextTick()
    measureChartStage()
  },
  { deep: true },
)

onMounted(async () => {
  await nextTick()
  setupChartResizeObserver()
  measureChartStage()
  window.addEventListener('mousemove', onChartMouseMove)
  window.addEventListener('mouseup', endChartDrag)
})

onBeforeUnmount(() => {
  chartResizeObserver?.disconnect()
  window.removeEventListener('mousemove', onChartMouseMove)
  window.removeEventListener('mouseup', endChartDrag)
})

function compareOrder(a: OrganizationMember, b: OrganizationMember) {
  return a.order - b.order || a.userName.localeCompare(b.userName)
}

function buildOrganizationTree(source: OrganizationMember[]) {
  const nodeMap = new Map<string, OrganizationTreeNode>()
  const roots: OrganizationTreeNode[] = []

  const sortedMembers = [...source].sort(compareOrder)

  for (const member of sortedMembers) {
    nodeMap.set(member.id, {
      key: member.id,
      type: 'person',
      label: member.userName,
      expanded: true,
      selectable: false,
      data: {
        ...member,
        childrenCount: 0,
        level: 0,
      },
      children: [],
    })
  }

  for (const member of sortedMembers) {
    const node = nodeMap.get(member.id)
    if (!node) continue

    if (!member.parentId || !nodeMap.has(member.parentId)) {
      roots.push(node)
      continue
    }

    const parent = nodeMap.get(member.parentId)
    parent?.children?.push(node)
  }

  const finalizeNode = (node: OrganizationTreeNode, level = 0): OrganizationTreeNode => {
    const children = [...(node.children ?? [])]
      .sort((a, b) => compareOrder(a.data, b.data))
      .map((child) => finalizeNode(child, level + 1))

    return {
      ...node,
      expanded: true,
      data: {
        ...node.data,
        childrenCount: children.length,
        level,
      },
      children,
    }
  }

  return roots.sort((a, b) => compareOrder(a.data, b.data)).map((node) => finalizeNode(node, 0))
}

function setupChartResizeObserver() {
  chartResizeObserver?.disconnect()
  if (!chartStage.value) return

  chartResizeObserver = new ResizeObserver(() => {
    measureChartStage()
  })

  chartResizeObserver.observe(chartStage.value)
}

function measureChartStage() {
  if (!chartStage.value) return
  chartWidth.value = chartStage.value.offsetWidth || 0
  chartHeight.value = chartStage.value.offsetHeight || 0
}

function normalizeZoom(nextValue: number) {
  return Math.min(2, Math.max(0.5, Number(nextValue.toFixed(2))))
}

function setZoom(nextValue: number) {
  zoomScale.value = normalizeZoom(nextValue)
}

function resetZoom() {
  zoomScale.value = 1
}

function zoomChart(direction: 1 | -1) {
  setZoom(zoomScale.value + direction * 0.1)
}

function onChartWheel(event: WheelEvent) {
  const viewport = chartViewport.value
  if (!viewport) return

  event.preventDefault()

  const nextScale = normalizeZoom(zoomScale.value + (event.deltaY < 0 ? 0.1 : -0.1))
  if (nextScale === zoomScale.value) return

  const rect = viewport.getBoundingClientRect()
  const offsetX = event.clientX - rect.left
  const offsetY = event.clientY - rect.top
  const logicalX = (viewport.scrollLeft + offsetX - chartPadding) / zoomScale.value
  const logicalY = (viewport.scrollTop + offsetY - chartPadding) / zoomScale.value

  zoomScale.value = nextScale

  nextTick(() => {
    viewport.scrollLeft = logicalX * nextScale + chartPadding - offsetX
    viewport.scrollTop = logicalY * nextScale + chartPadding - offsetY
  })
}

function onChartMouseDown(event: MouseEvent) {
  if (event.button !== 0 || !chartViewport.value) return

  const target = event.target as HTMLElement | null
  if (
    target?.closest(
      [
        '.p-node-toggler',
        '.p-node-toggler *',
        '.p-node-toggler-icon',
        '.p-organizationchart-node-toggler',
        '.p-organizationchart-node-toggler *',
        '.p-organizationchart-node-toggle-button',
        '.p-organizationchart-node-toggle-button *',
        'button',
        '[role="button"]',
        '.p-popover',
        '.p-popover *',
      ].join(', '),
    )
  ) {
    return
  }

  isDragging.value = true
  chartDragStart.value = {
    x: event.clientX,
    y: event.clientY,
    scrollLeft: chartViewport.value.scrollLeft,
    scrollTop: chartViewport.value.scrollTop,
  }
}

function onChartMouseMove(event: MouseEvent) {
  if (!isDragging.value || !chartViewport.value) return

  chartViewport.value.scrollLeft =
    chartDragStart.value.scrollLeft - (event.clientX - chartDragStart.value.x)
  chartViewport.value.scrollTop =
    chartDragStart.value.scrollTop - (event.clientY - chartDragStart.value.y)
}

function endChartDrag() {
  isDragging.value = false
}

function onEdit(member: OrganizationMember) {
  toast.add({
    severity: 'info',
    summary: t('common.edit'),
    detail: `${member.userName} - ${t('organizations.toast.editPending')}`,
    life: 2500,
  })
}

function requestDelete(member: OrganizationMember) {
  pendingDeleteMember.value = member
  confirmDeleteMessage.value = `${t('organizations.deleteConfirm')} ${member.userName}?`
  confirmDeleteVisible.value = true
}

function collectDescendantIds(memberId: string) {
  const ids = new Set<string>([memberId])
  let changed = true

  while (changed) {
    changed = false
    for (const member of members.value) {
      if (!member.parentId || ids.has(member.id) || !ids.has(member.parentId)) continue
      ids.add(member.id)
      changed = true
    }
  }

  return ids
}

async function onConfirmDelete() {
  if (!pendingDeleteMember.value || confirmDeleteLoading.value) return

  confirmDeleteLoading.value = true
  try {
    const ids = collectDescendantIds(pendingDeleteMember.value.id)
    members.value = members.value.filter((member) => !ids.has(member.id))
    confirmDeleteVisible.value = false
    toast.add({
      severity: 'success',
      summary: t('common.deleted'),
      detail: t('organizations.toast.deleted'),
      life: 2200,
    })
    pendingDeleteMember.value = null
  } finally {
    confirmDeleteLoading.value = false
  }
}

function closeDeleteConfirm() {
  confirmDeleteVisible.value = false
  confirmDeleteLoading.value = false
  pendingDeleteMember.value = null
}

function onViewModeChange(value: SelectOptionValue) {
  viewMode.value = value === 'treeTable' ? 'treeTable' : 'orgChart'
}

function resolveOrganizationChartMember(slotProps: any): OrganizationChartMember | null {
  const source = slotProps?.node?.data ?? slotProps?.node ?? slotProps?.data ?? null
  if (!source) return null

  const userName = String(source.userName ?? source.label ?? '').trim()
  if (!userName) return null

  const fallbackChildren = Array.isArray(slotProps?.node?.children)
    ? slotProps.node.children.length
    : Array.isArray(source.children)
      ? source.children.length
      : 0

  return {
    id: String(source.id ?? source.key ?? userName),
    userCode: String(source.userCode ?? ''),
    userName,
    roleName: String(source.roleName ?? ''),
    areaName: String(source.areaName ?? ''),
    parentId: source.parentId == null ? null : String(source.parentId),
    email: String(source.email ?? ''),
    phone: String(source.phone ?? ''),
    active: typeof source.active === 'boolean' ? source.active : true,
    order: Number(source.order ?? 0),
    childrenCount: Number(source.childrenCount ?? fallbackChildren),
    level: Number(source.level ?? 0),
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 p-4 lg:p-6">
    <div class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 class="text-3xl font-semibold text-slate-900">{{ t('organizations.title') }}</h1>
          <p class="mt-1 text-sm text-slate-500">
            {{ t('organizations.description') }}
          </p>
        </div>

        <div class="flex flex-col gap-2 lg:items-end">
          <BaseSelectButton
            :model-value="viewMode"
            :options="viewOptions"
            @update:model-value="onViewModeChange"
          />
          <div class="text-xs text-slate-500">
            {{ t('organizations.currentView') }}: {{ currentViewLabel }}
          </div>
        </div>
      </div>

      <div
        class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
      >
        {{ t('organizations.helper') }}
      </div>
    </div>

    <div
      v-if="viewMode === 'orgChart'"
      class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="text-sm font-medium text-slate-700">
          {{ t('organizations.viewModes.orgChart') }}
        </div>

        <div class="flex items-center gap-2">
          <span class="min-w-16 text-right text-sm text-slate-500">
            {{ t('organizations.zoomLabel', { value: Math.round(zoomScale * 100) }) }}
          </span>
          <BaseIconButton
            icon="pi pi-minus"
            size="small"
            severity="secondary"
            outlined
            rounded
            @click="zoomChart(-1)"
          />
          <BaseIconButton
            icon="pi pi-refresh"
            size="small"
            severity="secondary"
            outlined
            rounded
            @click="resetZoom"
          />
          <BaseIconButton
            icon="pi pi-plus"
            size="small"
            severity="secondary"
            outlined
            rounded
            @click="zoomChart(1)"
          />
        </div>
      </div>

      <div
        ref="chartViewport"
        class="organization-chart relative h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50"
        :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
        @wheel="onChartWheel"
        @mousedown.capture="onChartMouseDown"
      >
        <div class="relative min-h-full min-w-full" :style="chartCanvasStyle">
          <div
            ref="chartStage"
            class="absolute left-0 top-0 origin-top-left"
            :style="chartStageStyle"
          >
            <OrganizationChart
              v-if="organizationChartValue"
              :value="organizationChartValue"
              collapsible
            >
              <template #default="slotProps">
                <OrganizationNodeCard
                  v-if="resolveOrganizationChartMember(slotProps)"
                  :member="resolveOrganizationChartMember(slotProps)!"
                  @edit="onEdit"
                  @delete="requestDelete"
                />
                <span v-else class="text-sm text-slate-700">{{
                  slotProps?.node?.label ?? ''
                }}</span>
              </template>

              <template #person="slotProps">
                <OrganizationNodeCard
                  v-if="resolveOrganizationChartMember(slotProps)"
                  :member="resolveOrganizationChartMember(slotProps)!"
                  @edit="onEdit"
                  @delete="requestDelete"
                />
                <span v-else class="text-sm text-slate-700">{{
                  slotProps?.node?.label ?? ''
                }}</span>
              </template>
            </OrganizationChart>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div class="text-sm font-medium text-slate-700">
        {{ t('organizations.viewModes.treeTable') }}
      </div>

      <TreeTable
        :value="organizationNodes"
        scrollable
        scrollHeight="65vh"
        tableStyle="min-width: 72rem"
        class="rounded-xl border border-slate-200"
      >
        <Column
          field="userName"
          :header="t('organizations.table.userName')"
          expander
          style="min-width: 18rem"
        >
          <template #body="slotProps">
            <div class="flex flex-col gap-1">
              <span class="font-medium text-slate-900">{{ slotProps.node.data.userName }}</span>
              <span class="text-xs text-slate-500">{{ slotProps.node.data.email }}</span>
            </div>
          </template>
        </Column>

        <Column
          field="userCode"
          :header="t('organizations.table.userCode')"
          style="min-width: 10rem"
        >
          <template #body="slotProps">
            {{ slotProps.node.data.userCode }}
          </template>
        </Column>

        <Column
          field="roleName"
          :header="t('organizations.table.roleName')"
          style="min-width: 14rem"
        >
          <template #body="slotProps">
            {{ slotProps.node.data.roleName }}
          </template>
        </Column>

        <Column
          field="areaName"
          :header="t('organizations.table.areaName')"
          style="min-width: 10rem"
        >
          <template #body="slotProps">
            {{ slotProps.node.data.areaName }}
          </template>
        </Column>

        <Column
          field="childrenCount"
          :header="t('organizations.table.teamSize')"
          style="min-width: 8rem"
        >
          <template #body="slotProps">
            {{ slotProps.node.data.childrenCount ?? 0 }}
          </template>
        </Column>

        <Column :header="t('common.action')" style="min-width: 10rem">
          <template #body="slotProps">
            <div class="flex items-center gap-2">
              <BaseIconButton
                icon="pi pi-pencil"
                size="small"
                severity="secondary"
                outlined
                rounded
                @click="onEdit(slotProps.node.data)"
              />
              <BaseIconButton
                icon="pi pi-trash"
                size="small"
                severity="danger"
                outlined
                rounded
                @click="requestDelete(slotProps.node.data)"
              />
            </div>
          </template>
        </Column>
      </TreeTable>
    </div>

    <BaseConfirmDelete
      :visible="confirmDeleteVisible"
      :message="confirmDeleteMessage"
      :loading="confirmDeleteLoading"
      @update:visible="confirmDeleteVisible = $event"
      @cancel="closeDeleteConfirm"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<style scoped>
:deep(.p-organizationchart-table) {
  margin: 0 auto;
}

:deep(.p-organizationchart-node-content) {
  padding: 0;
  border: none;
  background: transparent;
  overflow: visible;
}

:deep(.p-node-toggler),
:deep(.p-node-toggler-icon),
:deep(.p-organizationchart-node-toggler),
:deep(.p-organizationchart-node-toggle-button) {
  cursor: pointer;
  pointer-events: auto;
}

:deep(.p-organizationchart-table td),
:deep(.p-organizationchart-table tr) {
  pointer-events: auto;
}

:deep(.p-treetable .p-treetable-tbody > tr > td) {
  vertical-align: middle;
}
</style>
