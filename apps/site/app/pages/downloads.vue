<script setup lang="ts">
import type { TableColumn, TabsItem } from '@nuxt/ui'
import type { BuildResponse, ProjectResponse, VersionResponse } from '~/utils/downloads'

definePageMeta({
  colorMode: 'dark'
})

const description = 'Download the SpoutCraft Redux server jar and Fabric client mod. Builds are listed newest first, with the changes that went into each one.'

useSeoMeta({
  title: 'Downloads',
  ogTitle: 'Downloads · SpoutCraft Redux',
  description,
  ogDescription: description
})

const { public: { apiBase } } = useRuntimeConfig()
const route = useRoute()
const router = useRouter()

const api = $fetch.create({ baseURL: apiBase, retry: 1 })

async function getOrNull<T>(path: string): Promise<T | null> {
  try {
    return await api<T>(path)
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

const projectId = ref(
  downloadProjects.some(p => p.id === route.query.project) ? String(route.query.project) : downloadProjects[0]!.id
)
const project = computed(() => downloadProjects.find(p => p.id === projectId.value) ?? downloadProjects[0]!)

watch(projectId, (id) => {
  router.replace({ query: { ...route.query, project: id === downloadProjects[0]!.id ? undefined : id } })
})

const tabs = downloadProjects.map<TabsItem>(p => ({ label: p.label, icon: p.icon, value: p.id }))

const {
  data: projectInfo,
  status: projectStatus,
  error: projectError,
  refresh: refreshProject
} = useAsyncData(
  () => `downloads-${projectId.value}`,
  () => getOrNull<ProjectResponse>(`/v2/${projectId.value}`),
  { server: false, lazy: true }
)

const versions = computed(() => projectInfo.value?.project === projectId.value ? [...projectInfo.value.versions].reverse() : [])

const selectedVersions = reactive<Record<string, string>>({})
const version = computed({
  get: () => {
    const chosen = selectedVersions[projectId.value]
    if (chosen && versions.value.includes(chosen)) return chosen
    return projectInfo.value?.metadata.current ?? versions.value[0]
  },
  set: (value) => {
    if (value) selectedVersions[projectId.value] = value
  }
})

const pageSize = 20
const limit = ref(pageSize)
watch([projectId, version], () => {
  limit.value = pageSize
})

const {
  data: buildData,
  status: buildsStatus,
  error: buildsError,
  refresh: refreshBuilds
} = useAsyncData(
  () => `downloads-${projectId.value}-${version.value ?? 'none'}-${limit.value}`,
  async () => {
    const id = projectId.value
    const ver = version.value
    if (!ver) return { total: 0, builds: [] as BuildResponse[] }

    const info = await getOrNull<VersionResponse>(`/v2/${id}/${ver}`)
    const ids = [...(info?.builds.all ?? [])].reverse()
    const results = await Promise.allSettled(
      ids.slice(0, limit.value).map(build => api<BuildResponse>(`/v2/${id}/${ver}/${build}`))
    )

    return {
      total: ids.length,
      builds: results.flatMap(r => r.status === 'fulfilled' ? [r.value] : [])
    }
  },
  { server: false, lazy: true }
)

const builds = computed(() => buildData.value?.builds ?? [])
const latest = computed(() => builds.value[0])
const hasMore = computed(() => (buildData.value?.total ?? 0) > limit.value)

const loading = computed(() =>
  projectStatus.value === 'idle'
  || projectStatus.value === 'pending'
  || (!!version.value && (buildsStatus.value === 'idle' || buildsStatus.value === 'pending') && !buildData.value)
)
const unreachable = computed(() => !!projectError.value || !!buildsError.value)

function downloadUrl(build: BuildResponse) {
  return `${apiBase}/v2/${build.project}/${build.version}/${build.build}/download`
}

function commitUrl(hash: string) {
  return `${project.value.repo}/commit/${hash}`
}

function retry() {
  if (projectError.value) refreshProject()
  else refreshBuilds()
}

const { copy, copied } = useClipboard()

const columns: TableColumn<BuildResponse>[] = [
  { accessorKey: 'build', header: 'Build' },
  { accessorKey: 'timestamp', header: 'Date' },
  { id: 'changes', header: 'Changes' },
  { id: 'download', header: () => h('span', { class: 'sr-only' }, 'Download') }
]
</script>

<template>
  <div class="relative">
    <GradientGlow class="top-0 w-2/3 h-80" />

    <UContainer class="relative max-w-5xl py-16 sm:py-24">
      <UPageHeader
        headline="Downloads"
        title="Get SpoutCraft Redux"
        :description="description"
        :ui="{
          root: 'border-none pt-0',
          headline: 'font-mono font-medium text-xs text-primary uppercase tracking-[0.12em]'
        }"
      />

      <div class="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <UTabs
          v-model="projectId"
          :items="tabs"
          :content="false"
          color="neutral"
          class="w-full sm:w-auto"
        />

        <USelect
          v-if="versions.length"
          v-model="version"
          :items="versions"
          icon="i-lucide-tag"
          aria-label="Minecraft version"
          class="w-full sm:w-40"
        />
      </div>

      <p class="mt-4 text-sm text-dimmed">
        {{ project.description }}
      </p>

      <div class="mt-8">
        <div
          v-if="loading"
          class="flex flex-col gap-3"
        >
          <USkeleton class="h-28 w-full rounded-xl" />
          <USkeleton class="h-12 w-full" />
          <USkeleton class="h-12 w-full" />
          <USkeleton class="h-12 w-full" />
        </div>

        <UAlert
          v-else-if="unreachable"
          color="warning"
          variant="subtle"
          icon="i-lucide-cloud-off"
          title="The downloads service can't be reached"
          description="Builds couldn't be loaded right now. Try again in a moment, or check the source repository on GitHub."
          :actions="[
            { label: 'Try again', icon: 'i-lucide-refresh-cw', color: 'warning', variant: 'solid', onClick: retry },
            { label: 'GitHub', icon: 'i-simple-icons-github', color: 'neutral', variant: 'ghost', to: project.repo, target: '_blank' }
          ]"
        />

        <UEmpty
          v-else-if="!builds.length"
          icon="i-lucide-hammer"
          title="No builds yet"
          :description="`The first ${project.label.toLowerCase()} build hasn't been published. Builds show up here automatically once they're released.`"
          variant="naked"
          :actions="[
            { label: 'Watch on GitHub', icon: 'i-simple-icons-github', color: 'neutral', variant: 'subtle', to: project.repo, target: '_blank' },
            { label: 'Read the docs', icon: 'i-lucide-book-open', color: 'neutral', variant: 'ghost', to: 'https://docs.spoutcraftredux.org', target: '_blank' }
          ]"
          class="rounded-2xl border border-dashed border-accented py-16"
        />

        <div
          v-else
          class="flex flex-col gap-8"
        >
          <UCard
            v-if="latest"
            variant="subtle"
            :ui="{ body: 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between' }"
          >
            <div class="min-w-0">
              <p class="font-mono text-xs uppercase tracking-[0.06em] text-primary">
                Latest build
              </p>
              <p class="mt-1 text-lg font-semibold text-highlighted">
                {{ project.label }} {{ latest.version }} · #{{ latest.build }}
              </p>
              <p class="mt-1 text-sm text-dimmed">
                {{ formatDate(latest.timestamp) }} · {{ formatBytes(latest.size) }}
              </p>
              <button
                type="button"
                class="mt-2 flex max-w-full items-center gap-1.5 font-mono text-xs text-dimmed hover:text-default"
                :aria-label="copied ? 'SHA-256 copied' : 'Copy SHA-256'"
                @click="copy(latest.sha256)"
              >
                <UIcon
                  :name="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                  class="size-3.5 shrink-0"
                />
                <span class="truncate">sha256 {{ latest.sha256 }}</span>
              </button>
            </div>

            <UButton
              :to="downloadUrl(latest)"
              :download="latest.file_name"
              external
              icon="i-lucide-download"
              :label="`Download ${latest.file_name}`"
              size="lg"
              class="shrink-0 justify-center"
            />
          </UCard>

          <div class="overflow-hidden rounded-xl border border-default">
            <UTable
              :data="builds"
              :columns="columns"
              :ui="{
                th: 'font-mono text-xs uppercase tracking-[0.06em] text-dimmed',
                td: 'align-top'
              }"
            >
              <template #build-cell="{ row }">
                <span class="font-mono font-semibold text-highlighted">#{{ row.original.build }}</span>
              </template>

              <template #timestamp-cell="{ row }">
                <span class="whitespace-nowrap text-muted">{{ formatDate(row.original.timestamp) }}</span>
              </template>

              <template #changes-cell="{ row }">
                <ul
                  v-if="row.original.commits.length"
                  class="flex flex-col gap-1"
                >
                  <li
                    v-for="commit in row.original.commits"
                    :key="commit.hash"
                    class="flex min-w-0 items-baseline gap-2"
                  >
                    <ULink
                      :to="commitUrl(commit.hash)"
                      target="_blank"
                      class="shrink-0 font-mono text-xs text-primary hover:underline"
                    >
                      {{ commit.hash.slice(0, 7) }}
                    </ULink>
                    <span class="whitespace-normal text-default">{{ commit.description.split('\n')[0] }}</span>
                  </li>
                </ul>
                <span
                  v-else
                  class="text-dimmed"
                >No changes listed</span>
              </template>

              <template #download-cell="{ row }">
                <div class="flex justify-end">
                  <UButton
                    :to="downloadUrl(row.original)"
                    :download="row.original.file_name"
                    external
                    icon="i-lucide-download"
                    :aria-label="`Download build ${row.original.build}`"
                    color="neutral"
                    variant="subtle"
                    size="sm"
                  />
                </div>
              </template>
            </UTable>
          </div>

          <div
            v-if="hasMore"
            class="flex justify-center"
          >
            <UButton
              label="Show older builds"
              icon="i-lucide-chevrons-down"
              color="neutral"
              variant="subtle"
              :loading="buildsStatus === 'pending'"
              @click="limit += pageSize"
            />
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>
