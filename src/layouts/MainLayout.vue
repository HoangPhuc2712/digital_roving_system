<script setup lang="ts">
import AppSidebar from '@/components/app/AppSidebar.vue'
</script>

<template>
  <div class="min-h-screen flex bg-slate-50">
    <AppSidebar />

    <div class="flex-1 min-w-0 flex flex-col">
      <header class="h-14 bg-white border-b border-slate-200 px-4 flex items-center">
        <div class="text-sm text-slate-600">Digital Roving System</div>
      </header>

      <main class="flex-1 p-4 overflow-auto">
        <router-view />
      </main>
    </div>
  </div>
</template>
