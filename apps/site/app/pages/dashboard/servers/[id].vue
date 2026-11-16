<script setup lang="ts">
import type { OwnedServer } from '~/utils/servers'

definePageMeta({
  colorMode: 'dark',
  middleware: 'auth'
})

const route = useRoute()
const api = useApi()
const toast = useToast()

const id = computed(() => String(route.params.id))

const { data: server, status, error, refresh } = useAsyncData(
  () => `my-server-${id.value}`,
  () => api<OwnedServer>(`/me/servers/${encodeURIComponent(id.value)}`),
  { server: false, lazy: true }
)

useSeoMeta({ title: () => server.value?.name ?? 'Manage server', robots: 'noindex' })

const loading = computed(() => (status.value === 'idle' || status.value === 'pending') && !server.value)
const notFound = computed(() => apiError(error.value).status === 404)

function onUpdated(updated: OwnedServer) {
  server.value = updated
}

const submitting = ref(false)
async function submitForReview() {
  if (!server.value) return
  submitting.value = true
  try {
    server.value = await api<OwnedServer>(`/me/servers/${server.value.id}/submit`, { method: 'POST' })
    toast.add({ title: 'Sent for review', description: 'Staff will look at it soon.', icon: 'i-lucide-send', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Couldn\'t send for review', description: apiError(err).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    submitting.value = false
  }
}

const withdrawing = ref(false)
async function withdraw() {
  if (!server.value) return
  withdrawing.value = true
  try {
    server.value = await api<OwnedServer>(`/me/servers/${server.value.id}/withdraw`, { method: 'POST' })
    toast.add({ title: 'Withdrawn from review', description: 'The listing is a draft again. Submit it once your changes are done.', icon: 'i-lucide-undo-2', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Couldn\'t withdraw the listing', description: apiError(err).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    withdrawing.value = false
  }
}

const listedBusy = ref(false)
async function setListed(listed: boolean) {
  if (!server.value) return
  listedBusy.value = true
  try {
    server.value = await api<OwnedServer>(`/me/servers/${server.value.id}`, { method: 'PATCH', body: { listed } })
  } catch (err) {
    toast.add({ title: 'Couldn\'t update the listing', description: apiError(err).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    listedBusy.value = false
  }
}

const deleteOpen = ref(false)
const deleting = ref(false)
const confirmName = ref('')
async function remove() {
  if (!server.value) return
  deleting.value = true
  try {
    await api(`/me/servers/${server.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Server deleted', description: server.value.name, icon: 'i-lucide-trash-2', color: 'success' })
    deleteOpen.value = false
    await navigateTo('/dashboard')
  } catch (err) {
    toast.add({ title: 'Couldn\'t delete the server', description: apiError(err).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    deleting.value = false
  }
}

const revisionFields = computed(() => {
  const rev = server.value?.pendingRevision
  if (!rev) return []
  const labels: Record<string, string> = { name: 'Name', address: 'Address', port: 'Port', shortDescription: 'Short description', description: 'Description', iconUrl: 'Icon', bannerUrl: 'Banner' }
  return Object.keys(rev).filter(k => k !== 'submittedAt').map(k => labels[k] ?? k)
})

const submitHint = computed(() => {
  const s = server.value
  if (!s) return ''
  if (s.state === 'pending') return 'This listing is waiting in the review queue. Withdraw it to make changes.'
  if (s.state === 'approved') return 'This listing is live. Edits to the name, address, descriptions and images go to staff for review.'
  if (!s.verified) return 'Verify ownership first, then send the listing for review.'
  return 'Ready to send. Staff check every listing before it goes public.'
})
</script>

<template>
  <UContainer class="max-w-5xl py-12 sm:py-16">
    <UButton
      to="/dashboard"
      icon="i-lucide-arrow-left"
      label="Dashboard"
      color="neutral"
      variant="link"
      class="-ms-2 px-2"
    />

    <div
      v-if="loading"
      class="mt-6 flex flex-col gap-4"
    >
      <USkeleton class="h-16 w-1/2" />
      <USkeleton class="h-96 w-full rounded-xl" />
    </div>

    <UEmpty
      v-else-if="notFound"
      icon="i-lucide-search-x"
      title="Server not found"
      description="This listing doesn't exist, or it isn't yours."
      variant="naked"
      :actions="[{ label: 'Back to dashboard', color: 'neutral', variant: 'subtle', to: '/dashboard' }]"
      class="mt-6 rounded-2xl border border-dashed border-accented py-16"
    />

    <UAlert
      v-else-if="error || !server"
      class="mt-6"
      color="warning"
      variant="subtle"
      icon="i-lucide-cloud-off"
      title="This server can't be loaded"
      :description="apiError(error).message"
      :actions="[{ label: 'Try again', icon: 'i-lucide-refresh-cw', color: 'warning', variant: 'solid', onClick: () => refresh() }]"
    />

    <template v-else>
      <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          <ServersServerIcon
            :src="server.iconUrl"
            :name="server.name"
          />
          <div class="min-w-0">
            <h1 class="truncate text-2xl font-bold text-highlighted">
              {{ server.name }}
            </h1>
            <div class="mt-1 flex flex-wrap gap-1.5">
              <UBadge
                :label="stateMeta[server.state].label"
                :icon="stateMeta[server.state].icon"
                :color="stateMeta[server.state].color"
                variant="subtle"
              />
              <UBadge
                :label="server.verified ? 'Verified' : 'Not verified'"
                :icon="server.verified ? 'i-lucide-shield-check' : 'i-lucide-shield-alert'"
                :color="server.verified ? 'success' : 'neutral'"
                variant="outline"
              />
            </div>
          </div>
        </div>
        <UButton
          v-if="server.state === 'approved'"
          :to="`/servers/${server.slug}`"
          icon="i-lucide-external-link"
          label="View listing"
          color="neutral"
          variant="subtle"
          class="self-start sm:self-auto"
        />
      </div>

      <div class="mt-6 flex flex-col gap-3">
        <UAlert
          v-if="server.reviewNote && server.state !== 'pending'"
          :color="server.state === 'rejected' ? 'error' : 'warning'"
          variant="subtle"
          icon="i-lucide-message-square-text"
          :title="server.state === 'rejected' ? 'Staff rejected this listing' : server.state === 'approved' ? 'Note from staff on your changes' : 'Staff asked for changes'"
          :description="server.reviewNote"
        />
        <UAlert
          v-if="server.pendingRevision"
          color="info"
          variant="subtle"
          icon="i-lucide-git-pull-request"
          title="Changes waiting for review"
          :description="`Sent ${formatIso(server.pendingRevision.submittedAt)}. Changed: ${revisionFields.join(', ') || 'none'}. The public listing keeps the approved version until staff approve these. The form below shows the pending values.`"
        />
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <UCard variant="subtle">
          <DashboardServerForm
            :server="server"
            @saved="onUpdated"
          />
        </UCard>

        <div class="flex flex-col gap-6">
          <UCard variant="subtle">
            <template #header>
              <p class="font-semibold text-highlighted">
                Review
              </p>
            </template>
            <div class="flex flex-col gap-4 text-sm">
              <p class="text-muted">
                {{ submitHint }}
              </p>
              <UButton
                v-if="server.state === 'pending'"
                label="Withdraw from review"
                icon="i-lucide-undo-2"
                color="neutral"
                variant="subtle"
                block
                :loading="withdrawing"
                @click="withdraw"
              />
              <UButton
                v-else-if="server.state !== 'approved'"
                label="Submit for review"
                icon="i-lucide-send"
                block
                :disabled="!canSubmit(server)"
                :loading="submitting"
                @click="submitForReview"
              />
              <USwitch
                v-else
                :model-value="server.listed"
                label="Listed publicly"
                description="Turn off to hide the listing without losing it."
                :disabled="listedBusy"
                :loading="listedBusy"
                @update:model-value="setListed"
              />
            </div>
          </UCard>

          <DashboardVerifyPanel
            :server="server"
            @verified="refresh()"
          />

          <UCard variant="subtle">
            <template #header>
              <p class="font-semibold text-highlighted">
                Images
              </p>
            </template>
            <div class="flex flex-col gap-6">
              <DashboardImageField
                :server="server"
                kind="icon"
                @updated="onUpdated"
              />
              <DashboardImageField
                :server="server"
                kind="banner"
                @updated="onUpdated"
              />
            </div>
          </UCard>

          <UCard
            variant="outline"
            :ui="{ root: 'ring-error/30' }"
          >
            <div class="flex flex-col gap-3 text-sm">
              <p class="font-semibold text-highlighted">
                Delete server
              </p>
              <p class="text-muted">
                Removes the listing and its images for good.
              </p>
              <UButton
                label="Delete"
                icon="i-lucide-trash-2"
                color="error"
                variant="subtle"
                block
                @click="confirmName = ''; deleteOpen = true"
              />
            </div>
          </UCard>
        </div>
      </div>

      <DashboardPromotePanel
        v-if="server.state === 'approved'"
        :server="server"
        class="mt-6"
      />

      <UModal
        v-model:open="deleteOpen"
        title="Delete this server?"
        :description="`This can't be undone. Type ${server.name} to confirm.`"
      >
        <template #body>
          <UInput
            v-model="confirmName"
            :placeholder="server.name"
            aria-label="Server name"
            class="w-full"
          />
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="deleteOpen = false"
            />
            <UButton
              label="Delete server"
              icon="i-lucide-trash-2"
              color="error"
              :disabled="confirmName.trim() !== server.name"
              :loading="deleting"
              @click="remove"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UContainer>
</template>
