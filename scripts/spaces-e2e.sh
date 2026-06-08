#!/usr/bin/env bash
#
# spaces-e2e.sh — prove the S3-compatible storage provider (the DigitalOcean
# Spaces code path) end-to-end against a local MinIO server.
#
# MinIO speaks the same S3 API as DigitalOcean Spaces, so a green run here means
# the exact upload/sign/download code that runs in production against Spaces is
# correct: object upload, streamed recording upload, presigned GET, delete, and
# the full Teams recording auto-upload job.
#
# Usage:  bash scripts/spaces-e2e.sh
# Requires: Docker running.
#
set -euo pipefail

CONTAINER=ttii-minio-e2e
NETWORK=ttii-spaces-net
BUCKET=ttii-recordings-test
ACCESS_KEY=ttiitest
SECRET_KEY=ttiitestsecret123
PORT=9100

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  echo "=== tearing down MinIO ==="
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== checking Docker ==="
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is not running. Start Docker Desktop and retry." >&2
  exit 1
fi

cleanup
docker network create "$NETWORK" >/dev/null 2>&1 || true

echo "=== starting MinIO on http://127.0.0.1:${PORT} ==="
docker run -d --name "$CONTAINER" --network "$NETWORK" \
  -p "${PORT}:9000" \
  -e MINIO_ROOT_USER="$ACCESS_KEY" -e MINIO_ROOT_PASSWORD="$SECRET_KEY" \
  -e MINIO_REGION=us-east-1 \
  minio/minio server /data >/dev/null

echo "=== waiting for readiness ==="
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${PORT}/minio/health/ready" >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "=== creating bucket ${BUCKET} ==="
docker run --rm --network "$NETWORK" --entrypoint sh minio/mc -c \
  "mc alias set local http://${CONTAINER}:9000 ${ACCESS_KEY} ${SECRET_KEY} && mc mb -p local/${BUCKET}"

echo "=== running gated S3 e2e tests ==="
export S3_TEST_ENDPOINT="http://127.0.0.1:${PORT}"
export S3_TEST_BUCKET="$BUCKET"
export S3_TEST_REGION=us-east-1
export S3_TEST_ACCESS_KEY_ID="$ACCESS_KEY"
export S3_TEST_SECRET_ACCESS_KEY="$SECRET_KEY"
export S3_TEST_FORCE_PATH_STYLE=true

cd "$REPO_ROOT/apps/api"
npx vitest run tests/integrations/s3-storage-provider.e2e.test.ts

echo "=== DONE — DigitalOcean Spaces code path verified end-to-end ==="
