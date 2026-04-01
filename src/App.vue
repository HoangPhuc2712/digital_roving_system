<template>
  <RouterView />
  <Toast />
  <ConfirmDialog />
</template>

<script setup lang="ts">
import { watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

const { t, locale } = useI18n()

watchEffect(() => {
  void locale.value
  document.title = t('breadcrumb.root')
})
</script>
