<script setup lang="ts">
const colorMode = useColorMode()
const route = useRoute()
const { public: { siteUrl } } = useRuntimeConfig()

const color = computed(() => colorMode.value === 'dark' ? '#09090b' : 'white')

useHead({
  titleTemplate: title => title && title !== 'SpoutCraft Redux' ? `${title} · SpoutCraft Redux` : 'SpoutCraft Redux',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    { rel: 'canonical', href: () => `${siteUrl}${route.path === '/' ? '' : route.path}` }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  ogSiteName: 'SpoutCraft Redux',
  ogType: 'website',
  ogUrl: () => `${siteUrl}${route.path}`,
  twitterCard: 'summary'
})
</script>

<template>
  <UApp :toaster="{ expand: false }">
    <AppHeader />

    <UMain>
      <NuxtPage />
    </UMain>

    <AppFooter />
  </UApp>
</template>
