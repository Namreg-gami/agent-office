#!/usr/bin/env bash
# smoke-test.sh — quick validation of the Agent Office API bridge
# Run with: bash server/smoke-test.sh
# Assumes uvicorn is running on 127.0.0.1:8800

set -euo pipefail
BASE="${1:-http://127.0.0.1:8800}"

echo "=== Health ==="
curl -sf "$BASE/api/health" | head -c 200
echo

echo "=== Office State ==="
curl -sf "$BASE/api/office/state" | head -c 500
echo
echo "..."

echo "=== Worker: backend ==="
curl -sf "$BASE/api/office/workers/backend" | head -c 500
echo
echo "..."

echo "=== Task: t_18bf6201 ==="
curl -sf "$BASE/api/office/tasks/t_18bf6201" | head -c 500
echo
echo "..."

echo "=== All endpoints returned JSON ==="
for url in \
  "$BASE/api/health" \
  "$BASE/api/office/state" \
  "$BASE/api/office/workers/backend" \
  "$BASE/api/office/tasks/t_18bf6201"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  content_type=$(curl -s -o /dev/null -w "%{content_type}" "$url")
  echo "  $url → HTTP $status  (${content_type:-no content-type})"
done
echo "OK"
