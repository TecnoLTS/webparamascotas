#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKSPACE_ENV_MODE="${APP_DIR}/../scripts/env-mode.sh"
# shellcheck disable=SC1090
source "${WORKSPACE_ENV_MODE}"
ENTORNO_DIR="${APP_DIR}/entorno"
ENTORNO_ENV_FILE="${ENTORNO_DIR}/.env"
TEMPLATE_ENTORNO_DIR="${APP_DIR}/templates/entorno"

read_env_value() {
  local env_file="$1"
  local key="$2"

  awk -F= -v target="${key}" '
    $1 == target {
      sub(/^[[:space:]]+/, "", $2)
      sub(/[[:space:]]+$/, "", $2)
      print $2
      exit
    }
  ' "${env_file}"
}

normalize_env_value() {
  local value="$1"

  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  value="${value%$'\r'}"

  if [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "${value}" == \'*\' && "${value}" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf '%s' "${value}"
}

ensure_entorno_files() {
  local created=0

  mkdir -p "${ENTORNO_DIR}"

  if [[ ! -f "${ENTORNO_ENV_FILE}" ]]; then
    if [[ ! -f "${TEMPLATE_ENTORNO_DIR}/.env.example" ]]; then
      echo "No se encontro ${TEMPLATE_ENTORNO_DIR}/.env.example" >&2
      exit 1
    fi
    cp "${TEMPLATE_ENTORNO_DIR}/.env.example" "${ENTORNO_ENV_FILE}"
    chmod 600 "${ENTORNO_ENV_FILE}"
    echo "Se creo ${ENTORNO_ENV_FILE} desde templates/entorno/.env.example."
    created=1
  fi

  if [[ "${created}" == "1" ]]; then
    echo "Completa valores reales y ENTORNO_MODE en entorno/.env antes de desplegar." >&2
    exit 1
  fi
}

assert_no_legacy_runtime_paths() {
  local env_name=".env"
  local suffix
  local found=()
  local path

  for suffix in "" ".production" ".local"; do
    path="${APP_DIR}/${env_name}${suffix}"
    if [[ -e "${path}" ]]; then
      found+=("${path#${APP_DIR}/}")
    fi
  done

  path="${APP_DIR}/.secrets"
  if [[ -e "${path}" ]]; then
    found+=("${path#${APP_DIR}/}")
  fi

  if (( ${#found[@]} > 0 )); then
    printf 'Rutas legacy fuera de entorno/ detectadas en webparamascotas: %s\n' "${found[*]}" >&2
    printf 'Mueve esos archivos a un backup externo antes de desplegar.\n' >&2
    exit 1
  fi
}

assert_entorno_mode() {
  local expected="$1"
  local actual expected_canonical actual_canonical

  actual="$(read_env_value "${ENTORNO_ENV_FILE}" "ENTORNO_MODE" || true)"
  actual="$(normalize_env_value "${actual}")"
  expected_canonical="$(canonical_env_mode "${expected}")"
  actual_canonical="$(canonical_env_mode "${actual}" 2>/dev/null || true)"

  if [[ "${actual_canonical}" != "${expected_canonical}" ]]; then
    echo "ENTORNO_MODE=${actual:-<vacio>} en ${ENTORNO_ENV_FILE}; esperado ${expected}." >&2
    exit 1
  fi
}

upsert_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"

  python3 - "$file" "$key" "$value" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]
lines = path.read_text().splitlines()
for index, line in enumerate(lines):
    if line.startswith(f"{key}="):
        lines[index] = f"{key}={value}"
        break
else:
    lines.append(f"{key}={value}")
path.write_text("\n".join(lines) + "\n")
PY
}

configure_frontend_public_urls() {
  local env_file="$1"
  local base_url tenant_slug api_segment api_base_path site_domain site_aliases local_ips gateway_env gateway_scheme

  gateway_env="${APP_DIR}/../gatewayapisix/entorno/.env"
  site_domain="$(normalize_env_value "$(read_env_value "${env_file}" "SITE_DOMAIN" || true)")"
  site_domain="${site_domain:-paramascotasec.com}"
  site_aliases="$(normalize_env_value "$(read_env_value "${env_file}" "SITE_ALIASES" || true)")"
  site_aliases="${site_aliases:-$(normalize_env_value "$(read_env_value "${env_file}" "SITE_WWW_DOMAIN" || true)")}"
  site_aliases="${site_aliases:-www.${site_domain}}"
  local_ips="$(normalize_env_value "$(read_env_value "${env_file}" "SITE_LOCAL_IPS" || true)")"
  if [[ -f "${gateway_env}" ]]; then
    site_domain="$(normalize_env_value "$(read_env_value "${gateway_env}" "PRIMARY_SITE_DOMAIN" || true)")"
    site_domain="${site_domain:-paramascotasec.com}"
    site_aliases="$(normalize_env_value "$(read_env_value "${gateway_env}" "PRIMARY_SITE_ALIASES" || true)")"
    site_aliases="${site_aliases:-www.${site_domain}}"
    local_ips="$(normalize_env_value "$(read_env_value "${gateway_env}" "PRIMARY_SITE_LOCAL_IPS" || true)")"
    gateway_scheme="$(normalize_env_value "$(read_env_value "${gateway_env}" "PUBLIC_SCHEME" || true)")"
  fi
  base_url="$(read_env_value "${env_file}" "NEXT_PUBLIC_BASE_URL" || true)"
  base_url="$(normalize_env_value "${base_url}")"
  base_url="${base_url:-${gateway_scheme:-https}://${site_domain}}"
  tenant_slug="$(normalize_env_value "$(read_env_value "${env_file}" "NEXT_PUBLIC_TENANT_SLUG" || true)")"
  tenant_slug="${tenant_slug:-paramascotasec}"
  api_segment="$(normalize_env_value "$(read_env_value "${env_file}" "NEXT_PUBLIC_API_SERVICE_SEGMENT" || true)")"
  api_segment="${api_segment:-api}"
  if [[ -f "${gateway_env}" ]]; then
    tenant_slug="$(normalize_env_value "$(read_env_value "${gateway_env}" "PUBLIC_TENANT_SLUG" || true)")"
    tenant_slug="${tenant_slug:-paramascotasec}"
    api_segment="$(normalize_env_value "$(read_env_value "${gateway_env}" "PUBLIC_API_SERVICE_SEGMENT" || true)")"
    api_segment="${api_segment:-api}"
    base_url="${gateway_scheme:-https}://${site_domain}"
  fi
  api_base_path="/${tenant_slug#/}/${api_segment#/}"
  api_base_path="${api_base_path%/}"

  upsert_env_value "${env_file}" "NEXT_PUBLIC_SITE_DOMAIN" "${site_domain}"
  upsert_env_value "${env_file}" "NEXT_PUBLIC_SITE_ALIASES" "${site_aliases}"
  upsert_env_value "${env_file}" "NEXT_PUBLIC_SITE_LOCAL_IPS" "${local_ips}"
  upsert_env_value "${env_file}" "NEXT_PUBLIC_TENANT_SLUG" "${tenant_slug}"
  upsert_env_value "${env_file}" "NEXT_PUBLIC_API_SERVICE_SEGMENT" "${api_segment}"
  upsert_env_value "${env_file}" "NEXT_PUBLIC_API_BASE_PATH" "${api_base_path}"
  upsert_env_value "${env_file}" "NEXT_PUBLIC_BASE_URL" "${base_url%/}"
  upsert_env_value "${env_file}" "NEXT_PUBLIC_BACKEND_URL" "${base_url%/}${api_base_path}"
  upsert_env_value "${env_file}" "BACKEND_URL_INTERNAL" "http://backend-http:8080/api"
}

prepare_frontend_secrets() {
  local env_file="$1"
  local token secret_dir secret_file

  token="$(normalize_env_value "$(read_env_value "${env_file}" "INTERNAL_PROXY_TOKEN")")"
  if [[ -z "${token}" || "${token}" == "replace-with-shared-internal-proxy-token" ]]; then
    echo "INTERNAL_PROXY_TOKEN no esta configurado en ${env_file}" >&2
    exit 1
  fi

  secret_dir="${ENTORNO_DIR}/.secrets"
  secret_file="${secret_dir}/internal_proxy_token"
  mkdir -p "${secret_dir}"
  chmod 700 "${secret_dir}"
  umask 077
  printf '%s' "${token}" > "${secret_file}"
  chmod 600 "${secret_file}"
}

prepare_frontend_uploads() {
  local upload_root="${APP_DIR}/app/public/uploads"
  local upload_owner="10001:10001"

  mkdir -p \
    "${upload_root}" \
    "${upload_root}/products" \
    "${upload_root}/brands" \
    "${upload_root}/categories"

  if ! chown -R "${upload_owner}" "${upload_root}" 2>/dev/null; then
    echo "No se pudo asignar ${upload_root} a ${upload_owner}." >&2
    echo "Ejecuta: sudo chown -R ${upload_owner} ${upload_root}" >&2
    exit 1
  fi

  chmod -R u+rwX,g+rX,o+rX "${upload_root}"
}

ensure_docker_ready() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker no esta instalado"
    exit 1
  fi

  if ! docker compose version >/dev/null 2>&1; then
    echo "docker compose no esta disponible"
    exit 1
  fi

  if ! docker network inspect edge >/dev/null 2>&1; then
    docker network create edge >/dev/null
  fi

  if ! docker network inspect webparamascotas-internal >/dev/null 2>&1; then
    docker network create --internal webparamascotas-internal >/dev/null
  fi
}

resolve_env_file() {
  local mode="${1:-qa}"

  if ! mode="$(canonical_env_mode "${mode}")"; then
    echo "Modo invalido: ${mode}. Usa qa o production." >&2
    exit 1
  fi

  assert_no_legacy_runtime_paths
  ensure_entorno_files
  assert_entorno_mode "${mode}"
  validate_frontend_env_for_mode "${mode}" "${ENTORNO_ENV_FILE}"
  configure_frontend_public_urls "${ENTORNO_ENV_FILE}"
  printf '%s\n' "${ENTORNO_ENV_FILE}"
}

validate_frontend_env_for_mode() {
  local mode="$1"
  local env_file="$2"
  local app_env profile runtime

  app_env="$(normalize_env_value "$(read_env_value "${env_file}" "APP_ENV" || true)")"
  profile="$(frontend_profile_from_env "${env_file}")"
  runtime="$(normalize_env_value "$(read_env_value "${env_file}" "FRONTEND_QA_RUNTIME" || true)")"
  runtime="${runtime:-stable}"

  case "${mode}" in
    qa)
      if [[ "${app_env}" != "qa" ]]; then
        echo "APP_ENV=${app_env:-<vacio>} no es valido para QA; usa qa." >&2
        exit 1
      fi
      if [[ "${profile}" != "qa" && "${profile}" != "production" ]]; then
        echo "COMPOSE_PROFILES=${profile:-<vacio>} no es valido; usa qa o production." >&2
        exit 1
      fi
      ;;
    production)
      if [[ ! "${app_env}" =~ ^(production|prod)$ ]]; then
        echo "APP_ENV=${app_env:-<vacio>} no es valido para production; usa production." >&2
        exit 1
      fi
      if [[ "${profile}" != "production" ]]; then
        echo "COMPOSE_PROFILES=${profile:-<vacio>} no es valido para production; usa production." >&2
        exit 1
      fi
      ;;
  esac

  if [[ "${profile}" == "qa" && "${runtime}" != "stable" ]]; then
    echo "FRONTEND_QA_RUNTIME=${runtime} no es valido para deploy detras del gateway; usa stable." >&2
    exit 1
  fi
}

