// Images only from this site, the API (listing media) and inline data/blob previews
export default defineEventHandler((event) => {
  const { public: { apiBase } } = useRuntimeConfig(event)
  const api = URL.canParse(apiBase) ? new URL(apiBase).origin : ''
  setResponseHeader(event, 'content-security-policy', `img-src 'self' ${api} data: blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'`)
})
