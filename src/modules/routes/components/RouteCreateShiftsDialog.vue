<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'

import BaseButton from '@/components/common/buttons/BaseButton.vue'

const props = defineProps<{
  visible: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'submit', payload: { month: number; year: number }): void
}>()

const currentDate = new Date()
const currentMonth = currentDate.getMonth() + 1
const currentYear = currentDate.getFullYear()

const month = ref<number | null>(currentMonth)
const year = ref<number | null>(currentYear)

const visibleProxy = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const monthOptions = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
]

const yearOptions = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index).map(
  (value) => ({ label: String(value), value }),
)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      month.value = currentMonth
      year.value = currentYear
    }
  },
)

function closeDialog() {
  if (props.loading) return
  visibleProxy.value = false
}

function submit() {
  if (!month.value || !year.value || props.loading) return
  emit('submit', { month: month.value, year: year.value })
}
</script>

<template>
  <Dialog
    v-model:visible="visibleProxy"
    modal
    header="Create Shifts"
    :style="{ width: '32rem' }"
    :closable="!loading"
    :dismissableMask="!loading"
  >
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-700">Month</label>
        <Select
          v-model="month"
          :options="monthOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select Month"
          class="w-full"
          size="small"
          :disabled="loading"
        />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-700">Year</label>
        <Select
          v-model="year"
          :options="yearOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select Year"
          class="w-full"
          size="small"
          :disabled="loading"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseButton
          label="Cancel"
          severity="danger"
          outlined
          size="small"
          :disabled="loading"
          @click="closeDialog"
        />
        <BaseButton
          label="Submit"
          severity="success"
          size="small"
          :loading="loading"
          :disabled="!month || !year"
          @click="submit"
        />
      </div>
    </template>
  </Dialog>
</template>
