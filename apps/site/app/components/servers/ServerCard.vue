<script setup lang="ts">
import type { ServerSummary } from '~/utils/servers'

const props = defineProps<{ server: ServerSummary, tagNames?: Record<string, string> }>()

const online = computed(() => !!props.server.status?.online)
</script>

<template>
  <article
    class="group relative flex flex-col overflow-hidden rounded-xl border bg-elevated/40 transition-colors hover:bg-elevated/70"
    :class="server.promoted
      ? 'border-primary/40 shadow-[0_0_24px_-8px_var(--ui-primary)] focus-within:border-primary/70 hover:border-primary/70'
      : 'border-default focus-within:border-accented hover:border-accented'"
  >
    <div
      v-if="server.bannerUrl"
      class="aspect-468/60 w-full overflow-hidden border-b border-default bg-muted"
    >
      <img
        :src="server.bannerUrl"
        :alt="`${server.name} banner`"
        class="size-full object-cover"
        loading="lazy"
      >
    </div>

    <div class="flex flex-1 flex-col gap-3 p-4">
      <div class="flex items-start gap-3">
        <ServersServerIcon
          :src="server.iconUrl"
          :name="server.name"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <ServersStatusDot :online="online" />
            <NuxtLink
              :to="`/servers/${server.slug}`"
              class="truncate font-semibold text-highlighted after:absolute after:inset-0 focus-visible:outline-none group-hover:text-primary"
            >
              {{ server.name }}
            </NuxtLink>
          </div>
          <p class="mt-1 line-clamp-2 text-sm text-muted">
            {{ server.shortDescription }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <UBadge
          v-if="server.promoted"
          label="Promoted"
          icon="i-lucide-megaphone"
          color="primary"
          variant="solid"
          size="sm"
        />
        <UBadge
          v-if="server.featured"
          label="Featured"
          icon="i-lucide-star"
          color="warning"
          variant="subtle"
          size="sm"
        />
        <UBadge
          v-for="tag in server.tags"
          :key="tag"
          :label="tagNames?.[tag] ?? tag"
          color="neutral"
          variant="outline"
          size="sm"
        />
      </div>

      <div class="mt-auto flex items-center justify-between gap-3 pt-1">
        <ServersCopyAddress
          :address="serverAddress(server)"
          size="xs"
          class="relative z-10"
        />
        <div class="flex shrink-0 items-center gap-3 font-mono text-xs text-muted">
          <span
            class="flex items-center gap-1"
            :title="online ? 'Players online' : 'Offline'"
          >
            <UIcon
              name="i-lucide-users"
              class="size-3.5"
            />
            {{ online ? formatPlayers(server.status) : 'Offline' }}
          </span>
          <span
            v-if="online && server.status?.pingMs != null"
            class="flex items-center gap-1"
            title="Ping from the SpoutCraft Redux API"
          >
            <UIcon
              name="i-lucide-activity"
              class="size-3.5"
            />
            {{ server.status.pingMs }} ms
          </span>
        </div>
      </div>
    </div>
  </article>
</template>
