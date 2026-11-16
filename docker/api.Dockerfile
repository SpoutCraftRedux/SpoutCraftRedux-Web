FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter api...
COPY apps/api apps/api
RUN pnpm --filter api build

# Prisma CLI for `db migrate`, at the versions apps/api pins
FROM node:24-alpine AS migrate
WORKDIR /migrate
COPY apps/api/package.json /tmp/api.json
RUN node -e "const p=require('/tmp/api.json'),d={...p.dependencies,...p.devDependencies},n=['prisma','@prisma/orm-postgres','temporal-polyfill'];require('fs').writeFileSync('package.json',JSON.stringify({private:true,type:'module',dependencies:Object.fromEntries(n.map(k=>[k,d[k]]))}))" \
 && npm install --omit=dev --ignore-scripts --no-audit --no-fund \
 && rm -rf node_modules/effect node_modules/alchemy node_modules/rolldown node_modules/@rolldown node_modules/@prisma/composer \
 && npm cache clean --force

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=:: NITRO_DATA_DIR=/data/builds NITRO_MEDIA_DIR=/data/media \
    DO_NOT_TRACK=1 PRISMA_DISABLE_TELEMETRY=1 NO_UPDATE_NOTIFIER=1 UV_THREADPOOL_SIZE=8
COPY --from=build /app/apps/api/.output ./
COPY --from=migrate /migrate/node_modules ./migrate/node_modules
COPY apps/api/prisma.config.ts ./migrate/
COPY apps/api/prisma ./migrate/prisma
COPY apps/api/scripts ./migrate/scripts
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint
RUN mkdir -p /data/builds /data/media && chown -R node:node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
ENTRYPOINT ["api-entrypoint"]
CMD ["node", "server/index.mjs"]
