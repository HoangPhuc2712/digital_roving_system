import { createApp } from 'vue'
import App from './App.vue'

import { createPinia } from 'pinia'
import { router } from './router'

import { setupPrimeVue } from './plugins/primevue'
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

const app = createApp(App)

app.use(createPinia())
app.use(router)

setupPrimeVue(app)

app.component('BaseButton', BaseButton)
app.component('BaseIconButton', BaseIconButton)
app.component('BaseBadgeButton', BaseBadgeButton)
app.component('BaseButtonGroup', BaseButtonGroup)
app.component('BaseInput', BaseInput)
app.component('BasePasswordInput', BasePasswordInput)
app.component('BaseMessage', BaseMessage)

app.mount('#app')
