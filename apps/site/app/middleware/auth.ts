export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const { load } = useAuth()
  const user = await load()
  if (!user) return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
})
