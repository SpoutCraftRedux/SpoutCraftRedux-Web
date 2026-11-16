<script setup lang="ts">
import type { Report } from '~/utils/servers'

const api = useApi()
const toast = useToast()

const filter = ref<'open' | 'resolved'>('open')
const { data, status, error, refresh } = useAsyncData(
  () => `admin-reports-${filter.value}`,
  () => api<{ reports: Report[] }>('/admin/reports', { query: { status: filter.value } }),
  { server: false, lazy: true }
)
const reports = computed(() => data.value?.reports ?? [])
const loading = computed(() => (status.value === 'idle' || status.value === 'pending') && !data.value)

const resolving = ref<Report | null>(null)
const resolution = ref('')
const saving = ref(false)
const resolveOpen = computed({
  get: () => !!resolving.value,
  set: (value) => {
    if (!value) resolving.value = null
  }
})

function startResolve(report: Report) {
  resolution.value = ''
  resolving.value = report
}

async function confirmResolve() {
  const report = resolving.value
  if (!report || !resolution.value.trim()) return
  saving.value = true
  try {
    await api(`/admin/reports/${report.id}/resolve`, { method: 'POST', body: { resolution: resolution.value.trim() } })
    toast.add({ title: 'Report resolved', icon: 'i-lucide-check', color: 'success' })
    resolving.value = null
    await refresh()
  } catch (err) {
    toast.add({ title: 'Couldn\'t resolve', description: apiError(err).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UTabs
      v-model="filter"
      :items="[{ label: 'Open', value: 'open' }, { label: 'Resolved', value: 'resolved' }]"
      :content="false"
      variant="link"
      color="neutral"
      size="sm"
      class="w-full sm:w-auto"
    />

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
      title="Reports can't be loaded"
      :description="apiError(error).message"
      :actions="[{ label: 'Try again', icon: 'i-lucide-refresh-cw', color: 'warning', variant: 'solid', onClick: () => refresh() }]"
    />

    <UEmpty
      v-else-if="!reports.length"
      icon="i-lucide-flag"
      :title="filter === 'open' ? 'No open reports' : 'No resolved reports'"
      variant="naked"
      class="rounded-2xl border border-dashed border-accented py-16"
    />

    <ul
      v-else
      class="flex flex-col gap-3"
    >
      <li
        v-for="report in reports"
        :key="report.id"
        class="flex flex-col gap-3 rounded-xl border border-default bg-elevated/40 p-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <NuxtLink
              v-if="report.server"
              :to="`/servers/${report.server.slug}`"
              class="font-semibold text-highlighted hover:text-primary"
            >
              {{ report.server.name }}
            </NuxtLink>
            <span
              v-else
              class="font-semibold text-highlighted"
            >Deleted server</span>
            <UBadge
              :label="reasonLabel(report.reason)"
              color="error"
              variant="subtle"
              size="sm"
            />
          </div>
          <p class="mt-1 font-mono text-xs text-dimmed">
            by {{ report.reporter?.username ?? 'unknown' }} · {{ formatIso(report.createdAt) }}
          </p>
          <p
            v-if="report.details"
            class="mt-2 text-sm whitespace-pre-wrap text-default"
          >
            {{ report.details }}
          </p>
          <p
            v-if="report.resolution"
            class="mt-2 text-sm text-success"
          >
            Resolved{{ report.resolvedAt ? ` ${formatIso(report.resolvedAt)}` : '' }}: {{ report.resolution }}
          </p>
        </div>
        <UButton
          v-if="report.status === 'open'"
          label="Resolve"
          icon="i-lucide-check"
          color="neutral"
          variant="subtle"
          size="sm"
          class="shrink-0 self-start"
          @click="startResolve(report)"
        />
      </li>
    </ul>

    <UModal
      v-model:open="resolveOpen"
      title="Resolve report"
      description="Note what was done. Only staff see this."
    >
      <template #body>
        <UTextarea
          v-model="resolution"
          :rows="3"
          placeholder="Resolution"
          autofocus
          class="w-full"
        />
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="resolving = null"
          />
          <UButton
            label="Resolve"
            icon="i-lucide-check"
            :disabled="!resolution.trim()"
            :loading="saving"
            @click="confirmResolve"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
