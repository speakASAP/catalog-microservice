#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
SERVICE_NAME="catalog-microservice"
REGISTRY="localhost:5000"
IMAGE_TAG="${1:-latest}"
IMAGE="${REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗"; echo "║  ${SERVICE_NAME}"; echo "║  Kubernetes Deployment"; echo "╚════════════════════════════════════════════════════════╝${NC}"
if [ "${NODE_ENV}" = "production" ]; then echo -e "${YELLOW}[1/5] Syncing git...${NC}"; cd "$PROJECT_ROOT"; git fetch origin; git stash; git pull origin main; git stash pop || true; echo -e "${GREEN}✅ Git synced${NC}"; fi
echo -e "${YELLOW}[2/5] Building image: ${IMAGE}...${NC}"; docker build -t "$IMAGE" "$PROJECT_ROOT"; echo -e "${GREEN}✅ Image built${NC}"
echo -e "${YELLOW}[3/5] Pushing to registry...${NC}"; docker push "$IMAGE"; echo -e "${GREEN}✅ Image pushed: ${IMAGE}${NC}"
echo -e "${YELLOW}[4/5] Updating K8s deployment...${NC}"; kubectl set image deployment/${SERVICE_NAME} app="${IMAGE}" -n statex-apps; kubectl rollout status deployment/${SERVICE_NAME} -n statex-apps --timeout=120s; echo -e "${GREEN}✅ Rollout complete${NC}"
echo -e "${YELLOW}[5/5] Verifying health...${NC}"; POD=$(kubectl get pod -n statex-apps -l app=${SERVICE_NAME} -o jsonpath='{.items[0].metadata.name}'); if [ -z "$POD" ]; then echo -e "${RED}❌ No pod found${NC}"; exit 1; fi; kubectl exec -n statex-apps "$POD" -- wget -qO- http://localhost:3200/health || echo -e "${RED}⚠️  Health check failed${NC}"; echo -e "${GREEN}╔════════════════════════════════════════════════════════╗"; echo "║            ✅ Deployment successful!                   ║"; echo "║  Service:  ${SERVICE_NAME}"; echo "║  Namespace: statex-apps"; echo "╚════════════════════════════════════════════════════════╝${NC}"
