import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LoggerService } from '../logger/logger.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const reporter = require('./vendor/credential-reporter.js');

const SELF_REPORT_CRON = process.env.CREDENTIAL_SELF_REPORT_CRON || '*/30 * * * *';

const WAREHOUSE_URL =
  process.env.WAREHOUSE_SERVICE_URL ||
  'http://warehouse-microservice.statex-apps.svc.cluster.local:3201';

const MONITORING_URL =
  process.env.MONITORING_URL ||
  'http://monitoring-microservice.statex-apps.svc.cluster.local:3395';

/**
 * This service's warehouse principal, exactly as auth lists it.
 *
 * Note the abbreviated form: `svc-catalog--warehouse`, not
 * `svc-catalog-microservice--warehouse-microservice`. It is one of the two
 * class-2 mismatches in Task C and the older half of a Task B duplicate group,
 * so it may be retired later — but while it exists and validates, it is an
 * unrotated credential nobody is watching, which is exactly this plan's subject.
 * The string must match auth exactly or the report reconciles against nothing.
 */
const PRINCIPAL = 'svc-catalog--warehouse@internal.alfares.cz';

const TARGET = 'warehouse-microservice';

/**
 * An id used only to exercise the guard, never for its response body.
 * `GET /api/stock/:productId` returns 200 with an empty array for an unknown id.
 */
const PROBE_PRODUCT_ID = 'credential-probe';

/**
 * Reports this service's warehouse credential, per
 * `monitoring-microservice/docs/CREDENTIAL_SELF_REPORT_CONTRACT.md`.
 *
 * Probe target: `GET /api/stock/:productId`, decorated
 * `@Roles(...WAREHOUSE_READ_ROLES)`, which includes
 * `internal:warehouse-microservice:readonly` — this credential's role. Verified
 * live before adoption: 200 with the real token, 401 with garbage, 401 with none.
 *
 * **This service's other principal gets no reporter.**
 * `svc-catalog-microservice--orders-microservice` has no credential deployed in
 * this pod at all — there is no orders token here, only warehouse and bazos — so
 * there is nothing to probe with. That absence is itself a finding for Task B
 * rather than something a reporter can resolve.
 *
 * Note also that catalog is the receiver other services cannot probe: this
 * service's own `CatalogAuthGuard` derives a caller's grants from the
 * `SERVICE_NAME` header rather than the JWT role and defaults unlisted callers
 * to read access, so a GET here returns 200 even for a revoked credential. That
 * blocks reporters in *other* repos, not this one, and is recorded in the plan.
 */
@Injectable()
export class CredentialSelfReporter {
  constructor(private readonly logger: LoggerService) {}

  @Cron(SELF_REPORT_CRON)
  async scheduledReport(): Promise<void> {
    if (process.env.CREDENTIAL_SELF_REPORT_ENABLED === 'false') return;
    await this.runReport();
  }

  async runReport(): Promise<{ verdict: string; posted: boolean } | null> {
    const token = (process.env.WAREHOUSE_SERVICE_TOKEN || '').trim();
    const ingestToken = (process.env.NOTIFICATION_SERVICE_TOKEN || '').trim();

    if (!ingestToken) {
      // A reporter that stops reporting is indistinguishable from a credential
      // that broke, and silence is this design's primary signal.
      this.logger.error(
        `credential_self_report_undeliverable principal=${PRINCIPAL} reason=NOTIFICATION_SERVICE_TOKEN is empty`,
        undefined,
        'CredentialSelfReporter',
      );
      return null;
    }

    const outcome = await reporter.reportCredential({
      url: `${WAREHOUSE_URL}/api/stock/${PROBE_PRODUCT_ID}`,
      token,
      serviceName: 'catalog-microservice',
      monitoringUrl: MONITORING_URL,
      ingestToken,
      principal: PRINCIPAL,
      target: TARGET,
    });

    this.logger.log(
      `credential_self_report_sent principal=${PRINCIPAL} target=${TARGET} ` +
        `verdict=${outcome.verdict} posted=${outcome.posted}` +
        (outcome.error ? ` error=${outcome.error}` : ''),
      'CredentialSelfReporter',
    );

    if (!outcome.posted) {
      this.logger.warn(
        `probe said ${outcome.verdict} but the report was not accepted` +
          (outcome.error ? `: ${outcome.error}` : ''),
        'CredentialSelfReporter',
      );
    }

    return { verdict: outcome.verdict, posted: outcome.posted };
  }
}
