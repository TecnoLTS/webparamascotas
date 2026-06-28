#!/bin/sh
set -e

if [ -z "${INTERNAL_PROXY_TOKEN:-}" ] && [ -n "${INTERNAL_PROXY_TOKEN_FILE:-}" ] && [ -r "$INTERNAL_PROXY_TOKEN_FILE" ]; then
  INTERNAL_PROXY_TOKEN="$(cat "$INTERNAL_PROXY_TOKEN_FILE")"
  export INTERNAL_PROXY_TOKEN
fi

lock_hash_file="/app/node_modules/.package-lock.hash"
# Evita que falle si el hash previo o el lock no existen aún.
current_hash="$(sha1sum /app/package-lock.json 2>/dev/null | awk '{print $1}' || true)"
existing_hash="$(cat "$lock_hash_file" 2>/dev/null || true)"

dependencies_ready() {
  [ -x /app/node_modules/.bin/next ] \
    && [ -d /app/node_modules/tailwindcss ] \
    && [ -d /app/node_modules/@tailwindcss/postcss ]
}

# En runtimes estables, las dependencias deben venir preempaquetadas en la imagen.
if [ "$NODE_ENV" = "production" ] && [ "${FRONTEND_QA_RUNTIME:-stable}" = "stable" ]; then
  if ! dependencies_ready; then
    echo "Faltan dependencias de producción dentro de la imagen."
    exit 1
  fi
  if [ ! -f /app/.next/BUILD_ID ]; then
    echo "Falta el build de Next dentro de la imagen."
    exit 1
  fi
else
  # En desarrollo sí sincronizamos dependencias cuando cambia el lock o falta node_modules.
  if [ ! -d /app/node_modules ] \
    || [ -z "$(ls -A /app/node_modules 2>/dev/null)" ] \
    || ! dependencies_ready \
    || [ "$current_hash" != "$existing_hash" ]; then
  echo "Sincronizando dependencias (npm ci)..."
  mkdir -p /app/node_modules
  # Si el volumen impide borrar el directorio, limpiamos su contenido.
  rm -rf /app/node_modules/* /app/node_modules/.[!.]* /app/node_modules/..?* 2>/dev/null || true
  if ! npm ci; then
    echo "npm ci falló; intentando npm install para alinear package-lock.json..."
    rm -rf /app/node_modules/* /app/node_modules/.[!.]* /app/node_modules/..?* 2>/dev/null || true
    npm install
  fi
  echo "$current_hash" > "$lock_hash_file"
  fi
fi

if [ "$(id -u)" = "0" ]; then
  mkdir -p \
    /app/src/generated \
    /app/.next \
    /app/node_modules \
    /app/public/images/collection/home-top/generated \
    /app/public/images/slider/generated \
    /app/public/uploads \
    /app/public/uploads/products \
    /app/public/uploads/brands \
    /app/public/uploads/categories
  touch /app/next-env.d.ts /app/tsconfig.tsbuildinfo 2>/dev/null || true
  chown -R \
    appuser:app \
    /app/src/generated \
    /app/.next \
    /app/node_modules \
    /app/public/images/collection/home-top/generated \
    /app/public/images/slider/generated \
    /app/public/uploads \
    2>/dev/null || true
  chown appuser:app /app/next-env.d.ts /app/tsconfig.tsbuildinfo 2>/dev/null || true
  exec su-exec appuser:app "$@"
fi

exec "$@"
