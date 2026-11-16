<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { OwnedServer, Promotion } from '~/utils/servers'

const props = defineProps<{ server: OwnedServer }>()

const api = useApi()

const { data, status, error, refresh } = useAsyncData(
  () => `my-promotions-${props.server.id}`,
  () => api<{ promotions: Promotion[] }>(`/me/servers/${props.server.id}/promotions`),
  { server: false, lazy: true }
)

const promotions = computed(() => data.value?.promotions ?? [])

const columns: TableColumn<Promotion>[] = [
  { accessorKey: 'status', header: 'Status' },
  { id: 'what', header: 'Promotion' },
  { accessorKey: 'startsAt', header: 'Starts' },
  { accessorKey: 'endsAt', header: 'Ends' },
  { id: 'amount', header: 'Paid' }
]
</script>

<template>
  <UCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <p class="font-semibold text-highlighted">
          Promotion
        </p>
        <UBadge
          v-if="server.promoted"
          label="Promoted now"
          icon="i-lucide-megaphone"
          color="primary"
          variant="solid"
        />
      </div>
    </template>

    <div class="flex flex-col gap-5 text-sm">
      <p class="text-muted">
        Promoted servers appear first in the server list and are labelled "Promoted".
      </p>
      <p class="text-muted">
        Promotions are arranged by staff for now.
      </p>

      <USkeleton
        v-if="status === 'pending' && !data"
        class="h-28 rounded-lg"
      />

      <UAlert
        v-else-if="error"
        color="warning"
        variant="subtle"
        icon="i-lucide-cloud-off"
        title="Promotions can't be loaded"
        :description="apiError(error).message"
        :actions="[{ label: 'Try again', icon: 'i-lucide-refresh-cw', color: 'warning', variant: 'solid', onClick: () => refresh() }]"
      />

      <template v-else>
        <div v-if="promotions.length">
          <p class="mb-2 font-mono text-xs uppercase tracking-[0.06em] text-dimmed">
            History
          </p>
          <div class="overflow-hidden rounded-lg border border-default">
            <UTable
              :data="promotions"
              :columns="columns"
              :ui="{ th: 'font-mono text-xs uppercase tracking-[0.06em] text-dimmed', td: 'align-top text-sm' }"
            >
              <template #status-cell="{ row }">
                <UBadge
                  :label="promotionStatusMeta[row.original.status].label"
                  :color="promotionStatusMeta[row.original.status].color"
                  variant="subtle"
                  size="sm"
                />
              </template>
              <template #what-cell="{ row }">
                <p class="text-highlighted">
                  {{ row.original.days }} {{ row.original.days === 1 ? 'day' : 'days' }}
                </p>
                <p class="text-xs text-dimmed">
                  {{ row.original.source === 'staff' ? 'Granted by staff' : 'Tebex' }}
                </p>
              </template>
              <template #startsAt-cell="{ row }">
                <span class="whitespace-nowrap text-muted">{{ formatIso(row.original.startsAt) }}</span>
              </template>
              <template #endsAt-cell="{ row }">
                <span class="whitespace-nowrap text-muted">{{ formatIso(row.original.endsAt) }}</span>
              </template>
              <template #amount-cell="{ row }">
                <span class="whitespace-nowrap text-muted">{{ formatAmount(row.original) }}</span>
              </template>
            </UTable>
          </div>
        </div>
      </template>
    </div>
  </UCard>
</template>
