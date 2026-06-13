import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { CatalogAuthGuard } from "../auth/catalog-auth.guard";
import type { CatalogAuthenticatedRequest } from "../auth/catalog-auth.guard";
import { LoggerService } from "../logger/logger.service";
import { ImportReconciliationService } from "./import-reconciliation.service";
import { ImportReconciliationRequest } from "./import-reconciliation.types";

@Controller("imports/reconciliation")
export class ImportReconciliationController {
  constructor(
    private readonly reconciliationService: ImportReconciliationService,
    private readonly logger: LoggerService,
  ) {}

  @Post("dry-run")
  @UseGuards(CatalogAuthGuard)
  async dryRun(
    @Body() request: ImportReconciliationRequest,
    @Req() actor: CatalogAuthenticatedRequest,
  ) {
    this.logger.log("POST /api/imports/reconciliation/dry-run", "ImportReconciliationController");
    const report = await this.reconciliationService.dryRun(request);
    this.logger.auditCatalogWrite(actor, {
      action: "import_reconciliation_dry_run",
      resourceType: "import",
      metadata: {
        inputRows: report.totals.inputRows,
        issueCount: report.totals.issueCount,
        dryRun: report.dryRun,
        destructiveActionRequired: report.destructiveActionRequired,
      },
    });
    return { success: true, data: report };
  }
}
