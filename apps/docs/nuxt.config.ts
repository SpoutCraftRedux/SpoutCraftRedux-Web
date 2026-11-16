// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/content',
    'nuxt-og-image',
    'nuxt-llms',
    'nuxt-agent-discovery',
    '@nuxtjs/mcp-toolkit'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  site: {
    url: 'https://docs.spoutcraftredux.org',
    name: 'SpoutCraft Redux Docs'
  },

  content: {
    build: {
      markdown: {
        toc: {
          searchDepth: 1
        }
      }
    },
    experimental: {
      sqliteConnector: 'native'
    }
  },

  routeRules: {
    '/': { redirect: { to: '/getting-started', statusCode: 301 } }
  },

  experimental: {
    asyncContext: true
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

  llms: {
    domain: 'https://docs.spoutcraftredux.org',
    title: 'SpoutCraft Redux Docs',
    description: 'Documentation for SpoutCraft Redux, a remake of Spoutcraft for Minecraft 26.3: a Purpur fork server, a Fabric client mod and a plugin API.',
    full: {
      title: 'SpoutCraft Redux Docs - Full Documentation',
      description: 'The full documentation for SpoutCraft Redux: installation, plugin development, the downloads API and contributing.'
    },
    sections: [
      {
        title: 'Getting Started',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/getting-started%' }
        ]
      },
      {
        title: 'Plugin Development',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/plugin-development%' }
        ]
      },
      {
        title: 'Downloads API',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/downloads-api%' }
        ]
      },
      {
        title: 'Contributing',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/contributing%' }
        ]
      }
    ]
  },

  mcp: {
    name: 'SpoutCraft Redux Docs'
  },

  ogImage: {
    zeroRuntime: true
  },

  prerender: {
    routes: [
      '/getting-started'
    ],
    crawlLinks: true
  }
})
