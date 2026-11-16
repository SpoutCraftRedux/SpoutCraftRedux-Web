<script setup lang="ts">
import { z } from 'zod'
import type { Form, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  colorMode: 'dark',
  middleware: 'guest'
})

useSeoMeta({ title: 'Create an account', robots: 'noindex' })

const route = useRoute()
const { register } = useAuth()

const schema = z.object({
  username: usernameSchema,
  email: z.union([z.literal(''), z.email('Enter a valid email address')]),
  password: passwordSchema,
  confirm: z.string()
}).refine(v => v.password === v.confirm, { path: ['confirm'], message: 'Passwords don\'t match' })
type Schema = z.output<typeof schema>

const form = useTemplateRef<Form<Schema>>('form')
const state = reactive({ username: '', email: '', password: '', confirm: '' })
const loading = ref(false)
const failure = ref<string | null>(null)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  failure.value = null
  try {
    await register({ username: event.data.username, password: event.data.password, email: event.data.email || undefined })
    await navigateTo(safeRedirect(route.query.redirect))
  } catch (error) {
    const err = apiError(error)
    const field = err.field ?? (err.status === 409 ? 'username' : undefined)
    if (field) form.value?.setErrors([{ name: field, message: err.message }])
    else failure.value = err.message
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
        title="Create an account"
        description="An account lets you list servers on the SpoutCraft Redux server list."
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
            help="3 to 24 letters, numbers or underscores."
          >
            <UInput
              v-model="state.username"
              autocomplete="username"
              autofocus
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Email"
            name="email"
            hint="Optional"
            help="Used to tell you when a listing is reviewed."
          >
            <UInput
              v-model="state.email"
              type="email"
              autocomplete="email"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Password"
            name="password"
            help="At least 10 characters."
          >
            <UInput
              v-model="state.password"
              type="password"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Confirm password"
            name="confirm"
          >
            <UInput
              v-model="state.confirm"
              type="password"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            label="Create account"
            block
            :loading="loading"
          />
        </UForm>
      </UCard>

      <p class="mt-6 text-center text-sm text-muted">
        Already have an account?
        <ULink
          :to="{ path: '/login', query: route.query.redirect ? { redirect: route.query.redirect } : {} }"
          class="font-medium text-primary hover:underline"
        >
          Sign in
        </ULink>
      </p>
    </UContainer>
  </div>
</template>
