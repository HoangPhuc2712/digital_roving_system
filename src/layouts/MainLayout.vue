<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/app/AppSidebar.vue'
import BasePageHeader from '@/components/common/BasePageHeader.vue'
import BasePageFooter from '@/components/common/BasePageFooter.vue'
import 'primeicons/primeicons.css'

const sidebarOpen = ref(false)
const desktopSidebarOpen = ref(true)
const isDesktop = ref(false)
const disableSidebarTransition = ref(false)
const route = useRoute()

const DESKTOP_BREAKPOINT = 1024

let sidebarTransitionResetRaf: number | null = null

function scheduleSidebarTransitionRestore() {
  if (sidebarTransitionResetRaf != null) {
    window.cancelAnimationFrame(sidebarTransitionResetRaf)
  }

  sidebarTransitionResetRaf = window.requestAnimationFrame(() => {
    sidebarTransitionResetRaf = window.requestAnimationFrame(() => {
      disableSidebarTransition.value = false
      sidebarTransitionResetRaf = null
    })
  })
}

async function syncSidebarViewport() {
  const desktop = window.innerWidth >= DESKTOP_BREAKPOINT
  const changedBreakpointMode = desktop !== isDesktop.value

  if (changedBreakpointMode) {
    disableSidebarTransition.value = true
  }

  isDesktop.value = desktop
  sidebarOpen.value = false

  if (changedBreakpointMode) {
    await nextTick()
    scheduleSidebarTransitionRestore()
  }
}

function handleToggleSidebar() {
  if (isDesktop.value) {
    desktopSidebarOpen.value = !desktopSidebarOpen.value
    return
  }

  sidebarOpen.value = !sidebarOpen.value
}

onMounted(() => {
  void syncSidebarViewport()
  window.addEventListener('resize', syncSidebarViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncSidebarViewport)
  if (sidebarTransitionResetRaf != null) {
    window.cancelAnimationFrame(sidebarTransitionResetRaf)
    sidebarTransitionResetRaf = null
  }
})

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  },
)
</script>

<template>
  <!-- Keep the viewport fixed so only the page content scrolls; header/footer stay outside the scroll area. -->
  <div class="flex h-screen overflow-hidden bg-slate-50">
    <AppSidebar
      v-model:mobileOpen="sidebarOpen"
      :desktop-open="desktopSidebarOpen"
      :class="['shrink-0', disableSidebarTransition ? '!transition-none lg:!transition-none' : '']"
    />

    <div class="flex h-screen min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header class="z-30 shrink-0 bg-slate-50">
        <BasePageHeader @open-menu="handleToggleSidebar" />
      </header>

      <main class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-1">
        <router-view />
      </main>

      <footer class="z-30 shrink-0 bg-slate-50">
        <BasePageFooter />
      </footer>
    </div>
  </div>
</template>
