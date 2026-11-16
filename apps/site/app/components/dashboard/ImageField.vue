<script setup lang="ts">
import type { OwnedServer } from '~/utils/servers'

const props = defineProps<{ server: OwnedServer, kind: 'icon' | 'banner' }>()
const emit = defineEmits<{ updated: [server: OwnedServer] }>()

const api = useApi()
const toast = useToast()

const rules = computed(() => props.kind === 'icon' ? iconRules : bannerRules)
const label = computed(() => props.kind === 'icon' ? 'Icon' : 'Banner')
const liveUrl = computed(() => props.kind === 'icon' ? props.server.iconUrl : props.server.bannerUrl)
const pendingUrl = computed(() => {
  const rev = props.server.pendingRevision
  if (!rev) return undefined
  return props.kind === 'icon' ? rev.iconUrl : rev.bannerUrl
})
const shownUrl = computed(() => pendingUrl.value !== undefined ? pendingUrl.value : liveUrl.value)
const locked = computed(() => props.server.state === 'pending')

const input = useTemplateRef<HTMLInputElement>('input')
const localPreview = ref<string | null>(null)
const busy = ref(false)

onBeforeUnmount(() => {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
})

async function onPick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (input.value) input.value.value = ''
  if (!file) return
  if (!rules.value.types.includes(file.type)) {
    toast.add({ title: `${label.value} not uploaded`, description: rules.value.label, icon: 'i-lucide-circle-alert', color: 'error' })
    return
  }
  if (file.size > rules.value.maxBytes) {
    toast.add({ title: `${label.value} is too large`, description: rules.value.label, icon: 'i-lucide-circle-alert', color: 'error' })
    return
  }
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  localPreview.value = URL.createObjectURL(file)
  busy.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    const updated = await api<OwnedServer>(`/me/servers/${props.server.id}/${props.kind}`, { method: 'PUT', body })
    toast.add({ title: `${label.value} uploaded`, icon: 'i-lucide-check', color: 'success' })
    emit('updated', updated)
  } catch (error) {
    toast.add({ title: `${label.value} not uploaded`, description: apiError(error).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    if (localPreview.value) URL.revokeObjectURL(localPreview.value)
    localPreview.value = null
    busy.value = false
  }
}

async function remove() {
  busy.value = true
  try {
    const updated = await api<OwnedServer>(`/me/servers/${props.server.id}/${props.kind}`, { method: 'DELETE' })
    toast.add({ title: `${label.value} removed`, icon: 'i-lucide-check', color: 'success' })
    emit('updated', updated)
  } catch (error) {
    toast.add({ title: `${label.value} not removed`, description: apiError(error).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-medium text-highlighted">
        {{ label }}
      </p>
      <UBadge
        v-if="pendingUrl !== undefined"
        label="In review"
        color="info"
        variant="outline"
        size="sm"
      />
    </div>

    <div
      class="overflow-hidden rounded-lg border border-dashed border-accented bg-muted"
      :class="kind === 'icon' ? 'size-16' : 'aspect-468/60 w-full'"
    >
      <img
        v-if="localPreview || shownUrl"
        :src="localPreview || shownUrl || undefined"
        :alt="`${label} preview`"
        class="size-full object-cover"
        :class="{ '[image-rendering:pixelated]': kind === 'icon', 'opacity-60': busy }"
      >
      <div
        v-else
        class="flex size-full items-center justify-center text-dimmed"
      >
        <UIcon
          :name="kind === 'icon' ? 'i-lucide-image' : 'i-lucide-rectangle-horizontal'"
          class="size-5"
        />
      </div>
    </div>

    <p class="text-xs text-dimmed">
      {{ rules.label }}
    </p>

    <div class="flex gap-2">
      <input
        ref="input"
        type="file"
        class="hidden"
        :accept="rules.types.join(',')"
        @change="onPick"
      >
      <UButton
        :label="shownUrl ? 'Replace' : 'Upload'"
        icon="i-lucide-upload"
        color="neutral"
        variant="subtle"
        size="sm"
        :loading="busy"
        :disabled="locked"
        @click="input?.click()"
      />
      <UButton
        v-if="shownUrl"
        label="Remove"
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        size="sm"
        :disabled="busy || locked"
        @click="remove"
      />
    </div>
  </div>
</template>