frontend_profile_from_env() {
  local env_file="$1"
  local profile
  profile="$(normalize_env_value "$(read_env_value "${env_file}" "COMPOSE_PROFILES" || true)")"
  printf '%s\n' "${profile:-production}"
}

compose_cmd() {
  local env_file="$1"
  local profile="$2"
  shift 2

  (
    cd "${APP_DIR}"
    docker compose --env-file "${env_file}" --profile "${profile}" "$@"
  )
}

frontend_container_name() {
  printf '%s\n' "webparamascotas"
}

frontend_service_name() {
  local profile="${1:-production}"

  if [[ "${profile}" == "qa" ]]; then
    printf '%s\n' "runtime"
    return 0
  fi

  printf '%s\n' "app"
}

remove_container_if_exists() {
  local container_name="$1"

  if docker ps -a --format '{{.Names}}' | grep -qx "${container_name}"; then
    docker rm -f "${container_name}" >/dev/null
  fi
}

assert_frontend_mode() {
  local env_file="$1"
  local profile expected_container expected_app_env container_app_env

  profile="$(frontend_profile_from_env "${env_file}")"
  expected_container="$(frontend_container_name "${profile}")"

  if ! docker ps --format '{{.Names}}' | grep -qx "${expected_container}"; then
    echo "No quedo levantado el contenedor frontend esperado: ${expected_container}" >&2
    exit 1
  fi

  expected_app_env="$(normalize_env_value "$(read_env_value "${env_file}" "APP_ENV" || true)")"
  container_app_env="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "${expected_container}" 2>/dev/null | awk -F= '/^APP_ENV=/{print $2; exit}')"
  if [[ "${container_app_env}" != "${expected_app_env}" ]]; then
    echo "El frontend quedo con APP_ENV=${container_app_env:-desconocido}, esperado ${expected_app_env:-<vacio>}" >&2
    exit 1
  fi
}

