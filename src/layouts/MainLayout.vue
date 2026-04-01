<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/app/AppSidebar.vue'
import BasePageHeader from '@/components/common/BasePageHeader.vue'
import BasePageFooter from '@/components/common/BasePageFooter.vue'
import 'primeicons/primeicons.css'

const sidebarOpen = ref(false)
const desktopSidebarOpen = ref(true)
const isDesktop = ref(false)
const route = useRoute()

const DESKTOP_BREAKPOINT = 1024

function syncSidebarViewport() {
  const desktop = window.innerWidth >= DESKTOP_BREAKPOINT
  isDesktop.value = desktop

  if (desktop) {
    sidebarOpen.value = false
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
  syncSidebarViewport()
  window.addEventListener('resize', syncSidebarViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncSidebarViewport)
})

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  },
)
</script>

<template>
  <div class="min-h-screen flex bg-slate-50">
    <AppSidebar
      v-model:mobileOpen="sidebarOpen"
      :desktop-open="desktopSidebarOpen"
      class="shrink-0"
    />

    <div class="flex-1 min-w-0 flex flex-col min-h-screen">
      <header class="sticky top-0 z-30 shrink-0 bg-slate-50">
        <BasePageHeader @open-menu="handleToggleSidebar" />
      </header>

      <main class="flex-1 p-4">
        <router-view />
      </main>

      <BasePageFooter class="mt-auto" />
    </div>
  </div>
</template>
