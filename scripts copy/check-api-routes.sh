#!/usr/bin/env bash
set -euo pipefail

HOST_HEADER="${2:-paramascotasec.com}"
BASE_URL="${1:-https://${HOST_HEADER}}"
USE_LOCAL_GATEWAY="${USE_LOCAL_GATEWAY:-}"
GATEWAY_ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/gatewayapisix/entorno/.env"
if [[ $# -eq 0 ]]; then
  USE_LOCAL_GATEWAY=1
fi

read_env_value() {
  local key="$1" line value
  [[ -f "${GATEWAY_ENV_FILE}" ]] || return 0
  line="$(awk -v key="${key}" -F= '$0 !~ /^[[:space:]]*#/ && $1 == key { print; exit }' "${GATEWAY_ENV_FILE}" 2>/dev/null || true)"
  [[ -n "${line}" ]] || return 0
  value="${line#*=}"
  value="${value%$'\r'}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "${value}"
}

TENANT_SLUG="${API_TENANT_SLUG:-$(read_env_value PUBLIC_TENANT_SLUG)}"
TENANT_SLUG="${TENANT_SLUG:-paramascotasec}"
API_SEGMENT="${API_SERVICE_SEGMENT:-$(read_env_value PUBLIC_API_SERVICE_SEGMENT)}"
API_SEGMENT="${API_SEGMENT:-api}"
API_PREFIX="${API_PREFIX:-/${TENANT_SLUG}/${API_SEGMENT}}"
LOCAL_GATEWAY_IP="${GATEWAY_RESOLVE_IP:-$(read_env_value GATEWAY_BIND_IP)}"
LOCAL_GATEWAY_IP="${LOCAL_GATEWAY_IP:-127.0.0.1}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

REQUEST_HEADERS=(
  -H "Host: ${HOST_HEADER}"
  -H "Accept: application/json"
)

request_status() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local output_file="$TMP_DIR/response.json"

  local curl_args=(
    -sS
    -o "$output_file"
    -w '%{http_code}'
    -X "$method"
    "${REQUEST_HEADERS[@]}"
  )

  if [[ "${USE_LOCAL_GATEWAY}" == "1" ]]; then
    curl_args+=(
      -k
      --resolve "${HOST_HEADER}:443:${LOCAL_GATEWAY_IP}"
    )
  fi

  if [[ -n "$body" ]]; then
    curl_args+=(
      -H 'Content-Type: application/json'
      --data "$body"
    )
  fi

  curl_args+=("${BASE_URL}${path}")
  curl "${curl_args[@]}"
}

api_path() {
  local path="$1"
  printf '%s%s' "${API_PREFIX%/}" "${path#/api}"
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL ${label}: expected ${expected}, got ${actual}" >&2
    return 1
  fi
  echo "OK   ${label}: ${actual}"
}

echo "Checking Paramascotas API route matrix against ${BASE_URL}${API_PREFIX} (Host: ${HOST_HEADER})"

health_status="$(request_status GET "$(api_path /api/health)")"
assert_status "$health_status" "200" "GET ${API_PREFIX}/health"

store_status="$(request_status GET "$(api_path /api/settings/store-status)")"
assert_status "$store_status" "200" "GET ${API_PREFIX}/settings/store-status"

shipping_status="$(request_status GET "$(api_path /api/settings/shipping)")"
assert_status "$shipping_status" "200" "GET ${API_PREFIX}/settings/shipping"

products_status="$(request_status GET "$(api_path /api/products)")"
assert_status "$products_status" "200" "GET ${API_PREFIX}/products"

product_id="$(
  php -r '
    $raw = @file_get_contents($argv[1]);
    if ($raw === false) { exit(1); }
    $data = json_decode($raw, true);
    $items = $data;
    if (is_array($data) && array_key_exists("data", $data)) {
        $items = $data["data"];
    }
    if (!is_array($items) || !isset($items[0]["id"])) { exit(2); }
    echo $items[0]["id"];
  ' "$TMP_DIR/response.json"
)"

product_show_status="$(request_status GET "$(api_path "/api/products/${product_id}")")"
assert_status "$product_show_status" "200" "GET ${API_PREFIX}/products/{id}"

admin_users_status="$(request_status GET "$(api_path /api/users)")"
assert_status "$admin_users_status" "401" "GET ${API_PREFIX}/users without auth"

admin_tax_status="$(request_status GET "$(api_path /api/admin/settings/tax)")"
assert_status "$admin_tax_status" "401" "GET ${API_PREFIX}/admin/settings/tax without auth"

product_update_status="$(request_status PUT "$(api_path "/api/products/${product_id}")" '{"published":false}')"
assert_status "$product_update_status" "401" "PUT ${API_PREFIX}/products/{id} without auth"

order_quote_status="$(request_status POST "$(api_path /api/orders/quote)" '{"items":[],"shippingCost":0}')"
if [[ "$order_quote_status" != "200" && "$order_quote_status" != "400" ]]; then
  echo "FAIL POST ${API_PREFIX}/orders/quote public access: expected 200 or 400, got ${order_quote_status}" >&2
  exit 1
fi
echo "OK   POST ${API_PREFIX}/orders/quote public access: ${order_quote_status}"

echo "Route audit completed successfully."
