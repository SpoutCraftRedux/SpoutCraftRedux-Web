<script setup lang="ts">
import type { OwnedServer, VerifyResult } from '~/utils/servers'

const props = defineProps<{ server: OwnedServer }>()
const emit = defineEmits<{ verified: [] }>()

const api = useApi()
const toast = useToast()
const { copy, copied } = useClipboard({ copiedDuring: 1500 })

const checking = ref(false)
const result = ref<VerifyResult | null>(null)

async function check() {
  checking.value = true
  try {
    result.value = await api<VerifyResult>(`/me/servers/${props.server.id}/verify`, { method: 'POST' })
    if (result.value.verified) {
      toast.add({ title: 'Server verified', description: 'The code can come out of the MOTD now.', icon: 'i-lucide-shield-check', color: 'success' })
      emit('verified')
    }
  } catch (error) {
    result.value = null
    toast.add({ title: 'Check failed', description: apiError(error).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <UCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <p class="font-semibold text-highlighted">
          Verify ownership
        </p>
        <UBadge
          :label="server.verified ? 'Verified' : 'Not verified'"
          :icon="server.verified ? 'i-lucide-shield-check' : 'i-lucide-shield-alert'"
          :color="server.verified ? 'success' : 'warning'"
          variant="subtle"
        />
      </div>
    </template>

    <div class="flex flex-col gap-4 text-sm">
      <p
        v-if="server.verified"
        class="text-muted"
      >
        This server is verified. Changing the address or port clears verification.
      </p>
      <template v-else>
        <p class="text-muted">
          Put this code anywhere in your server's MOTD, then click Check. Once it passes, the code can come out of the MOTD.
        </p>
        <p class="text-muted">
          The server must be running SpoutCraft Redux.
          <ULink
            to="/downloads"
            class="text-primary hover:underline"
          >
            Download the server jar
          </ULink>
        </p>
        <button
          type="button"
          class="flex items-center justify-between gap-2 rounded-lg bg-default px-3 py-2 font-mono text-base text-highlighted ring ring-default hover:ring-accented"
          :aria-label="copied ? 'Code copied' : 'Copy verification code'"
          @click="copy(server.verifyCode)"
        >
          {{ server.verifyCode }}
          <UIcon
            :name="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
            class="size-4 text-dimmed"
          />
        </button>
        <UButton
          label="Check"
          icon="i-lucide-radar"
          block
          :loading="checking"
          @click="check"
        />
      </template>

      <UAlert
        v-if="result && !result.verified"
        color="warning"
        variant="subtle"
        icon="i-lucide-shield-x"
        title="Not verified"
        :description="result.error || 'The server answered, but its MOTD doesn\'t contain the code yet.'"
      />
      <div
        v-if="result"
        class="flex flex-col gap-1"
      >
        <p class="font-mono text-xs uppercase tracking-[0.06em] text-dimmed">
          Version reported
        </p>
        <p
          class="flex items-center gap-1.5 font-mono text-sm"
          :class="result.version?.startsWith('SpoutCraft Redux') ? 'text-success' : 'text-warning'"
        >
          <UIcon
            :name="result.version?.startsWith('SpoutCraft Redux') ? 'i-lucide-circle-check' : 'i-lucide-circle-alert'"
            class="size-4 shrink-0"
          />
          {{ result.version ?? 'No answer from the server' }}
        </p>
      </div>
      <div
        v-if="result?.motd"
        class="flex flex-col gap-1"
      >
        <p class="font-mono text-xs uppercase tracking-[0.06em] text-dimmed">
          MOTD seen
        </p>
        <pre class="overflow-x-auto rounded-lg bg-default px-3 py-2 font-mono text-xs whitespace-pre-wrap text-default ring ring-default">{{ result.motd }}</pre>
      </div>
    </div>
  </UCard>
</template>
