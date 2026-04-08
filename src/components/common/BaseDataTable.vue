<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div v-if="hasActionRow" class="border-b border-slate-200 bg-white px-3 py-3">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div v-if="hasToolbarStart" class="flex flex-wrap items-center gap-2">
          <slot name="toolbar-start" />
        </div>
        <div
          class="flex flex-1 flex-wrap items-center justify-end gap-2"
          :class="{ 'xl:ml-auto': !hasToolbarStart }"
        >
          <slot name="toolbar-end" />
          <BaseIconButton
            v-if="showClearAction"
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
    </div>

    <DataTable
      :key="`base-list-table-${locale}`"
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
      showGridlines
      responsiveLayout="scroll"
      :scrollable="scrollable"
      :scrollHeight="scrollable ? scrollHeight : undefined"
      class="app-datatable"
      @page="onPage"
      @sort="onSort"
    >
      <VNodeRenderer
        v-for="(node, index) in getNormalizedDefaultNodes()"
        :key="node.key ?? `column-${index}`"
        :vnode="node"
      />

      <template #empty>
        <slot name="empty">
          <div class="py-6 text-center text-slate-500">{{ t('common.noData') }}</div>
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
  getCurrentInstance,
  onBeforeUnmount,
  onMounted,
  useSlots,
  watch,
  type VNode,
} from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import DataTable, { type DataTablePageEvent, type DataTableSortEvent } from 'primevue/datatable'
import MultiSelect from 'primevue/multiselect'
import Popover from 'primevue/popover'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'

import BaseDateSelection from '@/components/common/filters/BaseDateSelection.vue'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'

type AnyRow = Record<string, any>
type SortIconSlotProps = {
  sorted?: boolean
  sortOrder?: number
}

type ColumnFilterType = 'select' | 'multiselect' | 'text' | 'dual-select' | 'date-range'

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
  filterMatchMode?: 'contains' | 'startsWith' | 'endsWith'
  customFilterFunction?: (option: FilterOption, query: string) => boolean
  secondaryOptions?: FilterOption[]
  secondaryOptionLabel?: string
  secondaryOptionValue?: string
  secondaryPlaceholder?: string
  secondaryFilter?: boolean
  secondaryFilterField?: string
  secondaryParentField?: string
  showTime?: boolean
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
    scrollable?: boolean
    scrollHeight?: string
  }>(),
  {
    loading: false,
    dataKey: 'id',
    paginator: true,
    rows: 25,
    first: 0,
    rowsPerPageOptions: () => [25, 50, 100],
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
    scrollable: true,
    scrollHeight: '600px',
  },
)

const scrollable = computed(() => props.scrollable !== false)
const scrollHeight = computed(() => props.scrollHeight || '600px')

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
const instance = getCurrentInstance()
const { t, locale } = useI18n()
const activeFilterKey = ref<string | null>(null)
const popoverRefs = ref<Record<string, any>>({})
const filterButtonRefs = ref<Record<string, HTMLElement | null>>({})
const filterContentRefs = ref<Record<string, HTMLElement | null>>({})
const filterMenuRevision = ref<Record<string, number>>({})
const sortFieldState = ref<string>('')
const sortOrderState = ref<number>(0)
const currentPageReportTemplate = computed(
  () =>
    `${t('pagination.show')} {first} ${t('pagination.to')} {last} ${t('pagination.of')} {totalRecords}`,
)

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

const hasToolbarStart = computed(() => {
  const startNodes = slots['toolbar-start']?.() ?? []
  return hasRenderableNodes(startNodes)
})

const hasToolbarEnd = computed(() => {
  const endNodes = slots['toolbar-end']?.() ?? []
  return hasRenderableNodes(endNodes)
})

const showClearAction = computed(() => Boolean(instance?.vnode.props?.onClear))

const hasActionRow = computed(() => {
  return hasToolbarStart.value || hasToolbarEnd.value || showClearAction.value
})

