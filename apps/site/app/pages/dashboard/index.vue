<script setup lang="ts">
import type { OwnedServer } from '~/utils/servers'

definePageMeta({
  colorMode: 'dark',
  middleware: 'auth'
})

useSeoMeta({ title: 'Dashboard', robots: 'noindex' })

const api = useApi()
const toast = useToast()
const { user } = useAuth()

const { data, status, error, refresh } = useAsyncData(
  'my-servers',
  () => api<{ servers: OwnedServer[] }>('/me/servers'),
  { server: false, lazy: true }
)

const servers = computed(() => data.value?.servers ?? [])
const loading = computed(() => (status.value === 'idle' || status.value === 'pending') && !data.value)
const toggling = ref<string | null>(null)

async function setListed(server: OwnedServer, listed: boolean) {
  toggling.value = server.id
  try {
    const updated = await api<OwnedServer>(`/me/servers/${server.id}`, { method: 'PATCH', body: { listed } })
    Object.assign(server, updated)
    toast.add({ title: listed ? 'Listing shown' : 'Listing hidden', description: server.name, icon: 'i-lucide-check', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Couldn\'t update the listing', description: apiError(err).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    toggling.value = null
  }
}
</script>

<template>
  <UContainer class="max-w-5xl py-12 sm:py-16">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <UPageHeader
        headline="Dashboard"
        title="Your servers"
        :description="user ? `Signed in as ${user.username}. Listings go public once staff approve them.` : undefined"
        :ui="{
          root: 'border-none py-0',
          headline: 'font-mono font-medium text-xs text-primary uppercase tracking-[0.12em]'
        }"
      />
      <UButton
        to="/dashboard/servers/new"
        icon="i-lucide-plus"
        label="Add server"
        class="self-start sm:self-auto"
      />
    </div>

    <div class="mt-10">
      <div
        v-if="loading"
        class="flex flex-col gap-3"
      >
        <USkeleton
          v-for="n in 3"
          :key="n"
          class="h-24 w-full rounded-xl"
        />
      </div>

      <UAlert
        v-else-if="error"
        color="warning"
        variant="subtle"
        icon="i-lucide-cloud-off"
        title="Your servers can't be loaded"
        :description="apiError(error).message"
        :actions="[{ label: 'Try again', icon: 'i-lucide-refresh-cw', color: 'warning', variant: 'solid', onClick: () => refresh() }]"
      />

      <UEmpty
        v-else-if="!servers.length"
        icon="i-lucide-server"
        title="No servers yet"
        description="Add your server, prove you own it with a code in the MOTD, then send it for review."
        variant="naked"
        :actions="[{ label: 'Add server', icon: 'i-lucide-plus', color: 'neutral', variant: 'subtle', to: '/dashboard/servers/new' }]"
        class="rounded-2xl border border-dashed border-accented py-16"
      />

      <ul
        v-else
        class="flex flex-col gap-3"
      >
        <li
          v-for="server in servers"
          :key="server.id"
          class="rounded-xl border border-default bg-elevated/40 p-4"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <ServersServerIcon
                :src="server.iconUrl"
                :name="server.name"
              />
              <div class="min-w-0">
                <NuxtLink
                  :to="`/dashboard/servers/${server.id}`"
                  class="truncate font-semibold text-highlighted hover:text-primary"
                >
                  {{ server.name }}
                </NuxtLink>
                <p class="truncate font-mono text-xs text-dimmed">
                  {{ serverAddress(server) }}
                </p>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <UBadge
                    :label="stateMeta[server.state].label"
                    :icon="stateMeta[server.state].icon"
                    :color="stateMeta[server.state].color"
                    variant="subtle"
                    size="sm"
                  />
                  <UBadge
                    :label="server.verified ? 'Verified' : 'Not verified'"
                    :icon="server.verified ? 'i-lucide-shield-check' : 'i-lucide-shield-alert'"
                    :color="server.verified ? 'success' : 'neutral'"
                    variant="outline"
                    size="sm"
                  />
                  <UBadge
                    v-if="server.promoted"
                    label="Promoted"
                    icon="i-lucide-megaphone"
                    color="primary"
                    variant="solid"
                    size="sm"
                  />
                  <UBadge
                    v-if="server.pendingRevision"
                    label="Changes in review"
                    icon="i-lucide-git-pull-request"
                    color="info"
                    variant="outline"
                    size="sm"
                  />
                  <UBadge
                    v-if="server.state === 'approved' && !server.listed"
                    label="Hidden"
                    icon="i-lucide-eye-off"
                    color="neutral"
                    variant="outline"
                    size="sm"
                  />
                </div>
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-3">
              <USwitch
                :model-value="server.listed"
                label="Listed"
                :disabled="server.state !== 'approved' || toggling === server.id"
                :loading="toggling === server.id"
                @update:model-value="setListed(server, $event)"
              />
              <UButton
                v-if="server.state === 'approved' && server.listed"
                :to="`/servers/${server.slug}`"
                icon="i-lucide-external-link"
                color="neutral"
                variant="ghost"
                aria-label="View public listing"
              />
              <UButton
                :to="`/dashboard/servers/${server.id}`"
                icon="i-lucide-pencil"
                label="Manage"
                color="neutral"
                variant="subtle"
              />
            </div>
          </div>

          <UAlert
            v-if="server.reviewNote && server.state !== 'pending'"
            class="mt-4"
            :color="server.state === 'rejected' ? 'error' : 'warning'"
            variant="subtle"
            icon="i-lucide-message-square-text"
            title="Note from staff"
            :description="server.reviewNote"
          />
        </li>
      </ul>
    </div>
  </UContainer>
</template>
