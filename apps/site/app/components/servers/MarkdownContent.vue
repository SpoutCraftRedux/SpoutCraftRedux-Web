<script setup lang="ts">
const props = defineProps<{ source: string | null | undefined }>()

const body = shallowRef<Awaited<ReturnType<typeof renderSafeMarkdown>> | null>(null)
const debounced = refDebounced(computed(() => props.source ?? ''), 200)

watch(debounced, async (value) => {
  body.value = value.trim() ? await renderSafeMarkdown(value).catch(() => null) : null
}, { immediate: true })
</script>

<template>
  <div class="text-sm text-default *:first:mt-0 *:last:mb-0">
    <MDCRenderer
      v-if="body"
      :body="body"
      :data="{}"
    />
    <slot
      v-else
      name="empty"
    />
  </div>
</template>
