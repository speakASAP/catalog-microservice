# deploy.config.sh — declaration consumed by shared/scripts/deploy.sh.
# See shared/docs/DEPLOY_STANDARDIZATION_REPORT.md section 6/7 (Phase C) for the design.
# scripts/deploy.sh is still the live, authoritative deploy path.

SERVICE_NAME="catalog-microservice"
PORT="3200"

IMAGES=(
  "catalog-microservice|.||"
)

DEPLOYMENTS=(
  "catalog-microservice|app|catalog-microservice"
)

MANIFESTS=(configmap.yaml external-secret.yaml deployment.yaml contract-monitor-cronjob.yaml service.yaml ingress.yaml)
