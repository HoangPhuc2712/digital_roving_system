<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import type { Chart as ChartInstance } from 'chart.js'

type ChartDataset = {
  label: string
  data: number[]
}

const props = defineProps<{
  labels: string[]
  datasets: ChartDataset[]
}>()

const chartCanvasRef = ref<HTMLCanvasElement | null>(null)
let chartInstance: ChartInstance | null = null

const chartPalette = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#14B8A6']

watch(
  () => [props.labels, props.datasets],
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
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
}

function renderChart() {
  destroyChart()

  const canvas = chartCanvasRef.value
  if (!canvas || !props.labels.length) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: props.labels,
      datasets: props.datasets.map((dataset, index) => ({
        label: dataset.label,
        data: dataset.data,
        borderColor: chartPalette[index % chartPalette.length],
        backgroundColor: chartPalette[index % chartPalette.length],
        tension: 0.4,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 5,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `${value}%`,
          },
          title: {
            display: true,
            text: 'rate(%)',
          },
        },
      },
    },
  })
}

function getBase64Image() {
  const canvas = chartCanvasRef.value
  if (!canvas) return ''

  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = canvas.width
  exportCanvas.height = canvas.height

  const exportCtx = exportCanvas.getContext('2d')
  if (!exportCtx) return ''

  exportCtx.fillStyle = '#FFFFFF'
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
  exportCtx.drawImage(canvas, 0, 0)

  return exportCanvas.toDataURL('image/png')
}

defineExpose({
  getBase64Image,
})
</script>

<template>
  <div class="rounded-[2rem] border border-slate-200 bg-white p-5">
    <div class="mb-4 flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500 text-white">
        <i class="pi pi-chart-line"></i>
      </div>
      <div class="text-2xl font-semibold text-slate-800">Chart</div>
    </div>

    <div class="relative h-[420px] w-full bg-white">
      <canvas ref="chartCanvasRef"></canvas>
    </div>
  </div>
</template>
