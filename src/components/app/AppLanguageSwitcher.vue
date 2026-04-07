<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseIconButton from '@/components/common/buttons/BaseIconButton.vue'
import { setAppLocale, type AppLocale } from '@/plugins/i18n'

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)
const { t, locale } = useI18n()

type LanguageOption = { code: AppLocale; flagSrc: string }

const fallbackLanguage: LanguageOption = { code: 'en', flagSrc: '/flagIcon/en.svg' }

const languages: LanguageOption[] = [
  { code: 'en', flagSrc: '/flagIcon/en.svg' },
  { code: 'vi', flagSrc: '/flagIcon/vi.svg' },
  { code: 'zh-CN', flagSrc: '/flagIcon/zh-CN.svg' },
  { code: 'zh-TW', flagSrc: '/flagIcon/zh-TW.svg' },
]

const currentLanguage = computed<LanguageOption>(() => {
  return languages.find((item) => item.code === locale.value) ?? fallbackLanguage
})

const currentLanguageLabel = computed(() => {
  return t(`languageSwitcher.languages.${currentLanguage.value.code}`)
})

function getLanguageLabel(item: LanguageOption) {
  return t(`languageSwitcher.languages.${item.code}`)
}

function toggleOpen() {
  open.value = !open.value
}

function selectLanguage(code: AppLocale) {
  setAppLocale(code)
  open.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!rootRef.value) return
  if (rootRef.value.contains(event.target as Node)) return
  open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <BaseIconButton
      type="button"
      :label="currentLanguageLabel"
      :imageSrc="currentLanguage.flagSrc"
      imageAlt="Current language"
      imageClass="h-4 w-4 shrink-0 rounded-[2px]"
      severity="secondary"
      outlined
      class="!rounded-xl !border-slate-200 !bg-white !px-3 !py-2 !text-sm !text-slate-700 !shadow-sm transition hover:!bg-slate-50 hover:cursor-pointer"
      @click="toggleOpen"
    />

    <div
      v-if="open"
      class="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
    >
      <BaseIconButton
        v-for="item in languages"
        :key="item.code"
        type="button"
        :label="getLanguageLabel(item)"
        :imageSrc="item.flagSrc"
        :imageAlt="getLanguageLabel(item)"
        imageClass="h-4 w-4 shrink-0 rounded-[2px]"
        contentClass="inline-flex w-full items-center gap-2"
        size="small"
        text
        class="w-full !justify-start !rounded-none !px-3 !py-2 !text-left !text-sm !font-normal !text-slate-700 transition hover:!bg-slate-50"
        :class="item.code === locale ? '!bg-slate-50 !font-medium' : ''"
        @click="selectLanguage(item.code)"
      />
    </div>
  </div>
</template>
