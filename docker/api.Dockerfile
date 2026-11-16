FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter api... --ignore-scripts
COPY apps/api apps/api
RUN pnpm --filter api build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=:: NITRO_DATA_DIR=/data/builds
COPY --from=build /app/apps/api/.output ./
RUN mkdir -p /data/builds && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "server/index.mjs"]
