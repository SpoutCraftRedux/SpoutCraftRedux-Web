<script setup lang="ts">
import type { OwnedServer, QueueItem } from '~/utils/servers'

const api = useApi()
const toast = useToast()

const { data, status, error, refresh } = useAsyncData('admin-queue', () => api<{ items: QueueItem[] }>('/admin/queue'), { server: false, lazy: true })
const items = computed(() => data.value?.items ?? [])
const loading = computed(() => (status.value === 'idle' || status.value === 'pending') && !data.value)

const fieldLabels: Record<string, string> = {
  name: 'Name',
  address: 'Address',
  port: 'Port',
  shortDescription: 'Short description',
  description: 'Description',
  iconUrl: 'Icon',
  bannerUrl: 'Banner'
}

function diff(item: QueueItem) {
  const s = item.server
  const rev = s.pendingRevision ?? {}
  const keys = item.kind === 'revision'
    ? Object.keys(rev).filter(k => k !== 'submittedAt')
    : Object.keys(fieldLabels)
  return keys.map((key) => {
    const live = (s as unknown as Record<string, unknown>)[key]
    const next = item.kind === 'revision' ? (rev as Record<string, unknown>)[key] : live
    return { key, label: fieldLabels[key] ?? key, live, next, image: key === 'iconUrl' || key === 'bannerUrl' }
  })
}

const busy = ref<string | null>(null)

async function act(server: OwnedServer, action: 'approve' | 'reject' | 'request-changes', body?: Record<string, string>) {
  busy.value = server.id
  try {
    await api(`/admin/servers/${server.id}/${action}`, { method: 'POST', body })
    const titles = { 'approve': 'Approved', 'reject': 'Rejected', 'request-changes': 'Changes requested' }
    toast.add({ title: titles[action], description: server.name, icon: 'i-lucide-check', color: 'success' })
    await refresh()
    return true
  } catch (err) {
    toast.add({ title: 'Action failed', description: apiError(err).message, icon: 'i-lucide-circle-alert', color: 'error' })
    return false
  } finally {
    busy.value = null
  }
}

const dialog = reactive<{ open: boolean, mode: 'reject' | 'request-changes', server: OwnedServer | null, text: string }>({ open: false, mode: 'reject', server: null, text: '' })

function openDialog(server: OwnedServer, mode: 'reject' | 'request-changes') {
  Object.assign(dialog, { open: true, mode, server, text: '' })
}

async function confirmDialog() {
  if (!dialog.server || !dialog.text.trim()) return
  const body: Record<string, string> = dialog.mode === 'reject' ? { reason: dialog.text.trim() } : { note: dialog.text.trim() }
  if (await act(dialog.server, dialog.mode, body)) dialog.open = false
}

const expanded = ref<Record<string, boolean>>({})
</script>

