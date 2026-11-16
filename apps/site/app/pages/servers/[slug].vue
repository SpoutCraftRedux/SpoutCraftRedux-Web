<script setup lang="ts">
import type { Server, Tag } from '~/utils/servers'

definePageMeta({
  colorMode: 'dark'
})

const route = useRoute()
const api = useApi()
const { user } = useAuth()

const slug = computed(() => String(route.params.slug))

const { data: server, status, error, refresh } = useAsyncData(
  () => `server-${slug.value}`,
  () => api<Server>(`/servers/${encodeURIComponent(slug.value)}`),
  { server: false, lazy: true }
)

const { data: tagData } = useAsyncData('server-tags', () => api<{ tags: Tag[] }>('/tags'), { server: false, lazy: true })
const tagNames = computed(() => Object.fromEntries((tagData.value?.tags ?? []).map(t => [t.slug, t.name])))

useSeoMeta({
  title: () => server.value?.name ?? 'Server',
  ogTitle: () => `${server.value?.name ?? 'Server'} · SpoutCraft Redux`,
  description: () => server.value?.shortDescription,
  ogDescription: () => server.value?.shortDescription
})

const loading = computed(() => (status.value === 'idle' || status.value === 'pending') && !server.value)
const notFound = computed(() => apiError(error.value).status === 404)
const st = computed(() => server.value?.status ?? null)
const address = computed(() => server.value ? serverAddress(server.value) : '')

const reportOpen = ref(false)
function openReport() {
  if (!user.value) return navigateTo({ path: '/login', query: { redirect: route.fullPath } })
  reportOpen.value = true
}

const stats = computed(() => {
  const s = st.value
  return [
    { label: 'Players', value: formatPlayers(s), icon: 'i-lucide-users' },
    { label: 'Ping', value: s?.online && s.pingMs != null ? `${s.pingMs} ms` : '—', icon: 'i-lucide-activity' },
    { label: 'Uptime, 24h', value: formatUptime(s?.uptime24h), icon: 'i-lucide-chart-line' },
    { label: 'Version', value: s?.version ?? '—', icon: 'i-lucide-box' }
  ]
})
</script>

