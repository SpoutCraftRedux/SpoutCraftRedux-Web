<script setup lang="ts">
definePageMeta({
  colorMode: 'dark'
})

const { data: page } = await useAsyncData('index', () => queryCollection('content').first())
if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const title = page.value?.seo?.title || page.value?.title
const description = page.value?.seo?.description || page.value?.description

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description
})

const heroTitle = computed(() => {
  const [primary = '', ...secondaryParts] = (page.value?.title ?? '').split('\n')

  return {
    primary,
    secondary: secondaryParts.join(' ').trim()
  }
})

const badgeColors: Record<string, 'primary' | 'success' | 'neutral'> = {
  'Client mod': 'primary',
  'Works on vanilla': 'success',
  'Later': 'neutral'
}

const sectionUi = {
  root: 'py-16 sm:py-24 scroll-mt-(--ui-header-height)',
  container: 'max-w-5xl',
  headline: 'font-mono font-medium text-xs text-primary uppercase tracking-[0.12em] text-center',
  title: 'max-w-lg mx-auto',
  description: 'max-w-xl mx-auto text-dimmed'
}

function enterMotion(delay: number = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay }
  }
}

function scrollMotion(delay: number = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    inViewOptions: { once: true, amount: 1 },
    transition: { duration: 0.6, delay }
  }
}

function staggerMotion(index: number = 0) {
  return {
    initial: { opacity: 0 },
    whileInView: { opacity: 1 },
    inViewOptions: { once: true, amount: 0.5 },
    transition: { duration: 0.6, delay: index * 0.08 }
  }
}

const { copy, copied } = useClipboard()
</script>