<template>
  <div>
    <div
      v-if="loading"
      class="flex flex-col gap-3"
    >
      <USkeleton
        v-for="n in 3"
        :key="n"
        class="h-32 w-full rounded-xl"
      />
    </div>

    <UAlert
      v-else-if="error"
      color="warning"
      variant="subtle"
      icon="i-lucide-cloud-off"
      title="The review queue can't be loaded"
      :description="apiError(error).message"
      :actions="[{ label: 'Try again', icon: 'i-lucide-refresh-cw', color: 'warning', variant: 'solid', onClick: () => refresh() }]"
    />

    <UEmpty
      v-else-if="!items.length"
      icon="i-lucide-inbox"
      title="Queue is empty"
      description="New listings and edits to live listings show up here."
      variant="naked"
      class="rounded-2xl border border-dashed border-accented py-16"
    />

    <ul
      v-else
      class="flex flex-col gap-4"
    >
      <li
        v-for="item in items"
        :key="`${item.server.id}-${item.kind}`"
        class="rounded-xl border border-default bg-elevated/40"
      >
        <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <ServersServerIcon
              :src="item.server.iconUrl"
              :name="item.server.name"
            />
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="truncate font-semibold text-highlighted">
                  {{ item.server.name }}
                </p>
                <UBadge
                  :label="item.kind === 'new' ? 'New listing' : 'Revision'"
                  :color="item.kind === 'new' ? 'primary' : 'info'"
                  variant="subtle"
                  size="sm"
                />
                <UBadge
                  :label="item.server.verified ? 'Verified' : 'Not verified'"
                  :color="item.server.verified ? 'success' : 'warning'"
                  variant="outline"
                  size="sm"
                />
              </div>
              <p class="truncate font-mono text-xs text-dimmed">
                {{ serverAddress(item.server) }} · by {{ item.server.owner?.username }} · sent {{ formatIso(item.submittedAt) }}
              </p>
            </div>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <UButton
              label="Approve"
              icon="i-lucide-check"
              color="success"
              variant="subtle"
              size="sm"
              :loading="busy === item.server.id"
              @click="act(item.server, 'approve')"
            />
            <UButton
              label="Request changes"
              icon="i-lucide-message-square-warning"
              color="warning"
              variant="subtle"
              size="sm"
              :disabled="busy === item.server.id"
              @click="openDialog(item.server, 'request-changes')"
            />
            <UButton
              label="Reject"
              icon="i-lucide-x"
              color="error"
              variant="subtle"
              size="sm"
              :disabled="busy === item.server.id"
              @click="openDialog(item.server, 'reject')"
            />
          </div>
        </div>

        <div class="border-t border-default p-4">
          <div class="mb-3 flex flex-wrap gap-1.5">
            <UBadge
              v-for="tag in item.server.tags"
              :key="tag"
              :label="tag"
              color="neutral"
              variant="outline"
              size="sm"
            />
            <UBadge
              v-if="item.server.website"
              :label="item.server.website"
              icon="i-lucide-globe"
              color="neutral"
              variant="outline"
              size="sm"
            />
            <UBadge
              v-if="item.server.discord"
              :label="item.server.discord"
              icon="i-simple-icons-discord"
              color="neutral"
              variant="outline"
              size="sm"
            />
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="font-mono text-xs uppercase tracking-[0.06em] text-dimmed">
                  <th class="w-40 py-2 pe-4 font-medium">
                    Field
                  </th>
                  <th
                    v-if="item.kind === 'revision'"
                    class="py-2 pe-4 font-medium"
                  >
                    Live
                  </th>
                  <th class="py-2 font-medium">
                    {{ item.kind === 'revision' ? 'Proposed' : 'Value' }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in diff(item)"
                  :key="row.key"
                  class="border-t border-default align-top"
                >
                  <td class="py-2 pe-4 text-muted">
                    {{ row.label }}
                  </td>
                  <td
                    v-if="item.kind === 'revision'"
                    class="py-2 pe-4"
                  >
                    <template v-if="row.image">
                      <img
                        v-if="row.live"
                        :src="String(row.live)"
                        :alt="`Live ${row.label}`"
                        :class="row.key === 'iconUrl' ? 'size-12' : 'h-10'"
                      >
                      <span
                        v-else
                        class="text-dimmed"
                      >None</span>
                    </template>
                    <p
                      v-else
                      class="line-clamp-6 whitespace-pre-wrap text-dimmed line-through decoration-error/50"
                    >
                      {{ row.live ?? '—' }}
                    </p>
                  </td>
                  <td class="py-2">
                    <template v-if="row.image">
                      <img
                        v-if="row.next"
                        :src="String(row.next)"
                        :alt="`Proposed ${row.label}`"
                        :class="row.key === 'iconUrl' ? 'size-12' : 'h-10'"
                      >
                      <span
                        v-else
                        class="text-dimmed"
                      >None</span>
                    </template>
                    <template v-else-if="row.key === 'description'">
                      <div :class="{ 'max-h-48 overflow-hidden': !expanded[item.server.id] }">
                        <ServersMarkdownContent :source="String(row.next ?? '')">
                          <template #empty>
                            <span class="text-dimmed">Empty</span>
                          </template>
                        </ServersMarkdownContent>
                      </div>
                      <UButton
                        v-if="String(row.next ?? '').length > 400"
                        :label="expanded[item.server.id] ? 'Show less' : 'Show all'"
                        color="neutral"
                        variant="link"
                        size="xs"
                        class="px-0"
                        @click="expanded[item.server.id] = !expanded[item.server.id]"
                      />
                    </template>
                    <p
                      v-else
                      class="whitespace-pre-wrap text-highlighted"
                    >
                      {{ row.next ?? '—' }}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </li>
    </ul>

    <UModal
      v-model:open="dialog.open"
      :title="dialog.mode === 'reject' ? `Reject ${dialog.server?.name ?? ''}` : `Request changes to ${dialog.server?.name ?? ''}`"
      :description="dialog.mode === 'reject' ? 'The owner sees this reason.' : 'Tell the owner what to change. They see this note.'"
    >
      <template #body>
        <UTextarea
          v-model="dialog.text"
          :rows="4"
          :placeholder="dialog.mode === 'reject' ? 'Reason' : 'Note'"
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
            @click="dialog.open = false"
          />
          <UButton
            :label="dialog.mode === 'reject' ? 'Reject' : 'Request changes'"
            :color="dialog.mode === 'reject' ? 'error' : 'warning'"
            :disabled="!dialog.text.trim()"
            :loading="!!busy"
            @click="confirmDialog"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
