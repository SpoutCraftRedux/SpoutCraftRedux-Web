# SpoutCraft Redux Web

Website, documentation and downloads API for [SpoutCraft Redux](https://spoutcraftredux.org).

| App | Path | Production | Staging |
|---|---|---|---|
| Website (Nuxt UI) | `apps/site` | https://spoutcraftredux.org | https://staging.spoutcraftredux.org |
| Docs (Nuxt UI + Nuxt Content) | `apps/docs` | https://docs.spoutcraftredux.org | https://staging-docs.spoutcraftredux.org |
| Downloads API (Nitro) | `apps/api` | https://api.spoutcraftredux.org | https://staging-api.spoutcraftredux.org |
| Maven repository (Reposilite) | – | https://repo.spoutcraftredux.org | – |

## Development

Needs Node 24 and pnpm 10.

```sh
pnpm install
pnpm dev:site   # http://localhost:3000
pnpm dev:docs
pnpm dev:api
```

## Deployment

Each app is a Coolify application built from `docker/<app>.Dockerfile`.

- Push to `main` deploys production.
- Push to `staging` deploys staging.
- Coolify only rebuilds an app when files under its `apps/<app>` folder, its Dockerfile or `pnpm-lock.yaml` change.

## Downloads API

The API stores builds on a volume at `/data/builds/<project>/<version>/<build>/`. CI uploads builds with a bearer token (`NITRO_UPLOAD_TOKEN`):

```sh
curl -X POST https://api.spoutcraftredux.org/v2/spoutcraftredux-server/26.3 \
  -H "Authorization: Bearer $TOKEN" \
  -F file=@spoutcraftredux-paperclip-26.3.build.42-stable.jar \
  -F build=42 \
  -F 'commits=[{"author":"…","email":"…","description":"…","hash":"…","timestamp":"2026-11-16T00:00:00Z"}]'
```

Reference: https://api.spoutcraftredux.org/docs
