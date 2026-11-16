// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/content',
    '@nuxt/ui',
    '@vueuse/nuxt',
    'motion-v/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  content: {
    experimental: {
      sqliteConnector: 'native'
    }
  },

  mdc: {
    highlight: {
      theme: 'github-dark',
      langs: ['kotlin', 'bash'],
      noApiRoute: false
    }
  },

  runtimeConfig: {
    public: {
      siteUrl: 'https://spoutcraftredux.org',
      apiBase: 'https://api.spoutcraftredux.org'
    }
  },

  routeRules: {
    '/login': { ssr: false },
    '/register': { ssr: false },
    '/dashboard': { ssr: false },
    '/dashboard/**': { ssr: false },
    '/admin': { ssr: false },
    '/admin/**': { ssr: false }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  prerender: {
    routes: [
      '/'
    ]
  }
})
