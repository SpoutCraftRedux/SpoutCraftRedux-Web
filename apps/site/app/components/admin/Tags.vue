<script setup lang="ts">
import { z } from 'zod'
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import type { Tag } from '~/utils/servers'

const api = useApi()
const toast = useToast()

const { data, status, error, refresh } = useAsyncData('server-tags', () => api<{ tags: Tag[] }>('/tags'), { server: false, lazy: true })
const tags = computed(() => data.value?.tags ?? [])

const schema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(32, 'At most 32 characters'),
  slug: z.string().trim().min(2, 'At least 2 characters').max(24, 'At most 24 characters').regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, numbers and dashes')
})
type Schema = z.output<typeof schema>

const form = useTemplateRef<Form<Schema>>('form')
const state = reactive({ name: '', slug: '' })
const slugTouched = ref(false)
watch(() => state.name, (name) => {
  if (!slugTouched.value) state.slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
})

const adding = ref(false)
async function onSubmit(event: FormSubmitEvent<Schema>) {
  adding.value = true
  try {
    await api('/admin/tags', { method: 'POST', body: event.data })
    toast.add({ title: 'Tag added', description: event.data.name, icon: 'i-lucide-check', color: 'success' })
    Object.assign(state, { name: '', slug: '' })
    slugTouched.value = false
    await refresh()
  } catch (err) {
    const e = apiError(err)
    form.value?.setErrors([{ name: e.field ?? (e.status === 409 ? 'slug' : undefined), message: e.message }])
  } finally {
    adding.value = false
  }
}

const removing = ref<string | null>(null)
async function remove(tag: Tag) {
  removing.value = tag.slug
  try {
    await api(`/admin/tags/${encodeURIComponent(tag.slug)}`, { method: 'DELETE' })
    toast.add({ title: 'Tag deleted', description: tag.name, icon: 'i-lucide-check', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Couldn\'t delete tag', description: apiError(err).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    removing.value = null
  }
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
    <div>
      <UAlert
        v-if="error"
        color="warning"
        variant="subtle"
        icon="i-lucide-cloud-off"
        title="Tags can't be loaded"
        :description="apiError(error).message"
        :actions="[{ label: 'Try again', icon: 'i-lucide-refresh-cw', color: 'warning', variant: 'solid', onClick: () => refresh() }]"
      />
      <UEmpty
        v-else-if="status !== 'pending' && !tags.length"
        icon="i-lucide-tags"
        title="No tags yet"
        description="Owners need at least one tag to list a server."
        variant="naked"
        class="rounded-2xl border border-dashed border-accented py-16"
      />
      <ul
        v-else
        class="divide-y divide-default overflow-hidden rounded-xl border border-default"
      >
        <li
          v-for="tag in tags"
          :key="tag.slug"
          class="flex items-center justify-between gap-3 px-4 py-2.5"
        >
          <div class="min-w-0">
            <span class="font-medium text-highlighted">{{ tag.name }}</span>
            <span class="ms-2 font-mono text-xs text-dimmed">{{ tag.slug }} · {{ tag.count }}</span>
          </div>
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="sm"
            :loading="removing === tag.slug"
            :aria-label="`Delete tag ${tag.name}`"
            @click="remove(tag)"
          />
        </li>
      </ul>
    </div>

    <UCard variant="subtle">
      <template #header>
        <p class="font-semibold text-highlighted">
          Add tag
        </p>
      </template>
      <UForm
        ref="form"
        :schema="schema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Name"
          name="name"
        >
          <UInput
            v-model="state.name"
            placeholder="Survival"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Slug"
          name="slug"
        >
          <UInput
            v-model="state.slug"
            placeholder="survival"
            class="w-full font-mono"
            @input="slugTouched = true"
          />
        </UFormField>
        <UButton
          type="submit"
          label="Add tag"
          icon="i-lucide-plus"
          block
          :loading="adding"
        />
      </UForm>
    </UCard>
  </div>
</template>
