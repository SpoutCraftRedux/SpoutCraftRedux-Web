export default defineNitroConfig({
  srcDir: 'server',
  compatibilityDate: '2026-06-30',
  runtimeConfig: {
    dataDir: './.data/builds',
    mediaDir: './.data/media',
    databaseUrl: '',
    publicUrl: 'https://api.spoutcraftredux.org',
    // Staging and localhost origins come from NITRO_CORS_ORIGINS; `nitro dev` also allows http://localhost:3000
    corsOrigins: 'https://spoutcraftredux.org,https://www.spoutcraftredux.org',
    // Peers whose last X-Forwarded-For hop is trusted (Traefik on the Docker network); empty trusts none
    trustedProxies: '127.0.0.0/8,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,fc00::/7',
    // Comma-separated DNS servers for pings; empty uses the system resolver
    dnsServers: '',
    smtpUrl: '',
    siteUrl: 'https://spoutcraftredux.org',
    allowPrivateTargets: false,
    mailFrom: 'SpoutCraft Redux <noreply@spoutcraftredux.org>',
    uploadToken: '',
    projects: 'spoutcraftredux-server,spoutcraftredux-fabric'
  },
  experimental: {
    tasks: true
  },
  scheduledTasks: {
    '*/2 * * * *': ['servers:ping'],
    '17 * * * *': ['maintenance:prune']
  },
  routeRules: {
    '/v2/**': { cors: true, headers: { 'cache-control': 'public, max-age=60' } }
  }
})
