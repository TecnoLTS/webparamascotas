#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

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
}

resolve_env_file() {
  local mode="${1:-development}"

  if [[ "${mode}" == "development" ]]; then
    local env_file="${APP_DIR}/.env.development"
    if [[ -f "${env_file}" ]]; then
      printf '%s\n' "${env_file}"
      return 0
    fi

    if [[ -f "${APP_DIR}/.env.example" ]]; then
      cp "${APP_DIR}/.env.example" "${env_file}"
      echo "Se creo ${env_file} desde .env.example. Ajusta token y URLs si hace falta."
      printf '%s\n' "${env_file}"
      return 0
    fi

    echo "No se encontro ${env_file} ni .env.example" >&2
    exit 1
  fi

  if [[ -f "${APP_DIR}/.env" ]]; then
    printf '%s\n' "${APP_DIR}/.env"
    return 0
  fi

  if [[ -f "${APP_DIR}/.env.example" ]]; then
    cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
    echo "Se creo ${APP_DIR}/.env desde .env.example. Ajusta valores de produccion antes de exponer."
    printf '%s\n' "${APP_DIR}/.env"
    return 0
  fi

  echo "No se encontro .env ni .env.example" >&2
  exit 1
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
  if [[ "${mode}" == "development" ]]; then
    unexpected_container="$(frontend_container_name production)"
  else
    unexpected_container="$(frontend_container_name development)"
  fi

  echo "Levantando Paramascotasec en ${mode} usando ${env_file}..."
  remove_container_if_exists "${unexpected_container}"

  if [[ "${mode}" == "development" ]]; then
    dev_runtime="$(read_env_value "${env_file}" "FRONTEND_DEV_RUNTIME")"
    dev_runtime="${dev_runtime:-hot}"
    if [[ "${dev_runtime}" == "stable" ]]; then
      echo "Precompilando frontend development/stable para evitar compilacion en caliente detras del gateway..."
      compose_cmd "${env_file}" "${mode}" run --rm --no-deps app-dev \
        sh -lc 'mkdir -p .next && rm -f .next/BUILD_ID && NODE_ENV=production npm run build'
    fi
  fi

  compose_cmd "${env_file}" "${mode}" up -d --build --remove-orphans
  assert_frontend_mode "${mode}"
  wait_for_container_health "$(frontend_container_name "${mode}")"
  compose_cmd "${env_file}" "${mode}" ps
  echo "Paramascotasec ${mode} listo"
}