<template>
  <div class="relative">
    <GradientGlow class="top-0 h-80 w-2/3" />

    <UContainer class="relative max-w-5xl py-12 sm:py-16">
      <UButton
        to="/servers"
        icon="i-lucide-arrow-left"
        label="All servers"
        color="neutral"
        variant="link"
        class="-ms-2 px-2"
      />

      <div
        v-if="loading"
        class="mt-6 flex flex-col gap-4"
      >
        <USkeleton class="aspect-468/60 w-full rounded-xl" />
        <USkeleton class="h-20 w-full" />
        <USkeleton class="h-40 w-full" />
      </div>

      <UEmpty
        v-else-if="notFound"
        icon="i-lucide-search-x"
        title="Server not found"
        description="This listing doesn't exist, or it isn't public right now."
        variant="naked"
        :actions="[{ label: 'Browse servers', icon: 'i-lucide-server', color: 'neutral', variant: 'subtle', to: '/servers' }]"
        class="mt-6 rounded-2xl border border-dashed border-accented py-16"
      />

      <UAlert
        v-else-if="error || !server"
        class="mt-6"
        color="warning"
        variant="subtle"
        icon="i-lucide-cloud-off"
        title="This server can't be loaded"
        description="The SpoutCraft Redux API didn't answer. Try again in a moment."
        :actions="[{ label: 'Try again', icon: 'i-lucide-refresh-cw', color: 'warning', variant: 'solid', onClick: () => refresh() }]"
      />

      <div
        v-else
        class="mt-6 flex flex-col gap-8"
      >
        <div
          v-if="server.bannerUrl"
          class="aspect-468/60 w-full overflow-hidden rounded-xl border border-default bg-muted"
        >
          <img
            :src="server.bannerUrl"
            :alt="`${server.name} banner`"
            class="size-full object-cover"
          >
        </div>

        <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex min-w-0 items-start gap-4">
            <ServersServerIcon
              :src="server.iconUrl"
              :name="server.name"
              size="size-16"
            />
            <div class="min-w-0">
              <h1 class="text-2xl font-bold text-highlighted sm:text-3xl">
                {{ server.name }}
              </h1>
              <p class="mt-1 text-muted">
                {{ server.shortDescription }}
              </p>
              <div class="mt-3 flex flex-wrap gap-1.5">
                <UBadge
                  v-if="server.promoted"
                  label="Promoted"
                  icon="i-lucide-megaphone"
                  color="primary"
                  variant="solid"
                />
                <UBadge
                  v-if="server.featured"
                  label="Featured"
                  icon="i-lucide-star"
                  color="warning"
                  variant="subtle"
                />
                <UBadge
                  v-for="tag in server.tags"
                  :key="tag"
                  :label="tagNames[tag] ?? tag"
                  :to="{ path: '/servers', query: { tag } }"
                  color="neutral"
                  variant="outline"
                />
              </div>
            </div>
          </div>

          <div class="flex shrink-0 flex-col gap-2 sm:w-64">
            <ServersCopyAddress
              :address="address"
              size="lg"
              block
            />
            <div class="flex gap-2">
              <UButton
                v-if="server.website"
                :to="server.website"
                target="_blank"
                rel="nofollow noopener noreferrer"
                icon="i-lucide-globe"
                label="Website"
                color="neutral"
                variant="subtle"
                class="flex-1 justify-center"
              />
              <UButton
                v-if="server.discord"
                :to="server.discord"
                target="_blank"
                rel="nofollow noopener noreferrer"
                icon="i-simple-icons-discord"
                label="Discord"
                color="neutral"
                variant="subtle"
                class="flex-1 justify-center"
              />
            </div>
          </div>
        </div>

        <UCard
          variant="subtle"
          :ui="{ body: 'flex flex-col gap-5' }"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <ServersStatusDot :online="st?.online" />
              <span class="font-semibold text-highlighted">{{ st?.online ? 'Online' : 'Offline' }}</span>
            </div>
            <span
              v-if="st?.checkedAt"
              class="font-mono text-xs text-dimmed"
            >Checked {{ formatIso(st.checkedAt) }}</span>
          </div>

          <dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div
              v-for="stat in stats"
              :key="stat.label"
              class="min-w-0"
            >
              <dt class="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.06em] text-dimmed">
                <UIcon
                  :name="stat.icon"
                  class="size-3.5"
                />
                {{ stat.label }}
              </dt>
              <dd class="mt-1 truncate font-semibold text-highlighted">
                {{ stat.value }}
              </dd>
            </div>
          </dl>

          <pre
            v-if="st?.motd"
            class="overflow-x-auto rounded-lg bg-default px-4 py-3 font-mono text-sm whitespace-pre-wrap text-default ring ring-default"
            aria-label="Message of the day"
          >{{ st.motd }}</pre>
        </UCard>

        <section>
          <h2 class="font-mono text-xs font-medium uppercase tracking-[0.12em] text-primary">
            About
          </h2>
          <ServersMarkdownContent
            :source="server.description"
            class="mt-4"
          >
            <template #empty>
              <p class="text-dimmed">
                The owner hasn't written a description yet.
              </p>
            </template>
          </ServersMarkdownContent>
        </section>

        <div class="flex flex-col gap-3 border-t border-default pt-6 text-sm text-dimmed sm:flex-row sm:items-center sm:justify-between">
          <p>
            Listed by <span class="text-default">{{ server.owner?.username }}</span>
            <template v-if="server.approvedAt">
              · since {{ formatIso(server.approvedAt) }}
            </template>
          </p>
          <UButton
            label="Report"
            icon="i-lucide-flag"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="openReport"
          />
        </div>

        <ServersReportModal
          v-model:open="reportOpen"
          :slug="server.slug"
          :name="server.name"
        />
      </div>
    </UContainer>
  </div>
</template>
