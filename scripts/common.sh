#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENTORNO_DIR="${APP_DIR}/entorno"
ENTORNO_ENV_FILE="${ENTORNO_DIR}/.env"
ENTORNO_SERVER_FILE="${ENTORNO_DIR}/servidor.env"
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

  if [[ ! -f "${ENTORNO_SERVER_FILE}" ]]; then
    if [[ ! -f "${TEMPLATE_ENTORNO_DIR}/servidor.env.example" ]]; then
      echo "No se encontro ${TEMPLATE_ENTORNO_DIR}/servidor.env.example" >&2
      exit 1
    fi
    cp "${TEMPLATE_ENTORNO_DIR}/servidor.env.example" "${ENTORNO_SERVER_FILE}"
    chmod 600 "${ENTORNO_SERVER_FILE}"
    echo "Se creo ${ENTORNO_SERVER_FILE} desde templates/entorno/servidor.env.example."
    created=1
  fi

  if [[ "${created}" == "1" ]]; then
    echo "Completa valores reales en entorno/.env y verifica ENTORNO_MODE en entorno/servidor.env antes de desplegar." >&2
    exit 1
  fi
}

assert_no_legacy_runtime_paths() {
  local env_name=".env"
  local suffix
  local found=()
  local path

  for suffix in "" ".development" ".production" ".local"; do
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
    printf 'Rutas legacy fuera de entorno/ detectadas en paramascotasec: %s\n' "${found[*]}" >&2
    printf 'Ejecuta scripts/migrate-entorno.sh o mueve esos archivos a un backup externo antes de desplegar.\n' >&2
    exit 1
  fi
}

assert_entorno_mode() {
  local expected="$1"
  local actual

  actual="$(read_env_value "${ENTORNO_SERVER_FILE}" "ENTORNO_MODE" || true)"
  actual="$(normalize_env_value "${actual}")"

  if [[ "${actual}" != "${expected}" ]]; then
    echo "ENTORNO_MODE=${actual:-<vacio>} en ${ENTORNO_SERVER_FILE}; esperado ${expected}." >&2
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
  local base_url

  base_url="$(read_env_value "${env_file}" "NEXT_PUBLIC_BASE_URL" || true)"
  base_url="$(normalize_env_value "${base_url}")"
  base_url="${base_url:-https://paramascotasec.com}"

  upsert_env_value "${env_file}" "NEXT_PUBLIC_BASE_URL" "${base_url%/}"
  upsert_env_value "${env_file}" "NEXT_PUBLIC_BACKEND_URL" "${base_url%/}/api"
  upsert_env_value "${env_file}" "BACKEND_URL_INTERNAL" "http://paramascotasec-backend-web:8080/api"
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

  if ! docker network inspect paramascotasec-web-internal >/dev/null 2>&1; then
    docker network create --internal paramascotasec-web-internal >/dev/null
  fi
}

resolve_env_file() {
  local mode="${1:-development}"

  if [[ "${mode}" != "development" && "${mode}" != "production" ]]; then
    echo "Modo invalido: ${mode}. Usa development o production." >&2
    exit 1
  fi

  assert_no_legacy_runtime_paths
  ensure_entorno_files
  assert_entorno_mode "${mode}"
  upsert_env_value "${ENTORNO_ENV_FILE}" "APP_ENV" "${mode}"
  upsert_env_value "${ENTORNO_ENV_FILE}" "COMPOSE_PROFILES" "${mode}"
  configure_frontend_public_urls "${ENTORNO_ENV_FILE}"
  printf '%s\n' "${ENTORNO_ENV_FILE}"
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
  local mode="${1:-development}"

  if [[ "${mode}" == "development" ]]; then
    printf '%s\n' "paramascotasec-app-dev"
    return 0
  fi

  printf '%s\n' "paramascotasec-app"
}

remove_container_if_exists() {
  local container_name="$1"

  if docker ps -a --format '{{.Names}}' | grep -qx "${container_name}"; then
    docker rm -f "${container_name}" >/dev/null
  fi
}

assert_frontend_mode() {
  local mode="${1:-development}"
  local expected_container unexpected_container

  expected_container="$(frontend_container_name "${mode}")"
  if [[ "${mode}" == "development" ]]; then
    unexpected_container="$(frontend_container_name production)"
  else
    unexpected_container="$(frontend_container_name development)"
  fi

  if ! docker ps --format '{{.Names}}' | grep -qx "${expected_container}"; then
    echo "No quedo levantado el contenedor esperado para ${mode}: ${expected_container}" >&2
    exit 1
  fi

  if docker ps --format '{{.Names}}' | grep -qx "${unexpected_container}"; then
    echo "Quedo levantado el contenedor del otro entorno (${unexpected_container}) despues del deploy ${mode}" >&2
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
  local mode="${1:-development}"
  local env_file unexpected_container dev_runtime

  ensure_docker_ready
  env_file="$(resolve_env_file "${mode}")"
  prepare_frontend_secrets "${env_file}"
  prepare_frontend_uploads
  if [[ "${mode}" == "development" ]]; then
    unexpected_container="$(frontend_container_name production)"
  else
    unexpected_container="$(frontend_container_name development)"
  fi

  echo "Levantando Paramascotasec en ${mode} usando ${env_file}..."
  remove_container_if_exists "${unexpected_container}"

  if [[ "${mode}" == "development" ]]; then
    dev_runtime="$(read_env_value "${env_file}" "FRONTEND_DEV_RUNTIME")"
    dev_runtime="${dev_runtime:-stable}"
    if [[ "${dev_runtime}" != "stable" ]]; then
      echo "FRONTEND_DEV_RUNTIME=${dev_runtime} no es valido para deploy development detras del gateway." >&2
      echo "Usa FRONTEND_DEV_RUNTIME=stable para mantener CSP estricta igual que production." >&2
      exit 1
    fi
    compose_cmd "${env_file}" "${mode}" build app-dev
    echo "Precompilando frontend development/stable con CSP estricta detras del gateway..."
    compose_cmd "${env_file}" "${mode}" run --rm --no-deps app-dev \
      sh -lc 'mkdir -p .next && rm -f .next/BUILD_ID && NODE_ENV=production npm run build'
  fi

  compose_cmd "${env_file}" "${mode}" up -d --build --remove-orphans
  assert_frontend_mode "${mode}"
  wait_for_container_health "$(frontend_container_name "${mode}")"
  compose_cmd "${env_file}" "${mode}" ps
  echo "Paramascotasec ${mode} listo"
}