wait_for_container_health() {
  local container_name="$1"
  local max_attempts="${2:-240}"
  local attempt=1
  local status

  while (( attempt <= max_attempts )); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${container_name}" 2>/dev/null || true)"

    if [[ "${status}" == "healthy" || "${status}" == "none" ]]; then
      return 0
    fi

    if [[ "${status}" == "unhealthy" ]]; then
      echo "El contenedor ${container_name} quedo unhealthy" >&2
      docker logs --tail 80 "${container_name}" >&2 || true
      exit 1
    fi

    sleep 2
    ((attempt++))
  done

  echo "El contenedor ${container_name} no quedo listo a tiempo" >&2
  docker logs --tail 80 "${container_name}" >&2 || true
  exit 1
}

deploy_frontend() {
  local mode="${1:-qa}"
  local env_file profile service

  ensure_docker_ready
  env_file="$(resolve_env_file "${mode}")"
  profile="$(frontend_profile_from_env "${env_file}")"
  service="$(frontend_service_name "${profile}")"
  prepare_frontend_secrets "${env_file}"
  prepare_frontend_uploads

  echo "Levantando webparamascotas (${mode}, perfil ${profile}) usando ${env_file}..."
  for legacy_container in paramascotasec-app paramascotasec-app-qa paramascotasec-app-dev; do
    remove_container_if_exists "${legacy_container}"
  done

  if [[ "${profile}" == "qa" ]]; then
    local runtime
    runtime="$(read_env_value "${env_file}" "FRONTEND_QA_RUNTIME")"
    runtime="${runtime:-stable}"
    if [[ "${runtime}" != "stable" ]]; then
      echo "FRONTEND_QA_RUNTIME=${runtime} no es valido para deploy QA detras del gateway." >&2
      echo "Usa FRONTEND_QA_RUNTIME=stable para mantener CSP estricta igual que production." >&2
      exit 1
    fi
  fi

  compose_cmd "${env_file}" "${profile}" up -d --build --remove-orphans
  assert_frontend_mode "${env_file}"
  wait_for_container_health "$(frontend_container_name "${profile}")"
  compose_cmd "${env_file}" "${profile}" ps
  echo "webparamascotas (${mode}) listo"
}
