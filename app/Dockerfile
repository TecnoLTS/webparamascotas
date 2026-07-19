# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS base

ENV TZ=America/Guayaquil \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S -g 10001 app && \
    adduser -S -D -H -u 10001 -G app appuser && \
    npm install -g npm@11.16.0 --no-audit --no-fund && \
    apk add --no-cache tzdata su-exec && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

FROM base AS dev

ARG APP_ENV
ENV APP_ENV=${APP_ENV} \
    NODE_ENV=development

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

FROM base AS deps

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM base AS builder

ARG APP_ENV
ARG NEXT_PUBLIC_BASE_URL=
ARG NEXT_PUBLIC_BACKEND_URL=
ARG NEXT_PUBLIC_SITE_DOMAIN=
ARG NEXT_PUBLIC_SITE_ALIASES=
ARG NEXT_PUBLIC_SITE_LOCAL_IPS=
ARG NEXT_PUBLIC_TENANT_SLUG=
ARG NEXT_PUBLIC_API_SERVICE_SEGMENT=
ARG NEXT_PUBLIC_API_BASE_PATH=
ARG NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME=pm_csrf_ecommerce
ARG NEXT_PUBLIC_UPLOADS_BASE_URL=
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

ENV APP_ENV=${APP_ENV} \
    NODE_ENV=production \
    NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL} \
    NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL} \
    NEXT_PUBLIC_SITE_DOMAIN=${NEXT_PUBLIC_SITE_DOMAIN} \
    NEXT_PUBLIC_SITE_ALIASES=${NEXT_PUBLIC_SITE_ALIASES} \
    NEXT_PUBLIC_SITE_LOCAL_IPS=${NEXT_PUBLIC_SITE_LOCAL_IPS} \
    NEXT_PUBLIC_TENANT_SLUG=${NEXT_PUBLIC_TENANT_SLUG} \
    NEXT_PUBLIC_API_SERVICE_SEGMENT=${NEXT_PUBLIC_API_SERVICE_SEGMENT} \
    NEXT_PUBLIC_API_BASE_PATH=${NEXT_PUBLIC_API_BASE_PATH} \
    NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME=${NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME} \
    NEXT_PUBLIC_UPLOADS_BASE_URL=${NEXT_PUBLIC_UPLOADS_BASE_URL} \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

FROM base AS runner

ARG APP_ENV
ENV APP_ENV=${APP_ENV} \
    NODE_ENV=production \
    PORT=3000

COPY --from=builder --chown=10001:10001 /app/package*.json ./
COPY --from=builder --chown=10001:10001 /app/public ./public
COPY --from=builder --chown=10001:10001 /app/.next/standalone ./
COPY --from=builder --chown=10001:10001 /app/.next/static ./.next/static
COPY --from=builder --chown=10001:10001 /app/cluster-server.cjs ./cluster-server.cjs
COPY --from=builder --chown=10001:10001 /app/scripts/check-cluster-process-tree.sh ./check-cluster-process-tree.sh
COPY --chown=root:root docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod 755 /usr/local/bin/docker-entrypoint.sh /app/check-cluster-process-tree.sh && \
    mkdir -p /app/public/uploads /app/.next/cache && \
    chown -R 10001:10001 /app/public/uploads /app/.next/cache

USER appuser

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "cluster-server.cjs"]
