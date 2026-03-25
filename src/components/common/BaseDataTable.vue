<template>
  <div class="card">
    <Toolbar v-if="hasToolbar" class="mb-4">
      <template #start>
        <slot name="toolbar-start" />
      </template>
      <template #end>
        <slot name="toolbar-end" />
      </template>
    </Toolbar>

    <DataTable
      ref="dt"
      :value="value"
      :loading="loading"
      :dataKey="dataKey"
      v-model:selection="selectionProxy"
      :paginator="paginator"
      :rows="rows"
      :first="first"
      :rowsPerPageOptions="rowsPerPageOptions"
      :paginatorTemplate="paginatorTemplate"
      :currentPageReportTemplate="currentPageReportTemplate"
      :stateStorage="props.stateKey ? props.stateStorage : undefined"
      :stateKey="props.stateKey || undefined"
      sortMode="single"
      removableSort
      responsiveLayout="scroll"
      class="app-datatable"
      @page="onPage"
      @sort="onSort"
    >
      <template v-if="showTopFilters" #header>
        <div class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div class="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-end">
            <div v-if="props.showDateSelection" class="min-w-0">
              <BaseDateSelection
                :modelDateFrom="props.modelDateFrom ?? null"
                :modelDateTo="props.modelDateTo ?? null"
                wrapperClass="grid grid-cols-1 gap-3 items-end sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-end"
                :inputWidthClass="props.dateInputWidthClass"
                @update:modelDateFrom="emit('update:modelDateFrom', $event)"
                @update:modelDateTo="emit('update:modelDateTo', $event)"
              />
            </div>

            <div v-if="props.showSearch" :class="props.searchWidthClass" class="min-w-0">
              <BaseInput
                :modelValue="props.modelSearch ?? ''"
                label=""
                inputIcon="pi pi-search"
                size="small"
                class="w-full"
                :placeholder="props.searchPlaceholder || t('common.searchPlaceholder')"
                @update:modelValue="emit('update:modelSearch', $event)"
              />
            </div>
          </div>

          <div class="flex shrink-0 justify-end">
            <BaseIconButton
              icon="pi pi-filter-slash"
              :label="t('common.clearFilters')"
              size="small"
              severity="secondary"
              outlined
              :disabled="props.clearDisabled"
              @click="emit('clear')"
            />
          </div>
        </div>
      </template>

      <VNodeRenderer
        v-for="(node, index) in getNormalizedDefaultNodes()"
        :key="node.key ?? `column-${index}`"
        :vnode="node"
      />

      <template #empty>
        <slot name="empty">
          <div class="py-6 text-center text-slate-500">No data</div>
        </slot>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import {
  Comment,
  Fragment,
  Text,
  computed,
  defineComponent,
  nextTick,
  h,
  isVNode,
  ref,
  useSlots,
  watch,
  type VNode,
} from 'vue'
import { useI18n } from 'vue-i18n'
import DataTable, { type DataTablePageEvent, type DataTableSortEvent } from 'primevue/datatable'
import Toolbar from 'primevue/toolbar'
import MultiSelect from 'primevue/multiselect'
import Popover from 'primevue/popover'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'

import BaseDateSelection from '@/components/common/filters/BaseDateSelection.vue'
import BaseInput from '@/components/common/inputs/BaseInput.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

type AnyRow = Record<string, any>
type SortIconSlotProps = {
  sorted?: boolean
  sortOrder?: number
}

type ColumnFilterType = 'select' | 'multiselect' | 'text'

type FilterOption = {
  label?: string
  value?: any
  [key: string]: any
}

type ColumnFilterMenuConfig = {
  key: string
  type?: ColumnFilterType
  value: any
  options?: FilterOption[]
  optionLabel?: string
  optionValue?: string
  placeholder?: string
  showClear?: boolean
  filter?: boolean
  disabled?: boolean
  filterField?: string
}

