export default defineNitroConfig({
  srcDir: 'server',
  compatibilityDate: '2026-06-30',
  runtimeConfig: {
    dataDir: './.data/builds',
    uploadToken: '',
    projects: 'spoutcraftredux-server,spoutcraftredux-fabric'
  },
  routeRules: {
    '/v2/**': { cors: true, headers: { 'cache-control': 'public, max-age=60' } }
  }
})
