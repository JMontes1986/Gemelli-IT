#!/usr/bin/env bash
set -euo pipefail

# Script de smoke test para validar rápidamente el backend de inventario.
# Usa API_URL y ACCESS_TOKEN (token de Supabase) disponibles en el entorno.

ENV_FILE="${ENV_FILE:-.env}"
API_URL="${API_URL:-${PUBLIC_API_URL:-http://localhost:8000}}"
ACCESS_TOKEN="${ACCESS_TOKEN:-}" 
DEVICE_ID="${DEVICE_ID:-}" 
ALLOW_MUTATIONS="${ALLOW_MUTATIONS:-false}"
TEST_DEVICE_NAME="${TEST_DEVICE_NAME:-Laptop QA Smoke}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[ERROR] Falta el comando '$1'. Instálalo y vuelve a intentar." >&2
    exit 1
  fi
}

load_env_if_present() {
  if [ -f "$ENV_FILE" ]; then
    while IFS= read -r line; do
      [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
      export "$line"
    done < "$ENV_FILE"
  fi
}

format_url() {
  local base="$1"
  local path="$2"
  base="${base%%/}"
  printf "%s%s" "$base" "$path"
}

call_api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  local url
  url=$(format_url "$API_URL" "$path")
  local tmp
  tmp=$(mktemp)
  local http_code

  if [ -n "$ACCESS_TOKEN" ]; then
    auth_header=("-H" "Authorization: Bearer $ACCESS_TOKEN")
  else
    auth_header=()
  fi

  if [ -n "$data" ]; then
    http_code=$(curl -sS -w '%{http_code}' -o "$tmp" -X "$method" "$url" \
      -H 'Content-Type: application/json' "${auth_header[@]}" -d "$data")
  else
    http_code=$(curl -sS -w '%{http_code}' -o "$tmp" -X "$method" "$url" "${auth_header[@]}")
  fi

  body=$(cat "$tmp")
  rm -f "$tmp"
  echo "$http_code"
}

check_health() {
  echo "[1/3] Revisando salud del backend en $API_URL/health"
  local code
  code=$(call_api GET "/health")
  if [ "$code" != "200" ]; then
    echo "[ERROR] Healthcheck devolvió $code" >&2
    echo "$body"
    exit 1
  fi
  echo "[OK] Healthcheck respondió 200"
}

check_inventory_list() {
  echo "[2/3] Listando dispositivos"
  local code
  code=$(call_api GET "/inventory/devices")
  if [ "$code" != "200" ]; then
    echo "[ERROR] /inventory/devices devolvió $code" >&2
    echo "$body"
    exit 1
  fi
  echo "[OK] Inventario accesible (status 200)"
}

check_device_cv() {
  if [ -z "$DEVICE_ID" ]; then
    echo "[INFO] DEVICE_ID no definido; omitiendo detalle de hoja de vida"
    return
  fi

  echo "[3/3] Consultando hoja de vida para DEVICE_ID=$DEVICE_ID"
  local code
  code=$(call_api GET "/inventory/devices/$DEVICE_ID/cv")
  if [ "$code" != "200" ]; then
    echo "[ERROR] /inventory/devices/$DEVICE_ID/cv devolvió $code" >&2
    echo "$body"
    exit 1
  fi
  echo "[OK] Hoja de vida accesible (status 200)"
}

create_test_device() {
  if [[ "$ALLOW_MUTATIONS" != "true" && "$ALLOW_MUTATIONS" != "1" ]]; then
    echo "[INFO] ALLOW_MUTATIONS está desactivado; no se crearán dispositivos de prueba"
    return
  fi

  echo "[EXTRA] Creando dispositivo de prueba '${TEST_DEVICE_NAME}'"
  payload=$(cat <<JSON
{"nombre":"${TEST_DEVICE_NAME}","tipo":"LAPTOP","estado":"ACTIVO","ubicacion":"Smoke Test","notas":"Generado por scripts/inventory-smoke.sh"}
JSON
)
  local code
  code=$(call_api POST "/inventory/devices" "$payload")
  if [ "$code" != "200" ] && [ "$code" != "201" ]; then
    echo "[ERROR] No se pudo crear el dispositivo de prueba (status $code)" >&2
    echo "$body"
    exit 1
  fi
  echo "[OK] Dispositivo de prueba creado (status $code)"
}

main() {
  require_cmd curl
  load_env_if_present

  if [ -z "$ACCESS_TOKEN" ]; then
    echo "[ERROR] Debes definir ACCESS_TOKEN con un token válido de Supabase" >&2
    exit 1
  fi

  check_health
  check_inventory_list
  check_device_cv
  create_test_device

  echo "\n✅ Smoke test de inventario completado"
}

main "$@"