const props = withDefaults(
  defineProps<{
    title: string
    value: AnyRow[]
    loading?: boolean
    dataKey?: string
    paginator?: boolean
    rows?: number
    first?: number
    rowsPerPageOptions?: number[]
    paginatorTemplate?: string
    currentPageReportTemplate?: string
    selection?: AnyRow[] | null
    modelSearch?: string
    showSearch?: boolean
    searchPlaceholder?: string
    modelDateFrom?: Date | null
    modelDateTo?: Date | null
    showDateSelection?: boolean
    clearDisabled?: boolean
    searchWidthClass?: string
    dateInputWidthClass?: string
    stateKey?: string
    stateStorage?: 'session' | 'local'
  }>(),
  {
    loading: false,
    dataKey: 'id',
    paginator: true,
    rows: 10,
    first: 0,
    rowsPerPageOptions: () => [10, 25, 50],
    paginatorTemplate:
      'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown',
    currentPageReportTemplate: 'Showing {first} to {last} of {totalRecords}',
    selection: null,
    modelSearch: '',
    showSearch: true,
    searchPlaceholder: '',
    modelDateFrom: null,
    modelDateTo: null,
    showDateSelection: false,
    clearDisabled: false,
    searchWidthClass: 'w-full xl:w-[320px]',
    dateInputWidthClass: 'w-full min-w-0 xl:w-[280px] xl:flex-none',
    stateKey: '',
    stateStorage: 'session',
  },
)

const emit = defineEmits<{
  (e: 'update:selection', value: AnyRow[] | null): void
  (e: 'update:first', value: number): void
  (e: 'update:modelSearch', value: string): void
  (e: 'update:modelDateFrom', value: Date | null): void
  (e: 'update:modelDateTo', value: Date | null): void
  (e: 'update:columnFilter', payload: { key: string; value: any }): void
  (e: 'clear'): void
  (e: 'page', ev: DataTablePageEvent): void
}>()

const slots = useSlots()
const { t } = useI18n()
const activeFilterKey = ref<string | null>(null)
const popoverRefs = ref<Record<string, any>>({})
const sortFieldState = ref<string>('')
const sortOrderState = ref<number>(0)

const VNodeRenderer = defineComponent({
  name: 'BaseDataTableVNodeRenderer',
  props: {
    vnode: {
      type: Object as () => VNode,
      required: true,
    },
  },
  setup(rendererProps) {
    return () => rendererProps.vnode
  },
})

const selectionProxy = computed({
  get: () => props.selection,
  set: (v) => emit('update:selection', v),
})

function getNormalizedDefaultNodes() {
  const nodes = slots.default?.() ?? []
  return nodes.map(transformNode).filter((node): node is VNode => isVNode(node))
}

const hasToolbar = computed(() => {
  const startNodes = slots['toolbar-start']?.() ?? []
  const endNodes = slots['toolbar-end']?.() ?? []
  return hasRenderableNodes(startNodes) || hasRenderableNodes(endNodes)
})

const showTopFilters = computed(() => {
  return props.showSearch || props.showDateSelection
})

const FilterMenuControl = defineComponent({
  name: 'BaseDataTableFilterMenuControl',
  props: {
    config: {
      type: Object as () => ColumnFilterMenuConfig,
      required: true,
    },
  },
  emits: ['update:modelValue', 'close'],
  setup(filterProps, { emit: filterEmit }) {
    const localValue = ref(cloneFilterValue(filterProps.config.value))
    const isCommitting = ref(false)

    watch(
      () => buildFilterMenuRenderKey(filterProps.config),
      () => {
        if (isCommitting.value) return
        localValue.value = cloneFilterValue(filterProps.config.value)
      },
      { immediate: true },
    )

    async function updateValue(value: any, shouldClose = false) {
      isCommitting.value = true
      localValue.value = cloneFilterValue(value)
      filterEmit('update:modelValue', value)

      await nextTick()
      await nextTick()

      isCommitting.value = false

      if (shouldClose) {
        requestAnimationFrame(() => {
          filterEmit('close')
        })
      }
    }

    const controlKey = computed(() => buildFilterControlKey(filterProps.config, localValue.value))

    return () => {
      const type = filterProps.config.type ?? 'select'

      if (type === 'multiselect') {
        return h(MultiSelect, {
          key: controlKey.value,
          modelValue: Array.isArray(localValue.value) ? localValue.value : [],
          'onUpdate:modelValue': (value: any) =>
            void updateValue(Array.isArray(value) ? value : []),
          options: filterProps.config.options ?? [],
          optionLabel: filterProps.config.optionLabel ?? 'label',
          optionValue: filterProps.config.optionValue ?? 'value',
          placeholder: filterProps.config.placeholder ?? 'Select',
          filter: filterProps.config.filter ?? true,
          showClear: filterProps.config.showClear ?? true,
          class: 'w-[240px]',
          size: 'small',
          appendTo: 'self',
          maxSelectedLabels: 2,
        })
      }

      if (type === 'text') {
        return h(InputText, {
          key: controlKey.value,
          modelValue: String(localValue.value ?? ''),
          'onUpdate:modelValue': (value: string) => void updateValue(value),
          placeholder: filterProps.config.placeholder ?? 'Search',
          class: 'w-[240px]',
          size: 'small',
          onKeydown: (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
              filterEmit('close')
            }
          },
        })
      }

      return h(Select, {
        key: controlKey.value,
        modelValue: localValue.value,
        'onUpdate:modelValue': (value: any) => void updateValue(value, true),
        options: filterProps.config.options ?? [],
        optionLabel: filterProps.config.optionLabel ?? 'label',
        optionValue: filterProps.config.optionValue ?? 'value',
        placeholder: filterProps.config.placeholder ?? '',
        showClear: filterProps.config.showClear ?? true,
        filter: filterProps.config.filter ?? false,
        class: 'w-[240px]',
        size: 'small',
        appendTo: 'self',
      })
    }
  },
})

