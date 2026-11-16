<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { ReportReason } from '~/utils/servers'

const props = defineProps<{ slug: string, name: string }>()
const open = defineModel<boolean>('open', { default: false })

const api = useApi()
const toast = useToast()

const schema = z.object({
  reason: z.enum(['offline', 'wrong_info', 'inappropriate', 'scam', 'other'], { error: 'Pick a reason' }),
  details: z.string().trim().max(1000, 'At most 1000 characters')
})

const state = reactive<{ reason: ReportReason | undefined, details: string }>({ reason: undefined, details: '' })
const sending = ref(false)

async function onSubmit(event: FormSubmitEvent<z.output<typeof schema>>) {
  sending.value = true
  try {
    await api(`/servers/${encodeURIComponent(props.slug)}/report`, {
      method: 'POST',
      body: { reason: event.data.reason, details: event.data.details || undefined }
    })
    toast.add({ title: 'Report sent', description: 'Thanks. Staff will look into it.', icon: 'i-lucide-check', color: 'success' })
    open.value = false
    state.reason = undefined
    state.details = ''
  } catch (error) {
    toast.add({ title: 'Report not sent', description: apiError(error).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Report ${name}`"
    description="Tell staff what is wrong with this listing."
  >
    <template #body>
      <UForm
        id="report-form"
        :schema="schema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Reason"
          name="reason"
          required
        >
          <USelect
            v-model="state.reason"
            :items="reportReasons"
            placeholder="Pick a reason"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Details"
          name="details"
          hint="Optional"
        >
          <UTextarea
            v-model="state.details"
            :rows="4"
            :maxlength="1000"
            placeholder="Anything that helps staff check the report"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          type="submit"
          form="report-form"
          label="Send report"
          icon="i-lucide-flag"
          color="error"
          :loading="sending"
        />
      </div>
    </template>
  </UModal>
</template>
