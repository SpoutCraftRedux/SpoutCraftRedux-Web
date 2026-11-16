const DEFAULT_TAGS: [string, string][] = [
  ['survival', 'Survival'], ['creative', 'Creative'], ['minigames', 'Minigames'], ['pvp', 'PvP'], ['factions', 'Factions'],
  ['skyblock', 'Skyblock'], ['roleplay', 'Roleplay'], ['economy', 'Economy'], ['towny', 'Towny'], ['prison', 'Prison'],
  ['adventure', 'Adventure'], ['vanilla', 'Vanilla'], ['modded', 'Modded'], ['anarchy', 'Anarchy'], ['smp', 'SMP']
]

// Fails fast without a database and seeds the default tags; migrations run before the server starts
export default defineNitroPlugin(() => {
  const db = useDb()
  db.orm.public.Tag.createAndCount(DEFAULT_TAGS.map(([slug, name]) => ({ slug, name })), { onConflict: 'skip' }).catch((err) => {
    console.error('Database setup failed; is NITRO_DATABASE_URL reachable and migrated?', err)
    process.exitCode = 1
  })
})
