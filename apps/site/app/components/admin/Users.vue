<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Paged, Role, User } from '~/utils/servers'

const api = useApi()
const toast = useToast()
const { user: me } = useAuth()

const search = ref('')
const q = refDebounced(search, 300)
const page = ref(1)
watch(q, () => {
  page.value = 1
})

const { data, status, error, refresh } = useAsyncData(
  () => `admin-users-${q.value}-${page.value}`,
  () => api<Paged & { users: User[] }>('/admin/users', { query: { q: q.value || undefined, page: page.value } }),
  { server: false, lazy: true }
)
const users = computed(() => data.value?.users ?? [])
const busy = ref<string | null>(null)

async function patch(user: User, body: { role?: Role, banned?: boolean }) {
  busy.value = user.id
  try {
    const updated = await api<User>(`/admin/users/${user.id}`, { method: 'PATCH', body })
    Object.assign(user, updated, 'banned' in body && updated.banned === undefined ? { banned: body.banned } : {})
    toast.add({ title: 'User updated', description: user.username, icon: 'i-lucide-check', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Couldn\'t update user', description: apiError(err).message, icon: 'i-lucide-circle-alert', color: 'error' })
  } finally {
    busy.value = null
  }
}

const roleItems = [{ label: 'User', value: 'user' }, { label: 'Staff', value: 'staff' }]

const columns: TableColumn<User>[] = [
  { accessorKey: 'username', header: 'User' },
  { accessorKey: 'createdAt', header: 'Joined' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'banned', header: 'Banned' }
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Search username or email"
      aria-label="Search users"
      class="w-full sm:max-w-sm"
    />

    <UAlert
      v-if="error"
      color="warning"
      variant="subtle"
      icon="i-lucide-cloud-off"
      title="Users can't be loaded"
      :description="apiError(error).message"
      :actions="[{ label: 'Try again', icon: 'i-lucide-refresh-cw', color: 'warning', variant: 'solid', onClick: () => refresh() }]"
    />

    <div
      v-else
      class="overflow-hidden rounded-xl border border-default"
    >
      <UTable
        :data="users"
        :columns="columns"
        :loading="status === 'pending'"
        empty="No users found"
        :ui="{ th: 'font-mono text-xs uppercase tracking-[0.06em] text-dimmed', td: 'align-middle' }"
      >
        <template #username-cell="{ row }">
          <p class="font-semibold text-highlighted">
            {{ row.original.username }}
          </p>
          <p
            v-if="row.original.email"
            class="font-mono text-xs text-dimmed"
          >
            {{ row.original.email }}
          </p>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="whitespace-nowrap text-muted">{{ formatIso(row.original.createdAt) }}</span>
        </template>
        <template #role-cell="{ row }">
          <USelect
            :model-value="row.original.role"
            :items="roleItems"
            size="sm"
            class="w-28"
            :disabled="busy === row.original.id || row.original.id === me?.id"
            :aria-label="`Role for ${row.original.username}`"
            @update:model-value="patch(row.original, { role: $event as Role })"
          />
        </template>
        <template #banned-cell="{ row }">
          <USwitch
            :model-value="!!row.original.banned"
            color="error"
            :disabled="busy === row.original.id || row.original.id === me?.id"
            :aria-label="`Ban ${row.original.username}`"
            @update:model-value="patch(row.original, { banned: $event })"
          />
        </template>
      </UTable>
    </div>

    <div
      v-if="(data?.total ?? 0) > (data?.perPage ?? 24)"
      class="flex justify-center"
    >
      <UPagination
        v-model:page="page"
        :total="data?.total ?? 0"
        :items-per-page="data?.perPage ?? 24"
        color="neutral"
        variant="ghost"
        active-color="neutral"
        active-variant="subtle"
      />
    </div>
  </div>
</template>
