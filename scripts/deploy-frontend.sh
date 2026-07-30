#!/bin/bash
# Prefer the shared runner — frontend is part of catalog-microservice/deploy.config.sh.
# Kept as a named entrypoint so old muscle-memory still deploys the full catalog stack
# (API + frontend) with the same git-SHA tag, instead of the old :latest trap.
set -euo pipefail
exec "$(dirname "$0")/../../shared/scripts/deploy.sh" catalog-microservice "$@"
