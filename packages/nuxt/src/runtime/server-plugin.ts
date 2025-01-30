import { defineNuxtPlugin } from 'nuxt/app'

export default defineNuxtPlugin((_nuxtApp) => {
  // eslint-disable-next-line no-console
  console.log('Server plugin injected by my-module!')
})
