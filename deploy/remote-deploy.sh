#!/usr/bin/env bash
# Runs ON THE VPS. Pulls one image tag and restarts the app on it.
# Called by .github/workflows/deploy.yml over SSH; can also be run by hand:
#
#   bash deploy/remote-deploy.sh <image-tag> [image-registry]
#
# <image-tag>       the commit SHA the images were built from (CI/CD tags every build with it)
# [image-registry]  default ghcr.io/bhagabanpaul62
#
# The database volume is never touched. The backend applies new migrations when it starts.
set -euo pipefail

if [[ $# -lt 1 || -z "$1" ]]; then
    echo "usage: $0 <image-tag> [image-registry]" >&2
    exit 64
fi

export IMAGE_TAG="$1"
export IMAGE_REGISTRY="${2:-ghcr.io/bhagabanpaul62}"

# The app folder is the one above this script (it holds .env and the compose files).
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
    echo "No .env in $(pwd). Create it from .env.example first (deploy/README.md, step 4)." >&2
    exit 1
fi

compose() {
    docker compose -f docker-compose.yml -f docker-compose.vps.yml "$@"
}

echo "Deploying ${IMAGE_REGISTRY}/enroute-{backend,frontend}:${IMAGE_TAG}"
compose pull backend frontend
compose up -d --no-build --remove-orphans

# Old images pile up with every deploy; keep the disk from filling.
docker image prune -f >/dev/null

# Remember what runs now, for rollbacks (deploy/README.md, "Roll back").
printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$IMAGE_TAG" >> deploy/history.log
compose ps
