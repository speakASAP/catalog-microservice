#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/services/frontend"
NAMESPACE="${NAMESPACE:-statex-apps}"
REGISTRY="localhost:5000"
DEFAULT_TAG="$(cd "$PROJECT_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo "build-$(date -u +%Y%m%d%H%M%S)")"
IMAGE_TAG="${1:-$DEFAULT_TAG}"
IMAGE="${REGISTRY}/catalog-frontend:${IMAGE_TAG}"
IMAGE_LATEST="${REGISTRY}/catalog-frontend:latest"

docker build -t "$IMAGE" -t "$IMAGE_LATEST" "$FRONTEND_DIR"
docker push "$IMAGE"
docker push "$IMAGE_LATEST"
kubectl apply -f "$PROJECT_ROOT/k8s/frontend-deployment.yaml" -n "$NAMESPACE"
kubectl apply -f "$PROJECT_ROOT/k8s/frontend-service.yaml" -n "$NAMESPACE"
kubectl apply -f "$PROJECT_ROOT/k8s/ingress.yaml" -n "$NAMESPACE"
kubectl set image deployment/catalog-frontend app="$IMAGE_LATEST" -n "$NAMESPACE" || true
kubectl rollout restart deployment/catalog-frontend -n "$NAMESPACE"
kubectl rollout status deployment/catalog-frontend -n "$NAMESPACE" --timeout=180s
