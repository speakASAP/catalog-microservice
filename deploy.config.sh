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

MANIFESTS=(configmap.yaml external-secret.yaml deployment.yaml contract-monitor-cronjob.yaml service.yaml frontend-deployment.yaml frontend-service.yaml ingress.yaml)
