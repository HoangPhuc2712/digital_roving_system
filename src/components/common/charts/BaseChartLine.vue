<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import type { Chart as ChartInstance, Plugin } from 'chart.js'

const props = withDefaults(
  defineProps<{
    labels: string[]
    values: number[]
    tooltipTitles?: string[]
    actualLabel?: string
    actualTooltipLabel?: string
    yAxisTitle?: string
    minValue?: number | null
    maxValue?: number | null
    averageValue?: number | null
    minLabel?: string
    maxLabel?: string
    averageLabel?: string
    yMin?: number
    yMax?: number
    yStepSize?: number
    noDataText?: string
    chartHeight?: number
    hideLegend?: boolean
    showReferenceLabels?: boolean
  }>(),
  {
    tooltipTitles: () => [],
    actualLabel: 'Actual',
    actualTooltipLabel: 'Actual',
    yAxisTitle: '',
    minValue: null,
    maxValue: null,
    averageValue: null,
    minLabel: 'Minimum',
    maxLabel: 'Maximum',
    averageLabel: 'Average',
    yMin: 0,
    yMax: 60,
    yStepSize: 10,
    noDataText: 'No data',
    chartHeight: 420,
    hideLegend: false,
    showReferenceLabels: false,
  },
)

type ReferenceDataset = {
  label: string
  data: number[]
  borderColor: string
  backgroundColor: string
  borderDash?: number[]
  borderWidth: number
  pointRadius: number
  pointHoverRadius: number
  tension: number
  fill: boolean
  referenceLabel?: string
  isActualDataset?: boolean
}

const chartCanvasRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: ChartInstance | null = null

const hasActualData = computed(() => props.labels.length > 0 && props.values.length > 0)
const chartLabels = computed(() => (hasActualData.value ? props.labels : ['', '']))

watch(
  () => [
    props.labels,
    props.values,
    props.tooltipTitles,
    props.actualLabel,
    props.actualTooltipLabel,
    props.yAxisTitle,
    props.minValue,
    props.maxValue,
    props.averageValue,
    props.minLabel,
    props.maxLabel,
    props.averageLabel,
    props.yMin,
    props.yMax,
    props.yStepSize,
    props.noDataText,
    props.chartHeight,
    props.hideLegend,
    props.showReferenceLabels,
  ],
  async () => {
    await nextTick()
    renderChart()
  },
  { deep: true, immediate: true },
)

onBeforeUnmount(() => {
  destroyChart()
})

function destroyChart() {
  if (!chartInstance) return
  chartInstance.destroy()
  chartInstance = null
}

function buildReferenceData(value: number | null | undefined) {
  if (value == null) return []
  return new Array(chartLabels.value.length).fill(value)
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

const referenceLabelsPlugin: Plugin<'line'> = {
  id: 'referenceLabelsPlugin',
  afterDatasetsDraw(chart) {
    if (!props.showReferenceLabels) return

    const { ctx, chartArea, scales } = chart
    const yScale = scales.y
    if (!yScale || !chartArea) return

    const labelsToDraw = chart.data.datasets
      .map((dataset) => ({
        label: String((dataset as ReferenceDataset).referenceLabel ?? '').trim(),
        value: Number(Array.isArray(dataset.data) ? (dataset.data[0] ?? NaN) : NaN),
      }))
      .filter((item) => item.label && Number.isFinite(item.value))

    if (!labelsToDraw.length) return

    ctx.save()
    ctx.font = '600 12px Inter, sans-serif'
    ctx.textBaseline = 'middle'

    for (const item of labelsToDraw) {
      const text = item.label
      const y = yScale.getPixelForValue(item.value)
      const paddingX = 10
      const boxHeight = 28
      const textWidth = ctx.measureText(text).width
      const boxWidth = textWidth + paddingX * 2
      const x = chartArea.right - boxWidth - 8
      const boxY = y - boxHeight / 2

      ctx.fillStyle = '#1F2937'
      drawRoundedRect(ctx, x, boxY, boxWidth, boxHeight, 8)
      ctx.fill()

      ctx.fillStyle = '#FFFFFF'
      ctx.fillText(text, x + paddingX, y)
    }

    ctx.restore()
  },
}

function renderChart() {
  destroyChart()

  const canvas = chartCanvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const datasets: ReferenceDataset[] = []

  if (props.maxValue != null) {
    datasets.push({
      label: props.maxLabel,
      data: buildReferenceData(props.maxValue),
      borderColor: '#EF4444',
      backgroundColor: '#EF4444',
      borderDash: [6, 6],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
      fill: false,
      referenceLabel: props.maxLabel,
    })
  }

  if (props.averageValue != null && hasActualData.value) {
    datasets.push({
      label: props.averageLabel,
      data: buildReferenceData(props.averageValue),
      borderColor: '#111827',
      backgroundColor: '#111827',
      borderDash: [6, 6],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
      fill: false,
      referenceLabel: props.averageLabel,
    })
  }

  if (props.minValue != null) {
    datasets.push({
      label: props.minLabel,
      data: buildReferenceData(props.minValue),
      borderColor: '#2563EB',
      backgroundColor: '#2563EB',
      borderDash: [6, 6],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0,
      fill: false,
      referenceLabel: props.minLabel,
    })
  }

  datasets.push({
    label: props.actualLabel,
    data: hasActualData.value ? props.values : [],
    borderColor: '#38BDF8',
    backgroundColor: '#38BDF8',
    borderWidth: 2,
    tension: 0.3,
    fill: false,
    pointRadius: hasActualData.value ? 4 : 0,
    pointHoverRadius: hasActualData.value ? 5 : 0,
    isActualDataset: true,
  })

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels.value,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false,
      },
      plugins: {
        legend: {
          display: !props.hideLegend,
          position: 'bottom',
        },
        tooltip: {
          filter: (tooltipItem) =>
            Boolean((tooltipItem.dataset as ReferenceDataset).isActualDataset),
          callbacks: {
            title: (items) => {
              const dataIndex = items[0]?.dataIndex ?? -1
              if (dataIndex < 0) return ''

              return props.tooltipTitles[dataIndex] ?? props.labels[dataIndex] ?? ''
            },
            label: (context) => {
              const value = Number(context.parsed.y ?? 0)
              return `${props.actualTooltipLabel}: ${value.toFixed(2)} min`
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxRotation: 0,
            callback: (_, index) => String(chartLabels.value[index] ?? ''),
          },
          grid: {
            display: false,
          },
        },
        y: {
          min: props.yMin,
          max: props.yMax,
          ticks: {
            stepSize: props.yStepSize,
            callback: (value) => `${value}`,
          },
          title: {
            display: !!props.yAxisTitle,
            text: props.yAxisTitle,
          },
        },
      },
    },
    plugins: [referenceLabelsPlugin],
  })
}
</script>

<template>
  <div
    class="relative w-full rounded-2xl border border-slate-200 bg-white p-4"
    :style="{ height: `${props.chartHeight}px` }"
  >
    <div class="h-full w-full" :class="{ 'blur-[2px]': !hasActualData }">
      <canvas ref="chartCanvasRef"></canvas>
    </div>

    <div
      v-if="!hasActualData"
      class="pointer-events-none absolute inset-0 flex items-center justify-center text-base font-medium text-slate-500"
    >
      {{ props.noDataText }}
    </div>
  </div>
</template>
