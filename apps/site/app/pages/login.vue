<script setup lang="ts">
import { z } from 'zod'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  colorMode: 'dark',
  middleware: 'guest'
})

useSeoMeta({ title: 'Sign in', robots: 'noindex' })

const route = useRoute()
const { login } = useAuth()

const schema = z.object({
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password')
})
type Schema = z.output<typeof schema>

const form = useTemplateRef<Form<Schema>>('form')
const state = reactive({ username: '', password: '' })
const loading = ref(false)
const failure = ref<string | null>(null)
const showPassword = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  failure.value = null
  try {
    await login(event.data.username, event.data.password)
    await navigateTo(safeRedirect(route.query.redirect))
  } catch (error) {
    const err = apiError(error)
    if (err.field) form.value?.setErrors([{ name: err.field, message: err.message }])
    else failure.value = err.status === 401 ? 'Wrong username or password.' : err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="relative">
    <GradientGlow class="top-0 h-80 w-2/3" />

    <UContainer class="relative flex max-w-md flex-col py-16 sm:py-24">
      <UPageHeader
        headline="Account"
        title="Sign in"
        description="Sign in to manage your server listings and report problems."
        :ui="{
          root: 'border-none pt-0',
          headline: 'font-mono font-medium text-xs text-primary uppercase tracking-[0.12em]'
        }"
      />

      <UCard
        variant="subtle"
        class="mt-2"
      >
        <UForm
          ref="form"
          :schema="schema"
          :state="state"
          class="flex flex-col gap-4"
          @submit="onSubmit"
        >
          <UAlert
            v-if="failure"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="failure"
          />
          <UFormField
            label="Username"
            name="username"
          >
            <UInput
              v-model="state.username"
              autocomplete="username"
              autofocus
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Password"
            name="password"
          >
            <UInput
              v-model="state.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              class="w-full"
              :ui="{ trailing: 'pe-1' }"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  :aria-pressed="showPassword"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>
          <UButton
            type="submit"
            label="Sign in"
            block
            :loading="loading"
          />
        </UForm>
      </UCard>

      <p class="mt-6 text-center text-sm text-muted">
        No account yet?
        <ULink
          :to="{ path: '/register', query: route.query.redirect ? { redirect: route.query.redirect } : {} }"
          class="font-medium text-primary hover:underline"
        >
          Create one
        </ULink>
      </p>
    </UContainer>
  </div>
</template>
