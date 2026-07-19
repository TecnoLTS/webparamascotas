#!/bin/sh
set -e

if [ -z "${STOREFRONT_BACKEND_PROXY_TOKEN:-}" ]; then
  if [ -z "${STOREFRONT_BACKEND_PROXY_TOKEN_FILE:-}" ] || [ ! -r "$STOREFRONT_BACKEND_PROXY_TOKEN_FILE" ]; then
    echo "El secret scoped STOREFRONT_BACKEND_PROXY_TOKEN no es legible por el runtime." >&2
    exit 1
  fi
  STOREFRONT_BACKEND_PROXY_TOKEN="$(cat "$STOREFRONT_BACKEND_PROXY_TOKEN_FILE")"
fi

case "$STOREFRONT_BACKEND_PROXY_TOKEN" in
  ''|*[!A-Za-z0-9_-]*)
    echo "STOREFRONT_BACKEND_PROXY_TOKEN tiene un formato invalido." >&2
    exit 1
    ;;
esac
if [ "${#STOREFRONT_BACKEND_PROXY_TOKEN}" -lt 32 ] || [ "${#STOREFRONT_BACKEND_PROXY_TOKEN}" -gt 128 ]; then
  echo "STOREFRONT_BACKEND_PROXY_TOKEN debe tener entre 32 y 128 caracteres." >&2
  exit 1
fi
export STOREFRONT_BACKEND_PROXY_TOKEN

lower_value() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

validate_upload_storage_mode() {
  app_env="$(lower_value "${APP_ENV:-}")"
  require_ha="$(lower_value "${REQUIRE_HA:-}")"
  upload_mode="$(lower_value "${PRODUCT_IMAGE_UPLOAD_MODE:-}")"

  case "$app_env" in
    qa|production|prod) ;;
    *) echo "APP_ENV debe ser qa o production." >&2; exit 1 ;;
  esac

  case "$require_ha" in
    1|true|yes|on) ha_enabled=1 ;;
    0|false|no|off) ha_enabled=0 ;;
    *) echo "REQUIRE_HA debe ser booleano." >&2; exit 1 ;;
  esac
  case "$upload_mode" in
    local|backend-object-storage) ;;
    *) echo "PRODUCT_IMAGE_UPLOAD_MODE debe ser local o backend-object-storage." >&2; exit 1 ;;
  esac

  production=0
  if [ "$app_env" = "production" ] || [ "$app_env" = "prod" ]; then production=1; fi
  if [ "$production" -eq 1 ] && [ "$ha_enabled" -ne 1 ]; then
    echo "Frontend production exige REQUIRE_HA=true." >&2
    exit 1
  fi
  if { [ "$production" -eq 1 ] || [ "$ha_enabled" -eq 1 ]; } && [ "$upload_mode" != "backend-object-storage" ]; then
    echo "Produccion y REQUIRE_HA=true exigen PRODUCT_IMAGE_UPLOAD_MODE=backend-object-storage." >&2
    exit 1
  fi
  if [ "$upload_mode" = "local" ] && [ "$app_env" != "qa" ]; then
    echo "PRODUCT_IMAGE_UPLOAD_MODE=local solo esta permitido en APP_ENV=qa." >&2
    exit 1
  fi
  if [ "$upload_mode" = "backend-object-storage" ]; then
    case "${NEXT_PUBLIC_UPLOADS_BASE_URL:-}" in
      https://* ) ;;
      * ) echo "NEXT_PUBLIC_UPLOADS_BASE_URL HTTPS es obligatorio para backend-object-storage." >&2; exit 1 ;;
    esac
  fi
  dashboard_csrf_cookie_name="${DASHBOARD_AUTH_CSRF_COOKIE_NAME:-pm_csrf_dashboard}"
  case "$dashboard_csrf_cookie_name" in
    ""|[!A-Za-z0-9]*|*[!A-Za-z0-9_.-]*)
      echo "DASHBOARD_AUTH_CSRF_COOKIE_NAME debe ser un nombre valido terminado en _dashboard." >&2
      exit 1
      ;;
  esac
  case "$dashboard_csrf_cookie_name" in
    *_dashboard) ;;
    *)
      echo "DASHBOARD_AUTH_CSRF_COOKIE_NAME debe terminar en _dashboard." >&2
      exit 1
      ;;
  esac
  if [ "${#dashboard_csrf_cookie_name}" -gt 130 ]; then
    echo "DASHBOARD_AUTH_CSRF_COOKIE_NAME excede 130 caracteres." >&2
    exit 1
  fi
}

validate_upload_storage_mode

case "${FRONTEND_WORKERS:-4}" in
  ''|0|0*|*[!0-9]*)
    echo "FRONTEND_WORKERS debe ser un entero entre 1 y 16." >&2
    exit 1
    ;;
esac
if [ "${FRONTEND_WORKERS:-4}" -lt 1 ] || [ "${FRONTEND_WORKERS:-4}" -gt 16 ]; then
  echo "FRONTEND_WORKERS debe ser un entero entre 1 y 16." >&2
  exit 1
fi
export FRONTEND_WORKERS="${FRONTEND_WORKERS:-4}"

lock_hash_file="/app/node_modules/.package-lock.hash"
# Evita que falle si el hash previo o el lock no existen aún.
current_hash="$(sha1sum /app/package-lock.json 2>/dev/null | awk '{print $1}' || true)"
existing_hash="$(cat "$lock_hash_file" 2>/dev/null || true)"

dependencies_ready() {
  [ -x /app/node_modules/.bin/next ] \
    && [ -d /app/node_modules/tailwindcss ] \
    && [ -d /app/node_modules/@tailwindcss/postcss ]
}

standalone_bundle_ready() {
  [ -f /app/server.js ] && [ -f /app/cluster-server.cjs ] && [ -f /app/.next/BUILD_ID ]
}

# En runtimes estables, las dependencias deben venir preempaquetadas en la imagen.
if [ "$NODE_ENV" = "production" ] && [ "${FRONTEND_QA_RUNTIME:-stable}" = "stable" ]; then
  if ! standalone_bundle_ready; then
    echo "Falta el bundle standalone de Next dentro de la imagen."
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
