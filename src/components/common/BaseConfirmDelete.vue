<template>
  <Dialog
    :visible="props.visible"
    modal
    :closable="!props.loading"
    :dismissableMask="!props.loading"
    :style="{ width: 'min(92vw, 30rem)' }"
    :header="props.header"
    @update:visible="emit('update:visible', $event)"
    @hide="emit('cancel')"
  >
    <div class="flex items-start gap-3 py-1">
      <i class="pi pi-exclamation-triangle text-3xl mt-0.5" />
      <div class="text-md leading-6 text-slate-700">
        {{ props.message }}
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <BaseIconButton
          label="Cancel"
          icon="pi pi-times"
          size="small"
          severity="danger"
          outlined
          :disabled="props.loading"
          @click="onCancel"
        />
        <BaseIconButton
          label="Delete"
          icon="pi pi-trash"
          size="small"
          severity="success"
          :loading="props.loading"
          :disabled="props.loading"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog'
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import BaseIconButton from './buttons/BaseIconButton.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    header?: string
    message: string
    loading?: boolean
  }>(),
  {
    header: 'Confirm Delete',
    loading: false,
  },
)

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function onCancel() {
  emit('update:visible', false)
  emit('cancel')
}
</script>