<template>
  <div v-if="page">
    <!-- Hero -->
    <UPageHero
      :ui="{
        root: 'pb-24 sm:pb-32',
        container: 'relative z-10 lg:py-32',
        wrapper: 'flex flex-col items-center',
        title: 'sm:text-6xl lg:text-7xl xl:text-[80px] tracking-tighter leading-[1.05]',
        description: 'mt-5 max-w-xl mx-auto text-base sm:text-lg leading-relaxed text-default',
        links: 'gap-3'
      }"
    >
      <template #top>
        <Motion v-bind="staggerMotion(0)">
          <HeroShaders class="absolute top-0 inset-x-0 opacity-15 h-full" />
        </Motion>

        <GradientGlow class="top-0 w-2/3 h-1/2" />
      </template>

      <template #headline>
        <Motion v-bind="enterMotion(0.2)">
          <UBadge
            color="neutral"
            variant="soft"
            :label="page.hero.headline"
            class="rounded-full px-3 py-1.5 gap-1.5 bg-white/5 backdrop-blur-sm"
          >
            <template #leading>
              <UChip
                inset
                standalone
                :ui="{ base: 'animate-pulse ring-0' }"
              />
            </template>
          </UBadge>
        </Motion>
      </template>

      <template #title>
        <Motion
          as="span"
          v-bind="enterMotion(0.35)"
          class="inline-block"
        >
          {{ heroTitle.primary }}
          <br v-if="heroTitle.secondary">
          <span
            v-if="heroTitle.secondary"
            class="animate-shimmer bg-size-[200%_auto] bg-clip-text text-transparent"
            :style="{
              backgroundImage: 'linear-gradient(135deg, var(--color-primary-400), var(--color-primary-300), var(--color-primary-200), var(--color-primary-100), var(--color-primary-200), var(--color-primary-300), var(--color-primary-400))',
              animationDuration: '10s'
            }"
          >
            {{ heroTitle.secondary }}
          </span>
        </Motion>
      </template>

      <template #description>
        <Motion
          as="span"
          v-bind="enterMotion(0.5)"
          class="inline-block"
        >
          {{ page.description }}
        </Motion>
      </template>

      <template #links>
        <Motion
          class="flex flex-wrap justify-center gap-6"
          v-bind="enterMotion(0.65)"
        >
          <UButton
            v-for="link in page.hero.links"
            :key="link.label"
            v-bind="link"
          />
        </Motion>
      </template>

      <Motion
        as-child
        v-bind="enterMotion(0.85)"
        class="max-w-2xl mx-auto w-full"
      >
        <HeroTerminal :lines="page.terminal.lines" />
      </Motion>
    </UPageHero>

    <!-- Features -->
    <UPageSection
      id="features"
      :ui="sectionUi"
    >
      <template #headline>
        <Motion
          as="span"
          v-bind="scrollMotion()"
          class="inline-block"
        >
          {{ page.features.headline }}
        </Motion>
      </template>

      <template #title>
        <Motion
          as="span"
          v-bind="scrollMotion(0.1)"
          class="inline-block"
        >
          {{ page.features.title }}
        </Motion>
      </template>

      <template #description>
        <Motion
          as="span"
          v-bind="scrollMotion(0.2)"
          class="inline-block"
        >
          {{ page.features.description }}
        </Motion>
      </template>

      <div class="rounded-2xl border border-default bg-default overflow-hidden">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px">
          <Motion
            v-for="(feature, index) in page.features.items"
            :key="feature.title"
            v-bind="staggerMotion(index)"
          >
            <UPageCard
              :icon="feature.icon"
              :title="feature.title"
              :description="feature.description"
              class="rounded-none duration-300 h-full"
              :ui="{
                leading: 'mb-5 flex w-full items-center justify-between',
                title: 'text-sm tracking-tight',
                description: 'text-sm leading-relaxed text-dimmed'
              }"
            >
              <template #leading>
                <UIcon
                  :name="feature.icon"
                  class="size-9 p-2 rounded-lg bg-primary/10 text-primary"
                />
                <UBadge
                  v-if="feature.badge"
                  :label="feature.badge"
                  :color="badgeColors[feature.badge] ?? 'neutral'"
                  variant="subtle"
                  size="sm"
                  class="rounded-full font-mono"
                />
              </template>
            </UPageCard>
          </Motion>
        </div>
      </div>
    </UPageSection>

    <!-- Platform -->
    <UPageSection
      id="platform"
      :ui="sectionUi"
    >
      <template #headline>
        <Motion
          as="span"
          v-bind="scrollMotion()"
          class="inline-block"
        >
          {{ page.platform.headline }}
        </Motion>
      </template>

      <template #title>
        <Motion
          as="span"
          v-bind="scrollMotion(0.1)"
          class="inline-block"
        >
          {{ page.platform.title }}
        </Motion>
      </template>

      <template #description>
        <Motion
          as="span"
          v-bind="scrollMotion(0.2)"
          class="inline-block"
        >
          {{ page.platform.description }}
        </Motion>
      </template>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
        <Motion
          v-for="(item, index) in page.platform.items"
          :key="item.title"
          v-bind="staggerMotion(index)"
        >
          <UPageFeature
            :icon="item.icon"
            :title="item.title"
            :description="item.description"
            orientation="vertical"
            :ui="{
              leadingIcon: 'text-primary',
              description: 'text-sm leading-relaxed text-dimmed'
            }"
          />
        </Motion>
      </div>
    </UPageSection>

    <!-- Developers -->
    <UPageSection
      id="developers"
      orientation="horizontal"
      :ui="{
        root: 'py-16 sm:py-24 scroll-mt-(--ui-header-height)',
        container: 'max-w-5xl lg:items-center',
        headline: 'font-mono font-medium text-xs text-primary uppercase tracking-[0.12em]',
        description: 'text-dimmed',
        links: 'gap-3'
      }"
    >
      <template #headline>
        <Motion
          as="span"
          v-bind="scrollMotion()"
          class="inline-block"
        >
          {{ page.developers.headline }}
        </Motion>
      </template>

      <template #title>
        <Motion
          as="span"
          v-bind="scrollMotion(0.1)"
          class="inline-block"
        >
          {{ page.developers.title }}
        </Motion>
      </template>

      <template #description>
        <Motion
          as="span"
          v-bind="scrollMotion(0.2)"
          class="inline-block"
        >
          {{ page.developers.description }}
        </Motion>
      </template>

      <template #links>
        <UButton
          v-for="link in page.developers.links"
          :key="link.label"
          v-bind="link"
        />
      </template>

      <Motion
        v-bind="scrollMotion(0.2)"
        class="min-w-0"
      >
        <div class="overflow-hidden rounded-xl border border-default bg-elevated/50 ring-1 ring-white/2">
          <div class="flex items-center justify-between gap-2 border-b border-default py-2 ps-4 pe-2">
            <span class="flex items-center gap-2 font-mono text-xs text-muted">
              <UIcon
                name="i-simple-icons-gradle"
                class="size-4"
              />
              {{ page.developers.filename }}
            </span>
            <UButton
              :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
              :aria-label="copied ? 'Copied' : 'Copy snippet'"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="copy(page.developers.snippet)"
            />
          </div>
          <pre class="overflow-x-auto p-5 font-mono text-xs leading-[1.8] text-default"><code>{{ page.developers.snippet.trim() }}</code></pre>
        </div>
      </Motion>
    </UPageSection>

    <!-- Roadmap -->
    <UPageSection
      id="roadmap"
      :ui="sectionUi"
    >
      <template #headline>
        <Motion
          as="span"
          v-bind="scrollMotion()"
          class="inline-block"
        >
          {{ page.roadmap.headline }}
        </Motion>
      </template>

      <template #title>
        <Motion
          as="span"
          v-bind="scrollMotion(0.1)"
          class="inline-block"
        >
          {{ page.roadmap.title }}
        </Motion>
      </template>

      <template #description>
        <Motion
          as="span"
          v-bind="scrollMotion(0.2)"
          class="inline-block"
        >
          {{ page.roadmap.description }}
        </Motion>
      </template>

      <ol class="mx-auto max-w-2xl rounded-2xl border border-default divide-y divide-default overflow-hidden">
        <Motion
          v-for="(item, index) in page.roadmap.items"
          :key="item.phase"
          as="li"
          v-bind="staggerMotion(index)"
          class="flex gap-4 p-5 sm:gap-6"
          :class="item.current ? 'bg-primary/5' : ''"
        >
          <span
            class="w-16 shrink-0 font-mono text-xs uppercase tracking-[0.06em] pt-0.5"
            :class="item.current ? 'text-primary' : 'text-dimmed'"
          >
            {{ item.phase }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-center gap-2 text-sm font-semibold text-highlighted">
              {{ item.title }}
              <UBadge
                v-if="item.current"
                label="In progress"
                variant="subtle"
                size="sm"
                class="rounded-full font-mono"
              />
            </p>
            <p class="mt-1 text-sm leading-relaxed text-dimmed">
              {{ item.description }}
            </p>
          </div>
        </Motion>
      </ol>
    </UPageSection>

    <!-- CTA -->
    <UPageCTA
      variant="naked"
      :ui="{
        root: 'py-24 sm:py-32',
        container: 'max-w-3xl text-center',
        title: 'lg:text-5xl tracking-tighter whitespace-pre-line',
        description: 'mx-auto max-w-md leading-relaxed text-dimmed'
      }"
    >
      <template #top>
        <GradientGlow class="bottom-0 w-2/3 h-1/2" />
      </template>

      <template #title>
        <Motion
          as="span"
          v-bind="scrollMotion()"
          class="inline-block"
        >
          {{ page.cta.title }}
        </Motion>
      </template>

      <template #description>
        <Motion
          as="span"
          v-bind="scrollMotion(0.1)"
          class="inline-block"
        >
          {{ page.cta.description }}
        </Motion>
      </template>

      <template #links>
        <Motion
          class="flex flex-wrap items-center justify-center gap-4"
          v-bind="scrollMotion(0.2)"
        >
          <UButton
            v-for="link in page.cta.links"
            :key="link.label"
            v-bind="link"
            size="xl"
          />
        </Motion>
      </template>
    </UPageCTA>
  </div>
</template>
