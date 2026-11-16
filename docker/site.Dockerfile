FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/site/package.json apps/site/
RUN pnpm install --frozen-lockfile --filter site... --ignore-scripts
COPY apps/site apps/site
RUN pnpm --filter site exec nuxt prepare && pnpm --filter site build

FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=::
COPY --from=build /app/apps/site/.output ./
USER node
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "server/index.mjs"]
