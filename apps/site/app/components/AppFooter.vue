<script setup lang="ts">
const links = [
  { label: 'Downloads', to: '/downloads' },
  { label: 'Docs', to: 'https://docs.spoutcraftredux.org', target: '_blank' },
  { label: 'Downloads API', to: 'https://api.spoutcraftredux.org/docs', target: '_blank' },
  { label: 'Server', to: 'https://github.com/SpoutCraftRedux/SpoutCraftRedux-Server', target: '_blank' },
  { label: 'Client', to: 'https://github.com/SpoutCraftRedux/SpoutCraftRedux-Client', target: '_blank' }
]
</script>

<template>
  <UFooter
    :ui="{
      container: 'border-t border-default lg:py-8',
      right: 'gap-x-0 flex-wrap'
    }"
  >
    <template #left>
      <div class="flex flex-col gap-1 text-sm text-dimmed">
        <p>
          © {{ new Date().getFullYear() }} SpoutCraft Redux. Licensed under
          <ULink
            to="https://www.gnu.org/licenses/lgpl-3.0.html"
            target="_blank"
            class="text-muted hover:text-default"
          >LGPL-3.0</ULink>; the server is distributed under
          <ULink
            to="https://www.gnu.org/licenses/gpl-3.0.html"
            target="_blank"
            class="text-muted hover:text-default"
          >GPL-3.0</ULink>.
        </p>
        <p>Not affiliated with Mojang Studios or Microsoft.</p>
      </div>
    </template>

    <template #right>
      <UButton
        v-for="link in links"
        :key="link.label"
        :label="link.label"
        :to="link.to"
        :target="link.target"
        color="neutral"
        variant="link"
        class="font-light"
        size="sm"
      />
      <UButton
        icon="i-simple-icons-github"
        to="https://github.com/SpoutCraftRedux"
        target="_blank"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="SpoutCraft Redux on GitHub"
      />
    </template>
  </UFooter>
</template>
