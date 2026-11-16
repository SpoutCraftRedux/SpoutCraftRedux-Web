<script setup lang="ts">
import { z } from 'zod'
import type { Form, FormSubmitEvent, TableColumn } from '@nuxt/ui'
import type { AdminPromotion } from '~/utils/servers'

const api = useApi()
const toast = useToast()

function fail(title: string, err: unknown) {
  toast.add({ title, description: apiError(err).message, icon: 'i-lucide-circle-alert', color: 'error' })
}

const { data, status, error, refresh } = useAsyncData(
  'admin-promotions',
  () => api<{ slots: number, promotions: AdminPromotion[] }>('/admin/promotions'),
  { server: false, lazy: true }
)
const promotions = computed(() => data.value?.promotions ?? [])
const activeCount = computed(() => promotions.value.filter(p => p.status === 'active').length)

const { data: settings } = useAsyncData('admin-settings', () => api<{ promoSlots: number }>('/admin/settings'), { server: false, lazy: true })
const slots = ref<number | null>(null)
watch(settings, (value) => {
  if (value) slots.value = value.promoSlots
}, { immediate: true })
const savingSlots = ref(false)

async function saveSlots() {
  if (slots.value == null) return
  savingSlots.value = true
  try {
    settings.value = await api<{ promoSlots: number }>('/admin/settings', { method: 'PATCH', body: { promoSlots: slots.value } })
    toast.add({ title: 'Promotion slots saved', description: `${settings.value.promoSlots} at once`, icon: 'i-lucide-check', color: 'success' })
    await refresh()
  } catch (err) {
    fail('Couldn\'t save slots', err)
  } finally {
    savingSlots.value = false
  }
}

const grantSchema = z.object({
  server: z.string().trim().min(1, 'Enter a server slug or id'),
  days: z.number({ error: 'Enter a number of days' }).int().min(1, 'At least 1 day').max(365, 'At most 365 days'),
  startsAt: z.string(),
  note: z.string().trim().max(500, 'At most 500 characters')
})
type GrantSchema = z.output<typeof grantSchema>

const grantForm = useTemplateRef<Form<GrantSchema>>('grantForm')
const grant = reactive<GrantSchema>({ server: '', days: 7, startsAt: '', note: '' })
const granting = ref(false)

async function onGrant(event: FormSubmitEvent<GrantSchema>) {
  granting.value = true
  try {
    await api('/admin/promotions', {
      method: 'POST',
      body: {
        server: event.data.server,
        days: event.data.days,
        startsAt: event.data.startsAt ? new Date(event.data.startsAt).toISOString() : undefined,
        note: event.data.note || undefined
      }
    })
    toast.add({ title: 'Promotion granted', description: event.data.server, icon: 'i-lucide-check', color: 'success' })
    Object.assign(grant, { server: '', days: 7, startsAt: '', note: '' })
    await refresh()
  } catch (err) {
    const e = apiError(err)
    if (e.field) grantForm.value?.setErrors([{ name: e.field, message: e.message }])
    else fail('Couldn\'t grant promotion', err)
  } finally {
    granting.value = false
  }
}

const cancelling = ref<AdminPromotion | null>(null)
const cancelNote = ref('')
const cancelBusy = ref(false)
const cancelOpen = computed({
  get: () => !!cancelling.value,
  set: (value) => {
    if (!value) cancelling.value = null
  }
})

function startCancel(promotion: AdminPromotion) {
  cancelNote.value = ''
  cancelling.value = promotion
}

async function confirmCancel() {
  const promotion = cancelling.value
  if (!promotion) return
  cancelBusy.value = true
  try {
    await api(`/admin/promotions/${promotion.id}/cancel`, { method: 'POST', body: { note: cancelNote.value.trim() || undefined } })
    toast.add({ title: 'Promotion cancelled', description: promotion.server?.name, icon: 'i-lucide-check', color: 'success' })
    cancelling.value = null
    await refresh()
  } catch (err) {
    fail('Couldn\'t cancel', err)
  } finally {
    cancelBusy.value = false
  }
}

const promotionColumns: TableColumn<AdminPromotion>[] = [
  { id: 'server', header: 'Server' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'source', header: 'Source' },
  { id: 'period', header: 'Period' },
  { id: 'amount', header: 'Amount' },
  { accessorKey: 'note', header: 'Note' },
  { id: 'actions', header: () => h('span', { class: 'sr-only' }, 'Actions') }
]

