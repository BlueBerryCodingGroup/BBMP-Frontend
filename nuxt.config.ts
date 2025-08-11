// nuxt.config.ts
export default defineNuxtConfig({
  devtools: { enabled: false },
  app: {
    head: {
      title: 'BBMP Launcher',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  },
  css: ['~/assets/style.css']
})