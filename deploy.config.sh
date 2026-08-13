# deploy.config.sh — declaration consumed by shared/scripts/deploy.sh.
# See shared/docs/DEPLOY_STANDARDIZATION_REPORT.md section 6/7 (Phase C) for the design.
# scripts/deploy.sh is still the live, authoritative deploy path.

SERVICE_NAME="catalog-microservice"
PORT="3200"

IMAGES=(
  "catalog-microservice|.||"
  "catalog-frontend|services/frontend||"
)

DEPLOYMENTS=(
  "catalog-microservice|app|catalog-microservice"
  "catalog-frontend|app|catalog-frontend"
)

MANIFESTS=(configmap.yaml external-secret.yaml deployment.yaml service.yaml frontend-deployment.yaml frontend-service.yaml ingress.yaml)

deploy_post_manifests() {
  local image="${REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}"
  # contract-monitor-cronjob.yaml is sed-templated and is NOT in MANIFESTS:
  # `kubectl set image` only ever targets deployments, so a statically applied
  # CronJob stays pinned to :latest forever. That is why the monitor kept running
  # pre-fea6bf2 code while the Deployment moved on with every deploy.
  sed "s#localhost:5000/catalog-microservice:latest#${image}#g" \
    "$PROJECT_ROOT/k8s/contract-monitor-cronjob.yaml" \
    | kubectl apply -f - -n "$NAMESPACE"
}
