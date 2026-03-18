<script setup lang="ts">
const guidelineHref = '/docs/internal-patrol-app-guideline.pdf'
</script>

<template>
  <div class="space-y-4">
    <div class="text-[26px] font-semibold text-slate-800">Internal Patrol App Guideline</div>

    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-slate-700">
      Download the Internal Patrol App Guideline file
      <a
        :href="guidelineHref"
        download
        class="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
      >
        here
      </a>
      .
    </div>
  </div>
</template>
