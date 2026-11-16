# SpoutCraft Redux Docs

Source for [docs.spoutcraftredux.org](https://docs.spoutcraftredux.org), built with Nuxt UI and Nuxt Content.

Pages live in `content/`. Run commands from the workspace root:

```bash
pnpm --filter docs dev
pnpm --filter docs build
pnpm --filter docs lint
```

`nuxt build` outputs a Node server at `.output/server/index.mjs`. Set `NUXT_PUBLIC_SITE_URL` when building for another domain.
