<script setup lang="ts">
withDefaults(defineProps<{ src: string | null | undefined, name: string, size?: string }>(), { size: 'size-12' })
</script>

<template>
  <div
    class="shrink-0 overflow-hidden rounded-lg bg-elevated ring ring-default"
    :class="size"
  >
    <img
      v-if="src"
      :src="src"
      :alt="`${name} icon`"
      class="size-full object-cover [image-rendering:pixelated]"
      loading="lazy"
    >
    <div
      v-else
      class="flex size-full items-center justify-center text-dimmed"
    >
      <UIcon
        name="i-lucide-server"
        class="size-1/2"
      />
    </div>
  </div>
</template>
