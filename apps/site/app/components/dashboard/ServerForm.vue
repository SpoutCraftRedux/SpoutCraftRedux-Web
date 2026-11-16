<script setup lang="ts">
import type { Form, FormSubmitEvent, TabsItem } from '@nuxt/ui'
import type { OwnedServer, RevisionFields, ServerFormData, Tag } from '~/utils/servers'

const props = defineProps<{ server?: OwnedServer | null }>()
const emit = defineEmits<{ saved: [server: OwnedServer] }>()

const api = useApi()
const toast = useToast()

const { data: tagData } = useAsyncData('server-tags', () => api<{ tags: Tag[] }>('/tags'), { server: false, lazy: true })

function initialValues(s = props.server): ServerFormData {
  const rev: RevisionFields = s?.pendingRevision ?? {}
  return {
    name: rev.name ?? s?.name ?? '',
    address: rev.address ?? s?.address ?? '',
    port: rev.port ?? s?.port ?? 25565,
    shortDescription: rev.shortDescription ?? s?.shortDescription ?? '',
    description: rev.description ?? s?.description ?? '',
    tags: [...(s?.tags ?? [])],
    website: s?.website ?? '',
    discord: s?.discord ?? ''
  }
}

const form = useTemplateRef<Form<ServerFormData>>('form')
const state = reactive<ServerFormData>(initialValues())
let baseline = initialValues()

watch(() => props.server?.id, () => {
  baseline = initialValues()
  Object.assign(state, initialValues())
})

const tagItems = computed(() => (tagData.value?.tags ?? []).map(t => ({
  label: t.name,
  value: t.slug,
  disabled: state.tags.length >= 5 && !state.tags.includes(t.slug)
})))

const descriptionTabs: TabsItem[] = [
  { label: 'Write', icon: 'i-lucide-pencil', slot: 'write' as const },
  { label: 'Preview', icon: 'i-lucide-eye', slot: 'preview' as const }
]

const saving = ref(false)
const isApproved = computed(() => props.server?.state === 'approved')
const locked = computed(() => props.server?.state === 'pending')
const reviewedKeys = ['name', 'address', 'port', 'shortDescription', 'description'] as const

function buildBody(data: ServerFormData) {
  const out: Record<string, unknown> = {}
  const editing = !!props.server
  for (const key of Object.keys(data) as (keyof ServerFormData)[]) {
    const value = data[key]
    const before = baseline[key]
    if (editing && JSON.stringify(value) === JSON.stringify(before)) continue
    if ((key === 'website' || key === 'discord') && !value) {
      if (editing) out[key] = null
      continue
    }
    if (!editing && key === 'description' && !value) continue
    out[key] = value
  }
  return out
}

async function onSubmit(event: FormSubmitEvent<ServerFormData>) {
  const body = buildBody(event.data)
  if (props.server && !Object.keys(body).length) {
    toast.add({ title: 'Nothing to save', icon: 'i-lucide-info', color: 'neutral' })
    return
  }
  saving.value = true
  try {
    const saved = props.server
      ? await api<OwnedServer>(`/me/servers/${props.server.id}`, { method: 'PATCH', body })
      : await api<OwnedServer>('/me/servers', { method: 'POST', body })
    const reviewed = isApproved.value && reviewedKeys.some(k => k in body)
    toast.add({
      title: props.server ? 'Changes saved' : 'Server created',
      description: reviewed ? 'The public listing updates once staff approve the changes.' : undefined,
      icon: 'i-lucide-check',
      color: 'success'
    })
    baseline = initialValues(saved)
    Object.assign(state, initialValues(saved))
    emit('saved', saved)
  } catch (error) {
    const err = apiError(error)
    if (err.field) form.value?.setErrors([{ name: err.field, message: err.message }])
    toast.add({ title: 'Couldn\'t save', description: err.message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UForm
    ref="form"
    :schema="serverFormSchema"
    :state="state"
    :disabled="locked"
    class="flex flex-col gap-5"
    @submit="onSubmit"
  >
    <UAlert
      v-if="locked"
      color="info"
      variant="subtle"
      icon="i-lucide-lock"
      title="Editing is paused while staff review this listing"
      description="Withdraw it from review to make changes, then submit it again."
    />

    <UFormField
      label="Name"
      name="name"
      required
      :hint="`${state.name.length}/48`"
    >
      <UInput
        v-model="state.name"
        :maxlength="48"
        class="w-full"
      />
    </UFormField>

    <div class="grid gap-5 sm:grid-cols-[1fr_10rem]">
      <UFormField
        label="Address"
        name="address"
        required
        help="Hostname or public IPv4 address. Changing it means verifying again."
      >
        <UInput
          v-model="state.address"
          placeholder="play.example.com"
          autocapitalize="off"
          spellcheck="false"
          class="w-full font-mono"
        />
      </UFormField>
      <UFormField
        label="Port"
        name="port"
      >
        <UInputNumber
          v-model="state.port"
          :min="1"
          :max="65535"
          :format-options="{ useGrouping: false }"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField
      label="Short description"
      name="shortDescription"
      required
      :hint="`${state.shortDescription.length}/120`"
      help="Shown on the server card. 10 to 120 characters."
    >
      <UInput
        v-model="state.shortDescription"
        :maxlength="120"
        class="w-full"
      />
    </UFormField>

    <UFormField
      label="Description"
      name="description"
      :hint="`${state.description.length}/5000`"
      help="Markdown. Links, lists, headings and code work. Images and raw HTML are not shown."
    >
      <UTabs
        :items="descriptionTabs"
        variant="link"
        size="sm"
        color="neutral"
        class="w-full"
        :ui="{ content: 'pt-2' }"
      >
        <template #write>
          <UTextarea
            v-model="state.description"
            :rows="12"
            :maxlength="5000"
            autoresize
            :maxrows="30"
            class="w-full font-mono"
          />
        </template>
        <template #preview>
          <div class="min-h-40 rounded-md border border-default px-4 py-3">
            <ServersMarkdownContent :source="state.description">
              <template #empty>
                <p class="text-sm text-dimmed">
                  Nothing to preview yet.
                </p>
              </template>
            </ServersMarkdownContent>
          </div>
        </template>
      </UTabs>
    </UFormField>

    <UFormField
      label="Tags"
      name="tags"
      required
      :hint="`${state.tags.length}/5`"
      help="Pick 1 to 5. Tag changes apply straight away."
    >
      <USelectMenu
        v-model="state.tags"
        :items="tagItems"
        value-key="value"
        multiple
        icon="i-lucide-tags"
        placeholder="Pick tags"
        class="w-full"
      />
    </UFormField>

    <div class="grid gap-5 sm:grid-cols-2">
      <UFormField
        label="Website"
        name="website"
        hint="Optional"
      >
        <UInput
          v-model="state.website"
          type="url"
          icon="i-lucide-globe"
          placeholder="https://example.com"
          class="w-full"
        />
      </UFormField>
      <UFormField
        label="Discord"
        name="discord"
        hint="Optional"
      >
        <UInput
          v-model="state.discord"
          type="url"
          icon="i-simple-icons-discord"
          placeholder="https://discord.gg/example"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="flex items-center justify-end gap-2 border-t border-default pt-5">
      <slot name="actions" />
      <UButton
        type="submit"
        :label="server ? 'Save changes' : 'Create server'"
        :icon="server ? 'i-lucide-save' : 'i-lucide-plus'"
        :loading="saving"
        :disabled="locked"
      />
    </div>
  </UForm>
</template>
