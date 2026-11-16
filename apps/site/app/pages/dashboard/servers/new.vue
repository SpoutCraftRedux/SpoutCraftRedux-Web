<script setup lang="ts">
import type { OwnedServer } from '~/utils/servers'

definePageMeta({
  colorMode: 'dark',
  middleware: 'auth'
})

useSeoMeta({ title: 'Add server', robots: 'noindex' })

function onSaved(server: OwnedServer) {
  navigateTo(`/dashboard/servers/${server.id}`)
}
</script>

<template>
  <UContainer class="max-w-3xl py-12 sm:py-16">
    <UButton
      to="/dashboard"
      icon="i-lucide-arrow-left"
      label="Dashboard"
      color="neutral"
      variant="link"
      class="-ms-2 px-2"
    />

    <UPageHeader
      headline="New listing"
      title="Add your server"
      description="New listings start as drafts. After saving, add an icon and banner, verify ownership through the MOTD, and send it for review."
      :ui="{
        root: 'border-none pt-4',
        headline: 'font-mono font-medium text-xs text-primary uppercase tracking-[0.12em]'
      }"
    />

    <UCard variant="subtle">
      <DashboardServerForm @saved="onSaved" />
    </UCard>
  </UContainer>
</template>
