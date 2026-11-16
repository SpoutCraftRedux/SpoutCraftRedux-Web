<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  colorMode: 'dark',
  middleware: 'staff'
})

useSeoMeta({ title: 'Admin', robots: 'noindex' })

const route = useRoute()
const router = useRouter()

const tabs: TabsItem[] = [
  { label: 'Review queue', icon: 'i-lucide-inbox', value: 'queue' },
  { label: 'Servers', icon: 'i-lucide-server', value: 'servers' },
  { label: 'Promotions', icon: 'i-lucide-megaphone', value: 'promotions' },
  { label: 'Reports', icon: 'i-lucide-flag', value: 'reports' },
  { label: 'Users', icon: 'i-lucide-users', value: 'users' },
  { label: 'Tags', icon: 'i-lucide-tags', value: 'tags' }
]

const tab = computed({
  get: () => {
    const value = String(route.query.tab ?? 'queue')
    return tabs.some(t => t.value === value) ? value : 'queue'
  },
  set: value => router.replace({ query: { tab: value === 'queue' ? undefined : value } })
})
</script>

<template>
  <UContainer class="py-12 sm:py-16">
    <UPageHeader
      headline="Staff"
      title="Server list admin"
      description="Review listings, handle reports, and manage users and tags for the SpoutCraft Redux server list."
      :ui="{
        root: 'border-none pt-0',
        headline: 'font-mono font-medium text-xs text-primary uppercase tracking-[0.12em]'
      }"
    />

    <UTabs
      v-model="tab"
      :items="tabs"
      :content="false"
      color="neutral"
      class="w-full"
    />

    <div class="mt-6">
      <AdminQueue v-if="tab === 'queue'" />
      <AdminServers v-else-if="tab === 'servers'" />
      <AdminPromotions v-else-if="tab === 'promotions'" />
      <AdminReports v-else-if="tab === 'reports'" />
      <AdminUsers v-else-if="tab === 'users'" />
      <AdminTags v-else-if="tab === 'tags'" />
    </div>
  </UContainer>
</template>
