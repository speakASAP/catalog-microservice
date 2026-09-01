import { Controller, Get, UseGuards } from "@nestjs/common";
import { BusinessHealthService } from "./business-health.service";
import { CatalogAuthGuard } from "../auth/catalog-auth.guard";
import { RequireCatalogRoles } from "../auth/catalog-auth.decorator";

@Controller("business-health")
export class BusinessHealthController {
  constructor(private readonly businessHealthService: BusinessHealthService) {}

  /**
   * Channel-availability envelope: service topology, contract identifiers and
   * mutation flags.
   *
   * Guarded 2026-09-01: this route carried no `CatalogAuthGuard`, and the catalog
   * ingress maps `/api` to this service, so ~5KB of internal topology was readable
   * from the public internet with no credentials.
   *
   * Verified before guarding that nothing scrapes it: no ecosystem HTTP caller, and
   * the Kubernetes liveness and readiness probes both target `/health`, not this
   * route. The only references are contract-verification scripts that assert on the
   * endpoint string in source rather than calling it.
   */
  @Get("channel-availability")
  @UseGuards(CatalogAuthGuard)
  @RequireCatalogRoles("catalog:authenticated")
  getChannelAvailabilityEnvelope() {
    return {
      success: true,
      data: this.businessHealthService.getChannelAvailabilityEnvelope(),
    };
  }
}
