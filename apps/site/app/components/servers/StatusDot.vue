<script setup lang="ts">
defineProps<{ online: boolean | undefined }>()
</script>

<template>
  <span
    class="relative inline-flex size-2.5 shrink-0"
    :aria-label="online ? 'Online' : 'Offline'"
    role="img"
  >
    <span
      v-if="online"
      class="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-50"
    />
    <span
      class="relative inline-flex size-2.5 rounded-full"
      :class="online ? 'bg-success' : 'bg-error/70'"
    />
  </span>
</template>
