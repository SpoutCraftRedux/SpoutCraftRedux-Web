export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const { load } = useAuth()
  if (await load()) return navigateTo(safeRedirect(to.query.redirect))
})