const tableUi = { th: 'font-mono text-xs uppercase tracking-[0.06em] text-dimmed', td: 'align-top text-sm' }
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <UCard variant="subtle">
        <template #header>
          <p class="font-semibold text-highlighted">
            Promotion slots
          </p>
        </template>
        <div class="flex flex-col gap-3 text-sm">
          <p class="text-muted">
            How many servers can be promoted at once. Promotions past the limit are scheduled for the next free slot.
          </p>
          <p class="font-mono text-xs text-dimmed">
            {{ activeCount }} active now
          </p>
          <div class="flex gap-2">
            <UInputNumber
              v-model="slots"
              :min="0"
              :max="50"
              aria-label="Promotion slots"
              class="flex-1"
            />
            <UButton
              label="Save"
              color="neutral"
              variant="subtle"
              :disabled="slots == null || slots === settings?.promoSlots"
              :loading="savingSlots"
              @click="saveSlots"
            />
          </div>
        </div>
      </UCard>

      <UCard variant="subtle">
        <template #header>
          <p class="font-semibold text-highlighted">
            Grant a promotion
          </p>
        </template>
        <UForm
          ref="grantForm"
          :schema="grantSchema"
          :state="grant"
          class="grid gap-4 sm:grid-cols-2"
          @submit="onGrant"
        >
          <UFormField
            label="Server"
            name="server"
            help="Slug or id"
          >
            <UInput
              v-model="grant.server"
              placeholder="test-network"
              class="w-full font-mono"
            />
          </UFormField>
          <UFormField
            label="Days"
            name="days"
          >
            <UInputNumber
              v-model="grant.days"
              :min="1"
              :max="365"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Starts"
            name="startsAt"
            hint="Optional"
            help="Leave empty for the next free slot."
          >
            <UInput
              v-model="grant.startsAt"
              type="datetime-local"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Note"
            name="note"
            hint="Optional"
          >
            <UInput
              v-model="grant.note"
              placeholder="Launch partner"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end sm:col-span-2">
            <UButton
              type="submit"
              label="Grant"
              icon="i-lucide-gift"
              :loading="granting"
            />
          </div>
        </UForm>
      </UCard>
    </div>

    <section class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-semibold text-highlighted">
          Promotions
        </h2>
        <span
          v-if="data"
          class="font-mono text-xs text-dimmed"
        >{{ data.slots }} {{ data.slots === 1 ? 'slot' : 'slots' }}</span>
      </div>
      <UAlert
        v-if="error"
        color="warning"
        variant="subtle"
        icon="i-lucide-cloud-off"
        title="Promotions can't be loaded"
        :description="apiError(error).message"
        :actions="[{ label: 'Try again', icon: 'i-lucide-refresh-cw', color: 'warning', variant: 'solid', onClick: () => refresh() }]"
      />
      <div
        v-else
        class="overflow-hidden rounded-xl border border-default"
      >
        <UTable
          :data="promotions"
          :columns="promotionColumns"
          :loading="status === 'pending'"
          empty="No promotions yet"
          :ui="tableUi"
        >
          <template #server-cell="{ row }">
            <NuxtLink
              v-if="row.original.server"
              :to="`/servers/${row.original.server.slug}`"
              class="font-semibold text-highlighted hover:text-primary"
            >
              {{ row.original.server.name }}
            </NuxtLink>
            <span
              v-else
              class="text-dimmed"
            >Deleted server</span>
            <p class="text-xs text-dimmed">
              {{ row.original.days }} {{ row.original.days === 1 ? 'day' : 'days' }}
            </p>
          </template>
          <template #status-cell="{ row }">
            <UBadge
              :label="promotionStatusMeta[row.original.status].label"
              :color="promotionStatusMeta[row.original.status].color"
              variant="subtle"
              size="sm"
            />
          </template>
          <template #source-cell="{ row }">
            <span class="text-muted">{{ row.original.source === 'staff' ? 'Staff' : 'Tebex' }}</span>
            <p
              v-if="row.original.transactionId"
              class="font-mono text-xs text-dimmed"
            >
              {{ row.original.transactionId }}
            </p>
          </template>
          <template #period-cell="{ row }">
            <p class="whitespace-nowrap text-muted">
              {{ formatIso(row.original.startsAt) }}
            </p>
            <p class="whitespace-nowrap text-dimmed">
              to {{ formatIso(row.original.endsAt) }}
            </p>
          </template>
          <template #amount-cell="{ row }">
            <span class="whitespace-nowrap text-muted">{{ formatAmount(row.original) }}</span>
          </template>
          <template #note-cell="{ row }">
            <span class="whitespace-normal text-muted">{{ row.original.note ?? '—' }}</span>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end">
              <UButton
                v-if="row.original.status === 'active' || row.original.status === 'scheduled'"
                label="Cancel"
                color="error"
                variant="ghost"
                size="sm"
                @click="startCancel(row.original)"
              />
            </div>
          </template>
        </UTable>
      </div>
    </section>

    <UModal
      v-model:open="cancelOpen"
      title="Cancel this promotion?"
      description="The server stops being promoted straight away."
    >
      <template #body>
        <UTextarea
          v-model="cancelNote"
          :rows="3"
          placeholder="Note (optional)"
          class="w-full"
        />
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            label="Keep it"
            color="neutral"
            variant="ghost"
            @click="cancelling = null"
          />
          <UButton
            label="Cancel promotion"
            color="error"
            :loading="cancelBusy"
            @click="confirmCancel"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
