<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { OwnedServer, Paged, ServerState } from '~/utils/servers'

const api = useApi()
const toast = useToast()

const perPage = 25
const search = ref('')
const q = refDebounced(search, 300)
const stateFilter = ref<ServerState | 'all'>('all')
const page = ref(1)
watch([q, stateFilter], () => {
  page.value = 1
})

const stateItems = [
  { label: 'All states', value: 'all' },
  ...(Object.keys(stateMeta) as ServerState[]).map(s => ({ label: stateMeta[s].label, value: s }))
]

const { data, status, error, refresh } = useAsyncData(
  () => `admin-servers-${q.value}-${stateFilter.value}-${page.value}`,
  () => api<Paged & { servers: OwnedServer[] }>('/admin/servers', {
    query: { q: q.value || undefined, state: stateFilter.value === 'all' ? undefined : stateFilter.value, page: page.value, perPage }
  }),
  { server: false, lazy: true }
)

const servers = computed(() => data.value?.servers ?? [])
const busy = ref<string | null>(null)

async function patch(server: OwnedServer, body: { featured?: boolean, sortWeight?: number, listed?: boolean }) {
  busy.value = server.id
  try {
    const updated = await api<OwnedServer>(`/admin/servers/${server.id}`, { method: 'PATCH', body })
    Object.assign(server, updated, 'sortWeight' in body && updated.sortWeight === undefined ? { sortWeight: body.sortWeight } : {})
    toast.add({ title: 'Saved', description: server.name, icon: 'i-lucide-check', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Couldn\'t save', description: apiError(err).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    busy.value = null
  }
}

function onWeight(server: OwnedServer, value: number | null | undefined) {
  const weight = Math.round(value ?? 0)
  if (weight !== (server.sortWeight ?? 0)) patch(server, { sortWeight: weight })
}

const toDelete = ref<OwnedServer | null>(null)
const deleteOpen = computed({
  get: () => !!toDelete.value,
  set: (value) => {
    if (!value) toDelete.value = null
  }
})
const deleting = ref(false)

async function confirmDelete() {
  const server = toDelete.value
  if (!server) return
  deleting.value = true
  try {
    await api(`/admin/servers/${server.id}`, { method: 'DELETE' })
    toast.add({ title: 'Server deleted', description: server.name, icon: 'i-lucide-trash-2', color: 'success' })
    toDelete.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: 'Couldn\'t delete', description: apiError(err).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    deleting.value = false
  }
}

const columns: TableColumn<OwnedServer>[] = [
  { id: 'server', header: 'Server' },
  { accessorKey: 'state', header: 'State' },
  { id: 'players', header: 'Players' },
  { accessorKey: 'featured', header: 'Featured' },
  { accessorKey: 'sortWeight', header: 'Sort weight' },
  { accessorKey: 'listed', header: 'Listed' },
  { id: 'actions', header: () => h('span', { class: 'sr-only' }, 'Actions') }
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-3 sm:flex-row">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search name, address or owner"
        aria-label="Search servers"
        class="flex-1"
      />
      <USelect
        v-model="stateFilter"
        :items="stateItems"
        aria-label="Filter by state"
        class="w-full sm:w-52"
      />
    </div>

    <UAlert
      v-if="error"
      color="warning"
      variant="subtle"
      icon="i-lucide-cloud-off"
      title="Servers can't be loaded"
      :description="apiError(error).message"
      :actions="[{ label: 'Try again', icon: 'i-lucide-refresh-cw', color: 'warning', variant: 'solid', onClick: () => refresh() }]"
    />

    <div
      v-else
      class="overflow-hidden rounded-xl border border-default"
    >
      <UTable
        :data="servers"
        :columns="columns"
        :loading="status === 'pending'"
        empty="No servers found"
        :ui="{ th: 'font-mono text-xs uppercase tracking-[0.06em] text-dimmed', td: 'align-middle' }"
      >
        <template #server-cell="{ row }">
          <div class="flex min-w-0 items-center gap-3">
            <ServersServerIcon
              :src="row.original.iconUrl"
              :name="row.original.name"
              size="size-8"
            />
            <div class="min-w-0">
              <p class="truncate font-semibold text-highlighted">
                {{ row.original.name }}
              </p>
              <p class="truncate font-mono text-xs text-dimmed">
                {{ serverAddress(row.original) }} · {{ row.original.owner?.username }}
              </p>
            </div>
          </div>
        </template>
        <template #state-cell="{ row }">
          <div class="flex flex-col items-start gap-1">
            <UBadge
              :label="stateMeta[row.original.state].label"
              :color="stateMeta[row.original.state].color"
              variant="subtle"
              size="sm"
            />
            <UBadge
              v-if="row.original.pendingRevision"
              label="Revision"
              color="info"
              variant="outline"
              size="sm"
            />
          </div>
        </template>
        <template #players-cell="{ row }">
          <span class="flex items-center gap-2 font-mono text-xs">
            <ServersStatusDot :online="row.original.status?.online" />
            {{ formatPlayers(row.original.status) }}
          </span>
        </template>
        <template #featured-cell="{ row }">
          <USwitch
            :model-value="row.original.featured"
            :disabled="busy === row.original.id"
            :aria-label="`Feature ${row.original.name}`"
            @update:model-value="patch(row.original, { featured: $event })"
          />
        </template>
        <template #sortWeight-cell="{ row }">
          <UInputNumber
            :model-value="row.original.sortWeight ?? 0"
            :step="1"
            size="sm"
            class="w-28"
            :aria-label="`Sort weight for ${row.original.name}`"
            @update:model-value="onWeight(row.original, $event)"
          />
        </template>
        <template #listed-cell="{ row }">
          <USwitch
            :model-value="row.original.listed"
            :disabled="busy === row.original.id"
            :aria-label="`List ${row.original.name}`"
            @update:model-value="patch(row.original, { listed: $event })"
          />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton
              v-if="row.original.state === 'approved'"
              :to="`/servers/${row.original.slug}`"
              icon="i-lucide-external-link"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-label="`View ${row.original.name}`"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
              :aria-label="`Delete ${row.original.name}`"
              @click="toDelete = row.original"
            />
          </div>
        </template>
      </UTable>
    </div>

    <div
      v-if="(data?.total ?? 0) > perPage"
      class="flex justify-center"
    >
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="perPage"
        color="neutral"
        variant="ghost"
        active-color="neutral"
        active-variant="subtle"
      />
    </div>

    <UModal
      v-model:open="deleteOpen"
      title="Delete this server?"
      :description="toDelete ? `${toDelete.name} and its images are removed for good.` : undefined"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="toDelete = null"
          />
          <UButton
            label="Delete server"
            icon="i-lucide-trash-2"
            color="error"
            :loading="deleting"
            @click="confirmDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
