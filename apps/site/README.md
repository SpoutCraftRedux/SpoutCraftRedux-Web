# SpoutCraft Redux website

Source for [spoutcraftredux.org](https://spoutcraftredux.org), built with Nuxt and Nuxt UI.

Run commands from the `web/` workspace root:

```bash
pnpm --filter site dev     # http://localhost:3000
pnpm --filter site build   # Node server in apps/site/.output
pnpm --filter site lint
```

Landing page copy lives in `content/index.yml`. The downloads page reads from the downloads API, set with `NUXT_PUBLIC_API_BASE` (default `https://api.spoutcraftredux.org`).

Start the built server with `node .output/server/index.mjs`.
