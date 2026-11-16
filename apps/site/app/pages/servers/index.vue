<script setup lang="ts">
import type { Paged, ServerSummary, SortValue, Tag } from '~/utils/servers'

definePageMeta({
  colorMode: 'dark'
})

const description = 'Find Minecraft servers running SpoutCraft Redux. Every listing is checked by staff, and status, players and ping update every two minutes.'

useSeoMeta({
  title: 'Servers',
  ogTitle: 'Servers · SpoutCraft Redux',
  description,
  ogDescription: description
})

const api = useApi()
const route = useRoute()
const router = useRouter()

const perPage = 24
const sortValues = sortOptions.map(o => o.value) as readonly string[]

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value) as string | undefined
const asList = (value: unknown) => (Array.isArray(value) ? value : value ? [value] : []).map(String).filter(Boolean)

const filters = computed(() => {
  const sort = first(route.query.sort)
  return {
    q: first(route.query.q) ?? '',
    tags: asList(route.query.tag),
    online: first(route.query.online) === 'true',
    sort: (sort && sortValues.includes(sort) ? sort : 'featured') as SortValue,
    page: Math.max(1, Number.parseInt(first(route.query.page) ?? '1') || 1)
  }
})

function update(patch: Partial<typeof filters.value>) {
  const next = { ...filters.value, page: 1, ...patch }
  router.replace({
    query: {
      q: next.q || undefined,
      tag: next.tags.length ? next.tags : undefined,
      online: next.online ? 'true' : undefined,
      sort: next.sort === 'featured' ? undefined : next.sort,
      page: next.page > 1 ? String(next.page) : undefined
    }
  })
}

const search = ref(filters.value.q)
const debouncedSearch = refDebounced(search, 300)
watch(debouncedSearch, (q) => {
  if (q.trim() !== filters.value.q) update({ q: q.trim() })
})
watch(() => filters.value.q, (q) => {
  if (q !== search.value.trim()) search.value = q
})

const selectedTags = computed({
  get: () => filters.value.tags,
  set: tags => update({ tags })
})
const sort = computed({
  get: () => filters.value.sort,
  set: value => update({ sort: value })
})
const onlyOnline = computed({
  get: () => filters.value.online,
  set: value => update({ online: value })
})
const page = computed({
  get: () => filters.value.page,
  set: (value) => {
    update({ page: value })
    if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
  }
})

const { data: tagData } = useAsyncData('server-tags', () => api<{ tags: Tag[] }>('/tags'), { server: false, lazy: true })
const tags = computed(() => tagData.value?.tags ?? [])
const tagNames = computed(() => Object.fromEntries(tags.value.map(t => [t.slug, t.name])))
const tagItems = computed(() => tags.value.map(t => ({ label: `${t.name} (${t.count})`, value: t.slug })))

const { data, status, error, refresh } = useAsyncData(
  () => `servers-${JSON.stringify(filters.value)}`,
  () => {
    const f = filters.value
    return api<Paged & { servers: ServerSummary[] }>('/servers', {
      query: {
        q: f.q || undefined,
        tag: f.tags.length ? f.tags : undefined,
        online: f.online ? 'true' : undefined,
        sort: f.sort,
        page: f.page,
        perPage
      }
    })
  },
  { server: false, lazy: true }
)

const servers = computed(() => data.value?.servers ?? [])
const total = computed(() => data.value?.total ?? 0)
const loading = computed(() => (status.value === 'idle' || status.value === 'pending') && !data.value)
const filtered = computed(() => !!(filters.value.q || filters.value.tags.length || filters.value.online))

function clearFilters() {
  search.value = ''
  update({ q: '', tags: [], online: false })
}
</script>

<template>
  <div class="relative">
    <GradientGlow class="top-0 h-80 w-2/3" />

    <UContainer class="relative py-16 sm:py-24">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <UPageHeader
          headline="Server list"
          title="Find a server"
          :description="description"
          :ui="{
            root: 'border-none py-0',
            headline: 'font-mono font-medium text-xs text-primary uppercase tracking-[0.12em]',
            description: 'max-w-2xl'
          }"
        />
        <UButton
          to="/dashboard/servers/new"
          icon="i-lucide-plus"
          label="List your server"
          color="neutral"
          variant="subtle"
          class="shrink-0 self-start sm:self-auto"
        />
      </div>

      <div class="mt-10 flex flex-col gap-3">
        <div class="flex flex-col gap-3 lg:flex-row">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search by name, description or address"
            aria-label="Search servers"
            size="lg"
            class="flex-1"
          >
            <template
              v-if="search"
              #trailing
            >
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                icon="i-lucide-x"
                aria-label="Clear search"
                @click="search = ''"
              />
            </template>
          </UInput>
          <USelectMenu
            v-model="selectedTags"
            :items="tagItems"
            value-key="value"
            multiple
            icon="i-lucide-tags"
            placeholder="All tags"
            aria-label="Filter by tag"
            size="lg"
            class="w-full lg:w-64"
          />
          <USelect
            v-model="sort"
            :items="[...sortOptions]"
            icon="i-lucide-arrow-down-wide-narrow"
            aria-label="Sort servers"
            size="lg"
            class="w-full lg:w-44"
          />
        </div>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
          <USwitch
            v-model="onlyOnline"
            label="Online only"
          />
          <span
            v-if="data"
            class="ms-auto font-mono text-xs text-dimmed"
          >
            {{ total.toLocaleString() }} {{ total === 1 ? 'server' : 'servers' }}
          </span>
        </div>
      </div>

      <div class="mt-8">
        <div
          v-if="loading"
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <USkeleton
            v-for="n in 6"
            :key="n"
            class="h-44 rounded-xl"
          />
        </div>

        <UAlert
          v-else-if="error"
          color="warning"
          variant="subtle"
          icon="i-lucide-cloud-off"
          title="The server list can't be reached"
          description="Servers couldn't be loaded right now. Try again in a moment."
          :actions="[{ label: 'Try again', icon: 'i-lucide-refresh-cw', color: 'warning', variant: 'solid', onClick: () => refresh() }]"
        />

        <UEmpty
          v-else-if="!servers.length"
          :icon="filtered ? 'i-lucide-search-x' : 'i-lucide-server'"
          :title="filtered ? 'No servers match these filters' : 'No servers listed yet'"
          :description="filtered ? 'Try a different search, or clear the filters.' : 'Be the first to list a server. Listings show up here once they pass review.'"
          variant="naked"
          :actions="filtered
            ? [{ label: 'Clear filters', icon: 'i-lucide-x', color: 'neutral', variant: 'subtle', onClick: clearFilters }]
            : [{ label: 'List your server', icon: 'i-lucide-plus', color: 'neutral', variant: 'subtle', to: '/dashboard/servers/new' }]"
          class="rounded-2xl border border-dashed border-accented py-16"
        />

        <template v-else>
          <div
            class="grid gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3"
            :class="{ 'opacity-60': status === 'pending' }"
          >
            <ServersServerCard
              v-for="server in servers"
              :key="server.slug"
              :server="server"
              :tag-names="tagNames"
            />
          </div>

          <div
            v-if="total > perPage"
            class="mt-10 flex justify-center"
          >
            <UPagination
              v-model:page="page"
              :total="total"
              :items-per-page="perPage"
              color="neutral"
              variant="ghost"
              active-color="neutral"
              active-variant="subtle"
            />
          </div>
        </template>
      </div>
    </UContainer>
  </div>
</template>