const FilterMenuControl = defineComponent({
  name: 'BaseDataTableFilterMenuControl',
  props: {
    config: {
      type: Object as () => ColumnFilterMenuConfig,
      required: true,
    },
    revision: {
      type: Number,
      default: 0,
    },
  },
  emits: ['update:modelValue', 'close'],
  setup(filterProps, { emit: filterEmit }) {
    const localValue = ref(cloneFilterValue(filterProps.config.value))
    const dateSelectionRef = ref<any>(null)
    const filterQuery = ref('')

    watch(
      [() => serializeFilterValue(filterProps.config.value), () => filterProps.revision],
      () => {
        localValue.value = cloneFilterValue(filterProps.config.value)
        filterQuery.value = ''
      },
      { immediate: true },
    )

    function updateDraft(value: any) {
      localValue.value = cloneFilterValue(value)
    }

    function applyChanges() {
      filterQuery.value = ''
      filterEmit('update:modelValue', cloneFilterValue(localValue.value))
      nextTick(() => {
        filterEmit('close')
      })
    }

    function cancelChanges() {
      localValue.value = cloneFilterValue(filterProps.config.value)
      filterQuery.value = ''
      filterEmit('close')
    }

    function handleEnterKey(event: KeyboardEvent, type: ColumnFilterType) {
      if (event.key !== 'Enter') return

      const target = event.target as HTMLElement | null
      if (target?.closest('button')) return

      event.preventDefault()
      event.stopPropagation()

      if (type === 'date-range') {
        const dateSelection = dateSelectionRef.value
        if (dateSelection?.isAnyPickerPanelOpen?.()) {
          dateSelection.closeOpenPickerPanels?.()
          return
        }
      }

      applyChanges()
    }

    const controlKey = computed(
      () => `${buildFilterControlKey(filterProps.config)}::${filterProps.revision}`,
    )

    const resolvedSelectOptions = computed(() => {
      const options = Array.isArray(filterProps.config.options) ? filterProps.config.options : []
      const query = String(filterQuery.value ?? '').trim()
      const customFilterFunction = filterProps.config.customFilterFunction

      if (!query || typeof customFilterFunction !== 'function') return options

      return options.filter((option) => customFilterFunction(option, query))
    })

    function handleFilterInput(event: any) {
      filterQuery.value = String(event?.value ?? '')
    }

    const renderFooter = () =>
      h(
        'div',
        { class: 'mt-3 flex items-center justify-end gap-2 border-t border-slate-200 pt-3' },
        [
          h(Button, {
            type: 'button',
            label: t('common.cancel'),
            severity: 'secondary',
            outlined: true,
            size: 'small',
            onClick: (event: MouseEvent) => {
              event.preventDefault()
              event.stopPropagation()
              cancelChanges()
            },
          }),
          h(Button, {
            type: 'button',
            label: t('common.apply'),
            size: 'small',
            onClick: (event: MouseEvent) => {
              event.preventDefault()
              event.stopPropagation()
              applyChanges()
            },
          }),
        ],
      )

    return () => {
      const type = filterProps.config.type ?? 'select'

      if (type === 'dual-select') {
        const currentValue =
          localValue.value && typeof localValue.value === 'object'
            ? localValue.value
            : { primaryValue: null, secondaryValue: null }

        const primaryValue = currentValue.primaryValue ?? null
        const secondaryValue = currentValue.secondaryValue ?? null
        const secondaryParentField =
          filterProps.config.secondaryParentField ??
          filterProps.config.secondaryFilterField ??
          'parentValue'
        const allSecondaryOptions = Array.isArray(filterProps.config.secondaryOptions)
          ? filterProps.config.secondaryOptions
          : []
        const secondaryOptions =
          primaryValue == null || primaryValue === ''
            ? allSecondaryOptions
            : allSecondaryOptions.filter((option) => {
                if (!option || typeof option !== 'object') return false
                return option[secondaryParentField] === primaryValue
              })

        return h(
          'div',
          {
            class: 'flex w-[260px] flex-col gap-3',
            onKeydownCapture: (event: KeyboardEvent) => handleEnterKey(event, 'dual-select'),
          },
          [
            h(Select, {
              key: `${controlKey.value}::primary`,
              modelValue: primaryValue,
              'onUpdate:modelValue': (value: any) =>
                updateDraft({ primaryValue: value ?? null, secondaryValue: null }),
              options: filterProps.config.options ?? [],
              optionLabel: filterProps.config.optionLabel ?? 'label',
              optionValue: filterProps.config.optionValue ?? 'value',
              placeholder: filterProps.config.placeholder ?? '',
              showClear: filterProps.config.showClear ?? true,
              filter: filterProps.config.filter ?? true,
              filterFields: filterProps.config.filterField
                ? [filterProps.config.filterField]
                : undefined,
              filterMatchMode: filterProps.config.filterMatchMode ?? 'contains',
              class: 'app-filter-select w-full',
              size: 'small',
              appendTo: 'self',
            }),
            h(Select, {
              key: `${controlKey.value}::secondary`,
              modelValue: secondaryValue,
              'onUpdate:modelValue': (value: any) =>
                updateDraft({ primaryValue, secondaryValue: value ?? null }),
              options: secondaryOptions,
              optionLabel: filterProps.config.secondaryOptionLabel ?? 'label',
              optionValue: filterProps.config.secondaryOptionValue ?? 'value',
              placeholder: filterProps.config.secondaryPlaceholder ?? '',
              showClear: filterProps.config.showClear ?? true,
              filter: filterProps.config.secondaryFilter ?? filterProps.config.filter ?? true,
              filterFields: filterProps.config.secondaryFilterField
                ? [filterProps.config.secondaryFilterField]
                : undefined,
              filterMatchMode: filterProps.config.filterMatchMode ?? 'contains',
              class: 'app-filter-select w-full',
              size: 'small',
              appendTo: 'self',
              disabled: !allSecondaryOptions.length,
            }),
            renderFooter(),
          ],
        )
      }

      if (type === 'date-range') {
        const currentValue =
          localValue.value && typeof localValue.value === 'object'
            ? localValue.value
            : { from: null, to: null }

        const fromValue =
          currentValue.from instanceof Date ? currentValue.from : (currentValue.from ?? null)
        const toValue =
          currentValue.to instanceof Date ? currentValue.to : (currentValue.to ?? null)

        return h(
          'div',
          {
            class: 'w-[280px] max-w-full',
            onKeydownCapture: (event: KeyboardEvent) => handleEnterKey(event, 'date-range'),
          },
          [
            h(BaseDateSelection, {
              ref: dateSelectionRef,
              modelDateFrom: fromValue,
              modelDateTo: toValue,
              wrapperClass: 'flex w-full flex-col gap-3',
              inputWidthClass: 'w-full',
              showTime: filterProps.config.showTime ?? true,
              appendTo: 'self',
              'onUpdate:modelDateFrom': (value: Date | null) =>
                updateDraft({ from: value ?? null, to: toValue }),
              'onUpdate:modelDateTo': (value: Date | null) =>
                updateDraft({ from: fromValue, to: value ?? null }),
            }),
            renderFooter(),
          ],
        )
      }

      if (type === 'multiselect') {
        return h(
          'div',
          {
            class: 'w-[240px] max-w-full',
            onKeydownCapture: (event: KeyboardEvent) => handleEnterKey(event, 'multiselect'),
          },
          [
            h(MultiSelect, {
              key: controlKey.value,
              modelValue: Array.isArray(localValue.value) ? localValue.value : [],
              'onUpdate:modelValue': (value: any) => updateDraft(Array.isArray(value) ? value : []),
              options: filterProps.config.options ?? [],
              optionLabel: filterProps.config.optionLabel ?? 'label',
              optionValue: filterProps.config.optionValue ?? 'value',
              placeholder: filterProps.config.placeholder ?? 'Select',
              filter: filterProps.config.filter ?? true,
              filterFields: filterProps.config.filterField
                ? [filterProps.config.filterField]
                : undefined,
              filterMatchMode: filterProps.config.filterMatchMode ?? 'contains',
              showClear: filterProps.config.showClear ?? true,
              class: 'app-filter-multiselect w-full',
              size: 'small',
              appendTo: 'self',
              maxSelectedLabels: 2,
            }),
            renderFooter(),
          ],
        )
      }

      if (type === 'text') {
        return h(
          'div',
          {
            class: 'w-[240px] max-w-full',
            onKeydownCapture: (event: KeyboardEvent) => handleEnterKey(event, 'text'),
          },
          [
            h(InputText, {
              key: controlKey.value,
              modelValue: String(localValue.value ?? ''),
              'onUpdate:modelValue': (value: string) => updateDraft(value),
              placeholder: filterProps.config.placeholder ?? 'Search',
              class: 'w-full',
              size: 'small',
            }),
            renderFooter(),
          ],
        )
      }

      return h(
        'div',
        {
          class: 'w-[240px] max-w-full',
          onKeydownCapture: (event: KeyboardEvent) => handleEnterKey(event, 'select'),
        },
        [
          h(Select, {
            key: controlKey.value,
            modelValue: localValue.value,
            'onUpdate:modelValue': (value: any) => updateDraft(value),
            options: resolvedSelectOptions.value,
            optionLabel: filterProps.config.optionLabel ?? 'label',
            optionValue: filterProps.config.optionValue ?? 'value',
            placeholder: filterProps.config.placeholder ?? '',
            showClear: filterProps.config.showClear ?? true,
            filter: filterProps.config.filter ?? true,
            filterFields: filterProps.config.filterField
              ? [filterProps.config.filterField]
              : undefined,
            filterMatchMode: filterProps.config.filterMatchMode ?? 'contains',
            onFilter: handleFilterInput,
            class: 'app-filter-select w-full',
            size: 'small',
            appendTo: 'self',
          }),
          renderFooter(),
        ],
      )
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
    vnodeProps.key = `${baseColumnKey}::${buildFilterMenuColumnKey(filterMenu)}`
  } else if (node.key != null) {
    vnodeProps.key = node.key
  } else {
    vnodeProps.key = baseColumnKey
  }

  return h(node.type as any, vnodeProps, buildColumnChildren(node, sortable, filterMenu) as any)
}

function buildColumnChildren(node: VNode, sortable: boolean, filterMenu?: ColumnFilterMenuConfig) {
  const resolvedFilterMenu = filterMenu
  const children = node.children

  const currentSlots =
    children && !Array.isArray(children) && typeof children === 'object'
      ? (children as Record<string, (...args: any[]) => any>)
      : {}

  const nextSlots: Record<string, (...args: any[]) => any> = { ...currentSlots }
  const sortField = String((node.props as any)?.sortField ?? (node.props as any)?.field ?? '')

  if (resolvedFilterMenu && !resolvedFilterMenu.disabled) {
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
              ref: (el: any) =>
                setFilterButtonRef(resolvedFilterMenu.key, el as HTMLElement | null),
              type: 'button',
              class: [
                'inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700',
              ],
              'aria-label': 'Filter column',
              onClick: (event: MouseEvent) => toggleFilterPopover(resolvedFilterMenu.key, event),
            },
            [
              h('i', {
                class: [
                  'pi text-sm',
                  isFilterActive(resolvedFilterMenu.value) ? 'pi-filter-fill' : 'pi-filter',
                ],
              }),
            ],
          ),
          h(
            Popover,
            {
              ref: (el: any) => setPopoverRef(resolvedFilterMenu.key, el),
              dismissable: false,
              onHide: () => onPopoverHide(resolvedFilterMenu.key),
            },
            {
              default: () =>
                h(
                  'div',
                  {
                    ref: (el: any) =>
                      setFilterContentRef(resolvedFilterMenu.key, el as HTMLElement | null),
                    class: 'py-1',
                    onMousedown: (event: MouseEvent) => event.stopPropagation(),
                  },
                  [
                    h(FilterMenuControl, {
                      key: `${resolvedFilterMenu.key}::${getFilterMenuRevision(resolvedFilterMenu.key)}`,
                      config: resolvedFilterMenu,
                      revision: getFilterMenuRevision(resolvedFilterMenu.key),
                      'onUpdate:modelValue': (value: any) => {
                        emit('update:columnFilter', { key: resolvedFilterMenu.key, value })
                      },
                      onClose: () => hideFilterPopover(resolvedFilterMenu.key),
                    }),
                  ],
                ),
            },
          ),
        ]),
      ])
  }

  if (resolvedFilterMenu && sortable) {
    nextSlots.sorticon = () => null
    return nextSlots
  }

  if (!sortable || currentSlots.sorticon) {
    return Object.keys(nextSlots).length ? nextSlots : children
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
    { class: 'font-medium text-slate-700 tracking-wide' },
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

function setFilterButtonRef(key: string, el: HTMLElement | null) {
  if (el) {
    filterButtonRefs.value[key] = el
    return
  }

  delete filterButtonRefs.value[key]
}

function setFilterContentRef(key: string, el: HTMLElement | null) {
  if (el) {
    filterContentRefs.value[key] = el
    return
  }

  delete filterContentRefs.value[key]
}

function getFilterMenuRevision(key: string) {
  return filterMenuRevision.value[key] ?? 0
}

function bumpFilterMenuRevision(key: string) {
  filterMenuRevision.value = {
    ...filterMenuRevision.value,
    [key]: (filterMenuRevision.value[key] ?? 0) + 1,
  }
}

function toggleFilterPopover(key: string, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()

  const current = popoverRefs.value[key]
  if (!current) return

  if (activeFilterKey.value === key) {
    hideFilterPopover(key)
    return
  }

  if (activeFilterKey.value && activeFilterKey.value !== key) {
    const previous = popoverRefs.value[activeFilterKey.value]
    previous?.hide?.()
  }

  activeFilterKey.value = key
  current.show?.(event)
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
  bumpFilterMenuRevision(key)
}

function handleDocumentPointerDown(event: PointerEvent) {
  const key = activeFilterKey.value
  if (!key) return

  const target = event.target as Node | null
  if (!target) return

  const content = filterContentRefs.value[key]
  const trigger = filterButtonRefs.value[key]

  if (content?.contains(target) || trigger?.contains(target)) {
    return
  }

  hideFilterPopover(key)
}

function isFilterActive(value: any): boolean {
  if (value instanceof Date) return Number.isFinite(value.getTime())
  if (Array.isArray(value)) return value.length > 0
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => isFilterActive(item))
  }
  return value !== null && value !== undefined && value !== ''
}

