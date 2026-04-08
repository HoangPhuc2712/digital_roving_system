<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import AppBreadcrumb from '@/components/app/AppBreadcrumb.vue'
import AppLanguageSwitcher from '@/components/app/AppLanguageSwitcher.vue'
import BaseIconButton from './buttons/BaseIconButton.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useI18n } from 'vue-i18n'

defineEmits<{
  (e: 'open-menu'): void
}>()

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const HEADER_POPOVER_OPEN_EVENT = 'header-popover-open'
const USER_POPOVER_SOURCE = 'user-menu'

const triggerRef = ref<HTMLElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const isPopoverOpen = ref(false)
const isPinnedOpen = ref(false)

const userName = computed(() => String(auth.user?.user_name ?? '').trim() || '—')
const userAvatarLabel = computed(() => {
  const normalized = userName.value.trim()
  if (!normalized || normalized === '—') return 'U'

  const parts = normalized.split(/\s+/).filter(Boolean)
  const lastWord = parts[parts.length - 1] ?? normalized
  const firstChar = Array.from(lastWord)[0] ?? 'U'

  return firstChar.toLocaleUpperCase()
})

let hoverLeaveTimer: number | null = null

function clearHoverLeaveTimer() {
  if (hoverLeaveTimer != null) {
    window.clearTimeout(hoverLeaveTimer)
    hoverLeaveTimer = null
  }
}

function notifyOtherHeaderPopovers() {
  window.dispatchEvent(
    new CustomEvent(HEADER_POPOVER_OPEN_EVENT, {
      detail: { source: USER_POPOVER_SOURCE },
    }),
  )
}

function openPopover() {
  clearHoverLeaveTimer()
  notifyOtherHeaderPopovers()
  isPopoverOpen.value = true
}

function closePopover() {
  clearHoverLeaveTimer()
  isPopoverOpen.value = false
  isPinnedOpen.value = false
}

function onTriggerMouseEnter() {
  if (isPinnedOpen.value) return
  openPopover()
}

function onTriggerMouseLeave() {
  if (isPinnedOpen.value) return
  clearHoverLeaveTimer()
  hoverLeaveTimer = window.setTimeout(() => {
    if (!isPinnedOpen.value) {
      isPopoverOpen.value = false
    }
  }, 120)
}

function onPopoverMouseEnter() {
  if (isPinnedOpen.value) return
  openPopover()
}

function onPopoverMouseLeave() {
  if (isPinnedOpen.value) return
  clearHoverLeaveTimer()
  hoverLeaveTimer = window.setTimeout(() => {
    if (!isPinnedOpen.value) {
      isPopoverOpen.value = false
    }
  }, 120)
}

function togglePinnedPopover() {
  clearHoverLeaveTimer()

  if (isPinnedOpen.value) {
    closePopover()
    return
  }

  notifyOtherHeaderPopovers()
  isPinnedOpen.value = true
  isPopoverOpen.value = true
}

async function goToUserInfo() {
  await router.push({ name: 'user-info' })
  closePopover()
}

async function logout() {
  auth.logout?.()
  closePopover()
  await router.replace({ name: 'login' })
}

function handleDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (triggerRef.value?.contains(target)) return
  if (popoverRef.value?.contains(target)) return
  closePopover()
}

function handleHeaderPopoverOpen(event: Event) {
  const customEvent = event as CustomEvent<{ source?: string }>
  if (customEvent.detail?.source === USER_POPOVER_SOURCE) return
  closePopover()
}

watch(
  () => route.fullPath,
  () => {
    closePopover()
  },
)

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  window.addEventListener(HEADER_POPOVER_OPEN_EVENT, handleHeaderPopoverOpen)
})

onBeforeUnmount(() => {
  clearHoverLeaveTimer()
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  window.removeEventListener(HEADER_POPOVER_OPEN_EVENT, handleHeaderPopoverOpen)
})
</script>

<template>
  <div class="h-14 bg-white border-b border-slate-200 px-4 flex items-center gap-3 min-w-0">
    <BaseIconButton
      icon="pi pi-bars"
      type="button"
      severity="secondary"
      outlined
      class="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0"
      @click="$emit('open-menu')"
    />

    <div class="min-w-0 flex-1">
      <AppBreadcrumb />
    </div>

    <div class="shrink-0 flex items-center gap-4">
      <AppLanguageSwitcher />

      <div class="relative shrink-0">
        <div
          ref="triggerRef"
          class="flex items-center select-none cursor-pointer"
          @mouseenter="onTriggerMouseEnter"
          @mouseleave="onTriggerMouseLeave"
          @click="togglePinnedPopover"
        >
          <Avatar
            :label="userAvatarLabel"
            shape="circle"
            size="normal"
            class="bg-slate-100 text-slate-700 border border-slate-200"
            aria-label="User menu"
          />
        </div>

        <div
          v-if="isPopoverOpen"
          ref="popoverRef"
          class="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[220px] rounded-xl border border-slate-200 bg-white py-2 shadow-lg"
          @mouseenter="onPopoverMouseEnter"
          @mouseleave="onPopoverMouseLeave"
        >
          <div class="px-4 pb-2 text-md font-medium text-slate-800 border-b border-slate-100">
            {{ userName }}
          </div>

          <div class="pt-2">
            <BaseIconButton
              type="button"
              icon="pi pi-pen-to-square"
              :label="t('common.personalInfo')"
              text
              class="w-full !justify-start !rounded-none !px-4 !py-2 !text-left !text-md !font-normal !text-slate-700 hover:!bg-slate-50 hover:cursor-pointer"
              @click="goToUserInfo"
            />

            <BaseIconButton
              type="button"
              icon="pi pi-sign-out"
              :label="t('common.logout')"
              text
              class="w-full !justify-start !rounded-none !px-4 !py-2 !text-left !text-md !font-normal !text-slate-700 hover:!bg-slate-50 hover:cursor-pointer"
              @click="logout"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
