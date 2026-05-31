# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS base

ENV TZ=America/Guayaquil \
    NEXT_TELEMETRY_DISABLED=1

RUN npm install -g npm@11.16.0 --no-audit --no-fund && \
    apk add --no-cache tzdata && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

FROM base AS dev

ENV APP_ENV=development \
    NODE_ENV=development

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

FROM base AS deps

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM base AS builder

ARG NEXT_PUBLIC_BASE_URL=
ARG NEXT_PUBLIC_BACKEND_URL=
ARG NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME=pm_csrf
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

ENV APP_ENV=production \
    NODE_ENV=production \
    NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL} \
    NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL} \
    NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME=${NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME} \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN --mount=type=cache,target=/app/.next/cache \
    npm run build && \
    npm prune --omit=dev --ignore-scripts

FROM base AS runner

ENV APP_ENV=production \
    NODE_ENV=production \
    PORT=3000

RUN addgroup -S -g 10001 app && \
    adduser -S -D -H -u 10001 -G app appuser

COPY --from=builder --chown=10001:10001 /app/package*.json ./
COPY --from=builder --chown=10001:10001 /app/next.config.js ./next.config.js
COPY --from=builder --chown=10001:10001 /app/public ./public
COPY --from=builder --chown=10001:10001 /app/.next ./.next
COPY --from=builder --chown=10001:10001 /app/node_modules ./node_modules
COPY --chown=root:root docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod 755 /usr/local/bin/docker-entrypoint.sh && \
    mkdir -p /app/public/uploads /app/.next/cache && \
    chown -R 10001:10001 /app

USER appuser

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node_modules/.bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
