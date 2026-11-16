FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/docs/package.json apps/docs/
RUN pnpm install --frozen-lockfile --filter docs... --ignore-scripts
COPY apps/docs apps/docs
RUN pnpm --filter docs exec nuxt prepare && pnpm --filter docs build

FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=::
COPY --from=build /app/apps/docs/.output ./
USER node
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "server/index.mjs"]
