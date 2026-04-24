<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { translateRouteName } from '@/utils/dataI18n'
import BaseChartLine from '@/components/common/charts/BaseChartLine.vue'

const props = defineProps<{
  routeCode: string
  routeName: string
  minMinute: number
  maxMinute: number
  averageMinute: number | null
  labels: string[]
  values: number[]
  tooltipTitles: string[]
}>()

const { t } = useI18n()

function translatedRouteName(value: string | null | undefined) {
  return translateRouteName(String(value ?? ''), t)
}
</script>

<template>
  <div class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
    <div class="mb-4 flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500 text-white">
        <i class="pi pi-chart-line"></i>
      </div>
      <div class="min-w-0">
        <div class="truncate text-xl font-semibold text-slate-800">
          {{ translatedRouteName(props.routeName) }}
        </div>
      </div>
    </div>

    <BaseChartLine
      :labels="props.labels"
      :values="props.values"
      :tooltipTitles="props.tooltipTitles"
      :minValue="props.minMinute"
      :maxValue="props.maxMinute"
      :averageValue="props.averageMinute"
      :actualLabel="t('routesChartReportList.actualPatrolTime')"
      :actualTooltipLabel="t('routesChartReportList.actualPatrolTime')"
      :minLabel="`${t('routesChartReportList.minimumMinute')}: ${props.minMinute}`"
      :maxLabel="`${t('routesChartReportList.maximumMinute')}: ${props.maxMinute}`"
      :averageLabel="
        props.averageMinute == null
          ? t('routesChartReportList.averageMinute')
          : `${t('routesChartReportList.averageMinute')}: ${props.averageMinute.toFixed(2)}`
      "
      :yAxisTitle="t('routesChartReportList.yAxisTitle')"
      :noDataText="t('routesChartReportList.noData')"
      :yMin="0"
      :yMax="60"
      :yStepSize="10"
      :chartHeight="520"
      hideLegend
      showReferenceLabels
    />
  </div>
</template>
