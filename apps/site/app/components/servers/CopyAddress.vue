<script setup lang="ts">
const props = withDefaults(defineProps<{ address: string, size?: 'xs' | 'sm' | 'md' | 'lg', block?: boolean }>(), { size: 'sm', block: false })

const { copy, copied } = useClipboard({ copiedDuring: 1500 })
const toast = useToast()

async function onCopy() {
  await copy(props.address)
  toast.add({ title: 'Address copied', description: props.address, icon: 'i-lucide-copy-check', color: 'success' })
}
</script>

<template>
  <UButton
    :size="size"
    color="neutral"
    variant="subtle"
    :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
    :aria-label="`Copy address ${address}`"
    :block="block"
    class="min-w-0 font-mono"
    @click.prevent.stop="onCopy"
  >
    <span class="truncate">{{ address }}</span>
  </UButton>
</template>
