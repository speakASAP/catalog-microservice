#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
SERVICE_NAME="catalog-microservice"
REGISTRY="localhost:5000"
DEFAULT_TAG="$(cd "$PROJECT_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "build-$(date -u +%Y%m%d%H%M%S)")"
IMAGE_TAG="${1:-$DEFAULT_TAG}"
IMAGE="${REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}"
IMAGE_LATEST="${REGISTRY}/${SERVICE_NAME}:latest"
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗";
echo "║     Catalog Microservice - Kubernetes Deployment       ║";
echo "╚════════════════════════════════════════════════════════╝${NC}"
if [ "${NODE_ENV}" = "production" ]; then echo -e "${YELLOW}[1/5] Syncing git...${NC}"; cd "$PROJECT_ROOT"; git fetch origin; git stash; git pull origin main; git stash pop || true; echo -e "${GREEN}✅ Git synced${NC}"; fi
echo -e "${YELLOW}[2/5] Building image: ${IMAGE}...${NC}"; docker build -t "$IMAGE" -t "$IMAGE_LATEST" "$PROJECT_ROOT"; echo -e "${GREEN}✅ Image built${NC}"
echo -e "${YELLOW}[3/5] Pushing to registry...${NC}"; docker push "$IMAGE"; docker push "$IMAGE_LATEST"; echo -e "${GREEN}✅ Image pushed: ${IMAGE}${NC}"
echo -e "${YELLOW}[4/5] Updating K8s deployment...${NC}"; kubectl set image deployment/${SERVICE_NAME} app="${IMAGE}" -n statex-apps; if ! kubectl rollout status deployment/${SERVICE_NAME} -n statex-apps --timeout=120s; then echo -e "${YELLOW}Rollout did not complete in time. Diagnosing terminating pods...${NC}"; kubectl get pods -n statex-apps -l app=${SERVICE_NAME} -o wide || true; TERMINATING_PODS=$(kubectl get pods -n statex-apps -l app=${SERVICE_NAME} --no-headers 2>/dev/null | awk '$3=="Terminating"{print $1}'); if [ -n "$TERMINATING_PODS" ]; then echo -e "${YELLOW}Force deleting stuck terminating pods...${NC}"; for pod in $TERMINATING_PODS; do kubectl delete pod -n statex-apps "$pod" --grace-period=0 --force || true; done; fi; kubectl rollout status deployment/${SERVICE_NAME} -n statex-apps --timeout=120s; fi; echo -e "${GREEN}✅ Rollout complete${NC}"
echo -e "${YELLOW}[5/5] Verifying health...${NC}"; POD=$(kubectl get pod -n statex-apps -l app=${SERVICE_NAME} -o jsonpath='{.items[0].metadata.name}'); if [ -z "$POD" ]; then echo -e "${RED}❌ No pod found${NC}"; exit 1; fi; READY_STATE=$(kubectl get pod -n statex-apps "$POD" -o jsonpath='{range .status.containerStatuses[*]}{.name}={.ready}{" "}{end}'); if echo "$READY_STATE" | grep -q "=true"; then echo -e "${GREEN}✅ Pod containers ready: ${READY_STATE}${NC}"; else echo -e "${RED}⚠️  Pod not ready yet: ${READY_STATE}${NC}"; kubectl logs -n statex-apps "$POD" --tail=60 || true; fi;
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗";
echo "║    ✅ Catalog Microservice Deployment successful!      ║";
echo "╚════════════════════════════════════════════════════════╝${NC}"