function cloneFilterValue(value: any): any {
  if (value instanceof Date) return new Date(value)
  if (Array.isArray(value)) return value.map((item) => cloneFilterValue(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, cloneFilterValue(entryValue)]),
    )
  }
  return value
}

function buildOptionsSignature(
  options: FilterOption[] | undefined,
  optionValue?: string,
  optionLabel?: string,
  extraField?: string,
  extraField2?: string,
) {
  return (Array.isArray(options) ? options : [])
    .map((option) => {
      if (option && typeof option === 'object') {
        const valuePart = String(
          option[optionValue ?? 'value'] ?? option.value ?? option.label ?? '',
        )
        const labelPart = String(option[optionLabel ?? 'label'] ?? option.label ?? '')
        const extraPart = extraField ? String(option[extraField] ?? '') : ''
        const extraPart2 = extraField2 ? String(option[extraField2] ?? '') : ''
        return `${valuePart}::${labelPart}::${extraPart}::${extraPart2}`
      }
      return String(option ?? '')
    })
    .join('|')
}

function serializeFilterValue(value: any): string {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : ''
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeFilterValue(item)).join('|')
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .map((key) => `${key}:${serializeFilterValue(value[key])}`)
      .join('|')
  }

  return String(value ?? '')
}

function buildFilterMenuColumnKey(config: ColumnFilterMenuConfig) {
  const optionSignature = buildOptionsSignature(
    config.options,
    config.optionValue,
    config.optionLabel,
  )
  const secondaryOptionSignature = buildOptionsSignature(
    config.secondaryOptions,
    config.secondaryOptionValue,
    config.secondaryOptionLabel,
    config.secondaryParentField,
    config.secondaryFilterField,
  )
  const valueSignature = serializeFilterValue(config.value)

  return `${config.key}::${config.type ?? 'select'}::${valueSignature}::${optionSignature}::${secondaryOptionSignature}`
}

function buildFilterControlKey(config: ColumnFilterMenuConfig) {
  const optionSignature = buildOptionsSignature(
    config.options,
    config.optionValue,
    config.optionLabel,
  )
  const secondaryOptionSignature = buildOptionsSignature(
    config.secondaryOptions,
    config.secondaryOptionValue,
    config.secondaryOptionLabel,
    config.secondaryParentField,
    config.secondaryFilterField,
  )
  const valueSignature = serializeFilterValue(config.value)

  return `${config.key}::${config.type ?? 'select'}::${valueSignature}::${optionSignature}::${secondaryOptionSignature}`
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
})
</script>

<style scoped>
:deep(.app-filter-select .p-select-filter),
:deep(.app-filter-multiselect .p-multiselect-filter) {
  font-size: 0.875rem;
  min-height: 2rem;
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
}

:deep(.app-filter-select .p-select-filter-container),
:deep(.app-filter-multiselect .p-multiselect-filter-container) {
  margin-bottom: 0.5rem;
}
</style>
