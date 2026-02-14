<script setup lang="ts">
import AppSidebar from '@/components/app/AppSidebar.vue'
</script>

<template>
  <div class="h-screen flex bg-slate-50 overflow-hidden">
    <aside class="shrink-0 h-screen overflow-y-auto">
      <AppSidebar class="h-full" />
    </aside>

    <div class="flex-1 min-w-0 flex flex-col h-screen">
      <header class="h-14 shrink-0 bg-white border-b border-slate-200 px-4 flex items-center">
        <div class="text-sm text-slate-600">Digital Roving System</div>
      </header>

      <main class="flex-1 p-4 overflow-y-auto overflow-x-hidden">
        <router-view />
      </main>
    </div>
  </div>
</template>
