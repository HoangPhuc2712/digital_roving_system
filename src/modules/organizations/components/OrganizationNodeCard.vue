<template>
  <div
    class="relative min-w-[15rem] max-w-[16rem] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
    @mousedown.stop
  >
    <BaseIconButton
      icon="pi pi-pen-to-square"
      size="small"
      severity="secondary"
      outlined
      rounded
      class="!absolute !-left-2 !-top-2"
      @click="toggleActions"
    />

    <Popover ref="actionsPopover">
      <div class="flex items-center gap-2">
        <BaseIconButton
          icon="pi pi-pencil"
          size="small"
          severity="secondary"
          outlined
          rounded
          @click="onEdit"
        />
        <BaseIconButton
          icon="pi pi-trash"
          size="small"
          severity="danger"
          outlined
          rounded
          @click="onDelete"
        />
      </div>
    </Popover>

    <div class="flex flex-col gap-1 text-center">
      <div class="text-sm font-semibold text-slate-900 leading-5 break-words">
        {{ member.userName }}
      </div>
      <div class="text-xs font-medium text-slate-500">
        {{ member.userCode }}
      </div>
      <div class="text-sm text-slate-700 break-words">
        {{ member.roleName }}
      </div>
      <div class="text-xs text-slate-500 break-words">
        {{ member.areaName }}
      </div>
      <div class="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
        <span class="rounded-full bg-slate-100 px-2 py-1">{{ member.phone }}</span>
        <span class="rounded-full bg-slate-100 px-2 py-1">{{ member.childrenCount ?? 0 }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Popover from 'primevue/popover'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import type { OrganizationMember } from '../organizations.types'

const props = defineProps<{
  member: OrganizationMember & {
    childrenCount?: number
  }
}>()

const emit = defineEmits<{
  (e: 'edit', member: OrganizationMember): void
  (e: 'delete', member: OrganizationMember): void
}>()

const actionsPopover = ref<any>(null)

function toggleActions(event: MouseEvent) {
  actionsPopover.value?.toggle(event)
}

function onEdit() {
  actionsPopover.value?.hide()
  emit('edit', props.member)
}

function onDelete() {
  actionsPopover.value?.hide()
  emit('delete', props.member)
}
</script>