function onPage(ev: DataTablePageEvent) {
  emit('update:first', ev.first)
  emit('page', ev)
}

function onSort(ev: DataTableSortEvent) {
  sortFieldState.value = String(ev.sortField ?? '')
  sortOrderState.value = Number(ev.sortOrder ?? 0)
}

function hasRenderableNodes(nodes: any[]): boolean {
  for (const node of nodes) {
    if (!isVNode(node)) {
      if (String(node ?? '').trim()) return true
      continue
    }

    if (node.type === Comment) continue

    if (node.type === Text) {
      if (String((node.children as any) ?? '').trim()) return true
      continue
    }

    if (node.type === Fragment) {
      const children = Array.isArray(node.children) ? node.children : []
      if (hasRenderableNodes(children as any[])) return true
      continue
    }

    return true
  }

  return false
}

function transformNode(node: VNode): VNode {
  if (!isVNode(node)) {
    return node
  }

  const currentProps = { ...(node.props ?? {}) } as Record<string, any>
  const filterMenu = currentProps.filterMenu as ColumnFilterMenuConfig | undefined
  delete currentProps.filterMenu

  const sortable =
    currentProps.sortDisabled === true
      ? false
      : Boolean(currentProps.field || currentProps.sortField)

  const vnodeProps: Record<string, any> = {
    ...currentProps,
    ref: (node as any).ref,
    sortable,
  }

  if (filterMenu && !filterMenu.disabled) {
    delete vnodeProps.header
  }

  const baseColumnKey = String(
    node.key ?? currentProps.field ?? currentProps.sortField ?? currentProps.header ?? 'column',
  )

  if (filterMenu && !filterMenu.disabled) {
    vnodeProps.key = `${baseColumnKey}::${buildFilterMenuRenderKey(filterMenu)}`
  } else if (node.key != null) {
    vnodeProps.key = node.key
  } else {
    vnodeProps.key = baseColumnKey
  }

  return h(node.type as any, vnodeProps, buildColumnChildren(node, sortable, filterMenu) as any)
}

function buildColumnChildren(node: VNode, sortable: boolean, filterMenu?: ColumnFilterMenuConfig) {
  const children = node.children

  if (!children || Array.isArray(children) || typeof children !== 'object') {
    return children
  }

  const currentSlots = children as Record<string, (...args: any[]) => any>
  const nextSlots: Record<string, (...args: any[]) => any> = { ...currentSlots }
  const sortField = String((node.props as any)?.sortField ?? (node.props as any)?.field ?? '')

  if (filterMenu && !filterMenu.disabled) {
    nextSlots.header = (slotProps: any) =>
      h('div', { class: 'flex w-full items-center justify-between gap-2' }, [
        h('div', { class: 'min-w-0 inline-flex items-center gap-2' }, [
          renderHeaderContent(currentSlots, slotProps, node.props),
          sortable
            ? h('i', {
                class: [
                  'pi text-sm text-slate-500',
                  resolveSortIcon({
                    sorted: sortFieldState.value === sortField && !!sortField,
                    sortOrder: sortFieldState.value === sortField ? sortOrderState.value : 0,
                  }),
                ],
              })
            : null,
        ]),
        h('div', { class: 'shrink-0' }, [
          h(
            'button',
            {
              type: 'button',
              class: [
                'inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700',
                isFilterActive(filterMenu.value) ? 'bg-slate-100 text-slate-700' : '',
              ],
              'aria-label': 'Filter column',
              onClick: (event: MouseEvent) => toggleFilterPopover(filterMenu.key, event),
            },
            [h('i', { class: 'pi pi-filter text-sm' })],
          ),
          h(
            Popover,
            {
              ref: (el: any) => setPopoverRef(filterMenu.key, el),
              dismissable: true,
              onHide: () => onPopoverHide(filterMenu.key),
            },
            {
              default: () =>
                h('div', { class: 'py-1' }, [
                  h(FilterMenuControl, {
                    key: buildFilterMenuRenderKey(filterMenu),
                    config: filterMenu,
                    'onUpdate:modelValue': (value: any) => {
                      emit('update:columnFilter', { key: filterMenu.key, value })
                    },
                    onClose: () => hideFilterPopover(filterMenu.key),
                  }),
                ]),
            },
          ),
        ]),
      ])
  }

  if (filterMenu && sortable) {
    nextSlots.sorticon = () => null
    return nextSlots
  }

  if (!sortable || currentSlots.sorticon) {
    return nextSlots
  }

  return {
    ...nextSlots,
    sorticon: (slotProps: SortIconSlotProps) => {
      const icon = resolveSortIcon(slotProps)
      return h('i', { class: ['pi', icon] })
    },
  }
}

