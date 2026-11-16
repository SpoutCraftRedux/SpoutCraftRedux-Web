import type { FetchError } from 'ofetch'

export function useApi() {
  const { public: { apiBase } } = useRuntimeConfig()
  return $fetch.create({ baseURL: `${apiBase}/v1`, credentials: 'include' })
}

interface ApiErrorBody {
  statusCode?: number
  statusMessage?: string
  message?: string
  data?: { field?: string }
}

export function apiError(error: unknown) {
  const err = error as FetchError<ApiErrorBody> | null
  const status = err?.statusCode ?? err?.response?.status
  const body = err?.data
  const field = body?.data?.field
  let message = body?.message || body?.statusMessage
  if (status === 429) {
    const retry = err?.response?.headers.get('Retry-After')
    message = retry ? `Too many attempts. Try again in ${retry} seconds.` : 'Too many attempts. Try again shortly.'
  } else if (!status) {
    message = 'The SpoutCraft Redux API can\'t be reached. Try again in a moment.'
  }
  return { status, field, message: message || 'Something went wrong. Try again.' }
}
