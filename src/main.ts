import { createApp } from 'vue'
import App from './App.vue'

import { createPinia } from 'pinia'
import { router } from './router'

import { setupPrimeVue } from './plugins/primevue'
import { i18n, initializeAppLocale } from './plugins/i18n'
import { registerUnauthorizedHandler } from '@/services/http/axios'
import { useAuthStore } from '@/stores/auth.store'
import './styles/tailwind.css'
import './styles/primevue.css'
import {
  BaseButton,
  BaseIconButton,
  BaseBadgeButton,
  BaseButtonGroup,
} from '@/components/common/buttons'
import { BaseInput, BasePasswordInput } from '@/components/common/inputs'
import { BaseMessage } from '@/components/common/messages'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

const { origin, pathname, search, hash } = window.location

if (pathname !== '/' && pathname !== '/index.html') {
  const routePart = hash && hash.startsWith('#/') ? hash.slice(1) : `${pathname}${search}`
  const normalizedUrl = `${origin}/#${routePart}`

  if (`${origin}${pathname}${search}${hash}` !== normalizedUrl) {
    window.location.replace(normalizedUrl)
  }
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.use(router)

setupPrimeVue(app)

app.component('BaseButton', BaseButton)
app.component('BaseIconButton', BaseIconButton)
app.component('BaseBadgeButton', BaseBadgeButton)
app.component('BaseButtonGroup', BaseButtonGroup)
app.component('BaseInput', BaseInput)
app.component('BasePasswordInput', BasePasswordInput)
app.component('BaseMessage', BaseMessage)

registerUnauthorizedHandler(async () => {
  const auth = useAuthStore(pinia)
  if (auth.isAuthenticated) {
    auth.clearSession()
  }

  if (router.currentRoute.value.name !== 'login') {
    await router.replace({ name: 'login' })
  }
})

initializeAppLocale()
app.mount('#app')
