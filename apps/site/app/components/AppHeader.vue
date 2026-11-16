<script setup lang="ts">
import { motion } from 'motion-v'
import type { VariantType } from 'motion-v'
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const { user, ready, isStaff, logout } = useAuth()

const items: NavigationMenuItem[] = [
  {
    label: 'Home',
    to: '/'
  },
  {
    label: 'Servers',
    to: '/servers'
  },
  {
    label: 'Downloads',
    to: '/downloads'
  },
  {
    label: 'Docs',
    to: 'https://docs.spoutcraftredux.org',
    target: '_blank'
  },
  {
    label: 'API',
    to: 'https://api.spoutcraftredux.org/docs',
    target: '_blank'
  }
]

async function signOut() {
  await logout()
  if (route.path.startsWith('/dashboard') || route.path.startsWith('/admin')) await navigateTo('/')
}

const accountItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: user.value?.username ?? '', type: 'label' as const }],
  [
    { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
    ...(isStaff.value ? [{ label: 'Admin', icon: 'i-lucide-shield', to: '/admin' }] : [])
  ],
  [{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: signOut }]
])

const signInLink = computed(() => ({
  path: '/login',
  query: route.path === '/login' || route.path === '/register' ? route.query : { redirect: route.fullPath }
}))

const variants: Record<string, VariantType | ((custom: unknown) => VariantType)> = {
  normal: {
    rotate: 0,
    y: 0,
    opacity: 1
  },
  close: (custom: unknown) => {
    const c = custom as number
    return {
      rotate: c === 1 ? 45 : c === 3 ? -45 : 0,
      y: c === 1 ? 6 : c === 3 ? -6 : 0,
      opacity: c === 2 ? 0 : 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20
      }
    }
  }
}
</script>

<template>
  <UHeader>
    <template #left>
      <NuxtLink
        to="/"
        class="focus-visible:outline-3 outline-primary/25 rounded-md p-1 -ms-1"
      >
        <AppLogo />
      </NuxtLink>
    </template>

    <UNavigationMenu
      :items="items"
      variant="link"
    />

    <template #right>
      <ClientOnly>
        <UDropdownMenu
          v-if="user"
          :items="accountItems"
          :content="{ align: 'end' }"
        >
          <UButton
            :label="user.username"
            icon="i-lucide-circle-user"
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-chevron-down"
            class="hidden sm:inline-flex"
          />
          <UButton
            icon="i-lucide-circle-user"
            color="neutral"
            variant="ghost"
            aria-label="Account menu"
            class="sm:hidden"
          />
        </UDropdownMenu>
        <UButton
          v-else-if="ready"
          :to="signInLink"
          label="Sign in"
          icon="i-lucide-log-in"
          color="neutral"
          variant="ghost"
        />
      </ClientOnly>

      <UButton
        icon="i-simple-icons-github"
        to="https://github.com/SpoutCraftRedux"
        target="_blank"
        color="neutral"
        variant="ghost"
        aria-label="SpoutCraft Redux on GitHub"
      />
    </template>

    <template #toggle="{ open, toggle, ui }">
      <UButton
        size="sm"
        variant="ghost"
        color="neutral"
        square
        :aria-label="open ? 'Close navigation' : 'Open navigation'"
        :aria-expanded="open"
        :class="ui.toggle({ toggleSide: 'right' })"
        @click="toggle"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <motion.line
            x1="4"
            y1="6"
            x2="20"
            y2="6"
            :variants="variants"
            :animate="open ? 'close' : 'normal'"
            :custom="1"
            tabindex="-1"
          />
          <motion.line
            x1="4"
            y1="12"
            x2="20"
            y2="12"
            :variants="variants"
            :animate="open ? 'close' : 'normal'"
            :custom="2"
            tabindex="-1"
          />
          <motion.line
            x1="4"
            y1="18"
            x2="20"
            y2="18"
            :variants="variants"
            :animate="open ? 'close' : 'normal'"
            :custom="3"
            tabindex="-1"
          />
        </svg>
      </UButton>
    </template>

    <template #body>
      <UNavigationMenu
        :items="items"
        orientation="vertical"
      />
    </template>
  </UHeader>
</template>