function renderHeaderContent(
  currentSlots: Record<string, (...args: any[]) => any>,
  slotProps: any,
  nodeProps: Record<string, any> | null | undefined,
) {
  if (currentSlots.header) {
    return currentSlots.header(slotProps)
  }

  return h(
    'span',
    { class: 'font-medium text-slate-800 tracking-wide' },
    String(nodeProps?.header ?? ''),
  )
}

function resolveSortIcon(slotProps: SortIconSlotProps) {
  if (!slotProps?.sorted) return 'pi-sort-alt'
  if ((slotProps.sortOrder ?? 0) > 0) return 'pi-sort-amount-down-alt'
  return 'pi-sort-amount-up-alt'
}

function setPopoverRef(key: string, el: any) {
  if (el) {
    popoverRefs.value[key] = el
    return
  }

  delete popoverRefs.value[key]
}

function toggleFilterPopover(key: string, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()

  const current = popoverRefs.value[key]
  if (!current) return

  if (activeFilterKey.value && activeFilterKey.value !== key) {
    const previous = popoverRefs.value[activeFilterKey.value]
    previous?.hide?.()
  }

  activeFilterKey.value = activeFilterKey.value === key ? null : key
  current.toggle?.(event)
}

function hideFilterPopover(key: string) {
  const current = popoverRefs.value[key]
  current?.hide?.()
  if (activeFilterKey.value === key) {
    activeFilterKey.value = null
  }
}

function onPopoverHide(key: string) {
  if (activeFilterKey.value === key) {
    activeFilterKey.value = null
  }
}

function isFilterActive(value: any) {
  if (Array.isArray(value)) return value.length > 0
  return value !== null && value !== undefined && value !== ''
}

function cloneFilterValue(value: any) {
  return Array.isArray(value) ? [...value] : value
}

function buildFilterMenuRenderKey(config: ColumnFilterMenuConfig) {
  const options = Array.isArray(config.options) ? config.options : []
  const optionSignature = options
    .map((option) => {
      if (option && typeof option === 'object') {
        return `${String(option[config.optionValue ?? 'value'] ?? option.value ?? option.label ?? '')}`
      }
      return String(option ?? '')
    })
    .join('|')

  const valueSignature = Array.isArray(config.value)
    ? config.value.map((item) => String(item ?? '')).join('|')
    : String(config.value ?? '')

  return `${config.key}::${config.type ?? 'select'}::${valueSignature}::${optionSignature}`
}

function buildFilterControlKey(config: ColumnFilterMenuConfig, localValue: any) {
  const options = Array.isArray(config.options) ? config.options : []

  const optionSignature = options
    .map((option) => {
      if (option && typeof option === 'object') {
        return `${String(option[config.optionValue ?? 'value'] ?? option.value ?? option.label ?? '')}`
      }
      return String(option ?? '')
    })
    .join('|')

  const valueSignature = Array.isArray(localValue)
    ? localValue.map((item) => String(item ?? '')).join('|')
    : String(localValue ?? '')

  return `${config.key}::${config.type ?? 'select'}::${valueSignature}::${optionSignature}`
}
</script>
