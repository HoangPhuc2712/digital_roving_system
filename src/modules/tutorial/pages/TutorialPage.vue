<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const guidelineFiles = [
  {
    key: 'website-report-sop',
    titleKey: 'tutorialPage.websiteReportSop',
    href: '/docs/internal-patrol-website.pdf',
  },
  {
    key: 'application-sop',
    titleKey: 'tutorialPage.applicationSop',
    href: '/docs/internal-patrol-app.pdf',
  },
]
</script>

<template>
  <div class="space-y-5">
    <div class="text-[26px] font-semibold text-slate-800">
      {{ t('tutorialPage.title') }}
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <section
        v-for="file in guidelineFiles"
        :key="file.key"
        class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 class="text-lg font-semibold text-slate-800">
          {{ t(file.titleKey) }}
        </h2>

        <a
          :href="file.href"
          download
          class="mt-3 inline-flex text-sm font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
        >
          {{ t('tutorialPage.downloadText') }}
        </a>
      </section>
    </div>
  </div>
</template>
