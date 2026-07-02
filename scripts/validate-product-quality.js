#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const POLICY_ID = "catalog.product_quality.v1";
const DEFAULT_LIMIT = 200;
const DEFAULT_MAX_PAGES = 50;

function usage() {
  return [
    "Usage: node scripts/validate-product-quality.js [options]",
    "",
    "Options:",
    "  --format json|markdown|csv       Output format, default json.",
    "  --out <path>                     Write selected output format to a file.",
    "  --input <path>                   Read review rows from a JSON fixture/export.",
    "  --api-base <url>                 Catalog API base, for example https://catalog.alfares.cz/api.",
    "  --token <token>                  Bearer token for live API use. Prefer env vars.",
    "  --limit <n>                      API page size, default 200.",
    "  --max-pages <n>                  Maximum API pages, default 50.",
    "  --missing-field <field>          Forward missingField filter to live API.",
    "  --severity blocking|optional     Forward severity filter to live API.",
    "  --catalog-scope <scope>          Forward catalogScope filter to live API.",
    "  --catalog-sources <list>         Forward catalogSources filter to live API.",
    "  --search <text>                  Forward search filter to live API.",
    "  --synthetic                     Force deterministic sanitized sample data.",
    "  --unmask-owners                 Require CATALOG_PRODUCT_QUALITY_UNMASKED_OWNER_REPORT_APPROVAL=approved.",
    "  --help                          Show this help.",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    format: "json",
    limit: DEFAULT_LIMIT,
    maxPages: DEFAULT_MAX_PAGES,
    maskOwners: true,
    filters: {},
    synthetic: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    const [flag, inlineValue] = raw.includes("=") ? raw.split(/=(.*)/s, 2) : [raw, undefined];
    const readValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${flag}`);
      }
      return argv[index];
    };

    switch (flag) {
      case "--format":
        options.format = readValue();
        break;
      case "--out":
        options.out = readValue();
        break;
      case "--input":
        options.input = readValue();
        break;
      case "--api-base":
        options.apiBase = readValue();
        break;
      case "--token":
        options.token = readValue();
        break;
      case "--limit":
        options.limit = Number(readValue());
        break;
      case "--max-pages":
        options.maxPages = Number(readValue());
        break;
      case "--missing-field":
        options.filters.missingField = readValue();
        break;
      case "--severity":
        options.filters.severity = readValue();
        break;
      case "--catalog-scope":
        options.filters.catalogScope = readValue();
        break;
      case "--catalog-sources":
        options.filters.catalogSources = readValue();
        break;
      case "--search":
        options.filters.search = readValue();
        break;
      case "--synthetic":
        options.synthetic = true;
        break;
      case "--unmask-owners":
      case "--include-owner-identifiers":
        options.maskOwners = false;
        break;
      case "--help":
      case "-h":
        console.log(usage());
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown option ${raw}`);
    }
  }

  if (!["json", "markdown", "csv"].includes(options.format)) {
    throw new Error(`Unsupported format ${options.format}`);
  }
  if (!Number.isFinite(options.limit) || options.limit < 1 || options.limit > 200) {
    throw new Error("--limit must be a number between 1 and 200");
  }
  if (!Number.isFinite(options.maxPages) || options.maxPages < 1) {
    throw new Error("--max-pages must be a positive number");
  }
  if (!options.maskOwners && process.env.CATALOG_PRODUCT_QUALITY_UNMASKED_OWNER_REPORT_APPROVAL !== "approved") {
    throw new Error("[MISSING: production-safe unmasked owner-report approval process]");
  }

  return options;
}

function stableNow() {
  return new Date().toISOString();
}

function compactWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  return Array.from(new Set(values.filter((value) => value !== undefined && value !== null && String(value).length > 0)));
}

function maskOwnerIdentifier(value) {
  const raw = compactWhitespace(value);
  if (!raw || raw === "alfares" || raw === "shared" || raw === "null") {
    return "alfares";
  }
  const withoutPrefix = raw.startsWith("owner:") ? raw.slice("owner:".length) : raw;
  if (withoutPrefix === "masked") {
    return "owner:masked";
  }
  if (withoutPrefix.length <= 8) {
    return "owner:masked";
  }
  return `owner:${withoutPrefix.slice(0, 4)}...${withoutPrefix.slice(-4)}`;
}

function resolveOwnerScope(row, maskOwners) {
  const raw = row.ownerUserId ?? row.ownerId ?? row.ownerScope ?? row.owner ?? null;
  if (!maskOwners) {
    if (raw === null || raw === undefined || raw === "") {
      return "alfares";
    }
    return String(raw);
  }
  return maskOwnerIdentifier(raw);
}

function issueFieldKey(issue) {
  const code = typeof issue === "string" ? issue : String(issue?.code || "");
  const field = typeof issue === "string" ? "" : String(issue?.field || "");
  if (code === "missing_current_price") return "price";
  if (code === "missing_image" || code === "missing_media" || code === "placeholder_image_only") return "image";
  if (code === "duplicate_sku" || code === "missing_sku") return "sku";
  if (code === "missing_title") return "title";
  if (code === "missing_description") return "description";
  if (field === "media") return "image";
  if (field === "pricing") return "price";
  return field || code;
}

function normalizeIssue(issue) {
  if (typeof issue === "string") {
    return {
      code: issue,
      field: issueFieldKey(issue),
      severity: "blocking",
      message: issue,
      source: POLICY_ID,
    };
  }
  return {
    code: compactWhitespace(issue?.code || issue?.field || "unknown_issue"),
    field: compactWhitespace(issue?.field || issueFieldKey(issue)),
    severity: compactWhitespace(issue?.severity || "blocking"),
    message: compactWhitespace(issue?.message || issue?.code || issue?.field || "Product quality issue"),
    source: compactWhitespace(issue?.source || POLICY_ID),
  };
}

function normalizeIssueList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(normalizeIssue);
}

function normalizeOpportunityList(value) {
  return normalizeIssueList(value).map((issue) => ({
    ...issue,
    severity: issue.severity === "blocking" ? "warning" : issue.severity,
  }));
}

function completionScore(blockingMissingFields, optionalOpportunities) {
  const required = new Set(["sku", "title", "description", "price", "image"]);
  for (const field of blockingMissingFields) {
    required.delete(field);
  }
  const requiredScore = (required.size / 5) * 85;
  const optionalPenalty = Math.min(optionalOpportunities.length * 3, 15);
  return Math.max(0, Math.round(requiredScore + 15 - optionalPenalty));
}

function defaultNextAction(blockingMissingFields) {
  if (!blockingMissingFields.length) {
    return "ready_for_activation";
  }
  return `resolve_blockers:${blockingMissingFields.join(",")}`;
}

function normalizeReviewItem(row, maskOwners) {
  const blockingIssues = normalizeIssueList(row.blockingIssues || row.issues || []);
  const explicitMissing = Array.isArray(row.blockingMissingFields)
    ? row.blockingMissingFields.map(compactWhitespace).filter(Boolean)
    : [];
  const blockingMissingFields = unique(explicitMissing.length ? explicitMissing : blockingIssues.map(issueFieldKey));
  const optionalOpportunities = normalizeOpportunityList(row.optionalOpportunities || row.optionalIssues || []);
  const score = Number(row.completionScore);

  return {
    productId: compactWhitespace(row.productId || row.id || "[UNKNOWN: product id]"),
    sku: compactWhitespace(row.sku || ""),
    title: compactWhitespace(row.title || ""),
    ownerScope: resolveOwnerScope(row, maskOwners),
    sourceScope: compactWhitespace(row.sourceScope || row.catalogSource || (row.ownerUserId ? "own" : "alfares") || "[UNKNOWN: source scope]"),
    lifecycle: compactWhitespace(row.lifecycle || "[UNKNOWN: lifecycle]"),
    isActive: row.isActive === undefined ? null : Boolean(row.isActive),
    publishable: row.publishable === undefined ? null : Boolean(row.publishable),
    canActivate: row.canActivate === undefined ? blockingMissingFields.length === 0 : Boolean(row.canActivate),
    completionScore: Number.isFinite(score) ? score : completionScore(blockingMissingFields, optionalOpportunities),
    blockingIssues,
    blockingMissingFields,
    optionalOpportunities,
    nextAction: compactWhitespace(row.nextAction || defaultNextAction(blockingMissingFields)),
  };
}

function syntheticRows() {
  return [
    {
      productId: "00000000-0000-4000-8000-000000000251",
      sku: "",
      title: "Synthetic draft missing sellable fields",
      ownerUserId: "synthetic-owner-0001",
      sourceScope: "own",
      lifecycle: "draft",
      isActive: false,
      publishable: false,
      canActivate: false,
      blockingIssues: [
        { code: "missing_sku", field: "sku", severity: "blocking", message: "SKU is missing." },
        { code: "missing_description", field: "description", severity: "blocking", message: "Description is missing." },
        { code: "missing_current_price", field: "pricing", severity: "blocking", message: "Current positive price is missing." },
        { code: "missing_image", field: "media", severity: "blocking", message: "Product image is missing." },
      ],
      optionalOpportunities: [
        { code: "missing_brand", field: "brand", severity: "warning", message: "Brand is missing." },
      ],
    },
    {
      productId: "00000000-0000-4000-8000-000000000252",
      sku: "SYN-READY-001",
      title: "Synthetic ready product",
      ownerUserId: null,
      sourceScope: "alfares",
      lifecycle: "active",
      isActive: true,
      publishable: true,
      canActivate: true,
      blockingIssues: [],
      optionalOpportunities: [],
    },
    {
      productId: "00000000-0000-4000-8000-000000000253",
      sku: "SYN-REVIEW-001",
      title: "Synthetic review product with placeholder media",
      ownerUserId: "synthetic-community-owner-0002",
      sourceScope: "community",
      lifecycle: "needs_review",
      isActive: false,
      publishable: false,
      canActivate: false,
      blockingIssues: [
        { code: "placeholder_image_only", field: "media", severity: "blocking", message: "Placeholder image media cannot satisfy activation." },
      ],
      optionalOpportunities: [
        { code: "missing_manufacturer", field: "manufacturer", severity: "warning", message: "Manufacturer is missing." },
        { code: "missing_tags", field: "tags", severity: "warning", message: "Tags are missing." },
      ],
    },
  ];
}

function normalizePayload(payload) {
  if (Array.isArray(payload)) {
    return { policyId: POLICY_ID, rows: payload, blockers: [], pagination: null };
  }
  const data = payload?.data ?? payload;
  const rows =
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.content) && data.content) ||
    (Array.isArray(payload?.items) && payload.items) ||
    (Array.isArray(payload?.content) && payload.content) ||
    [];
  return {
    policyId: compactWhitespace(payload?.policyId || data?.policyId || POLICY_ID),
    rows,
    blockers: [
      ...(Array.isArray(payload?.blockers) ? payload.blockers : []),
      ...(Array.isArray(data?.blockers) ? data.blockers : []),
    ],
    pagination: payload?.pagination || data?.pagination || null,
  };
}

function readInputRows(filePath) {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const normalized = normalizePayload(payload);
  return {
    mode: "input",
    label: path.basename(filePath),
    rows: normalized.rows,
    policyId: normalized.policyId,
    blockers: normalized.blockers,
    runBlockers: [],
  };
}

function apiBaseFromOptions(options) {
  const base = options.apiBase || process.env.CATALOG_PRODUCT_QUALITY_API_BASE || process.env.CATALOG_API_BASE || "";
  return base.replace(/\/+$/, "");
}

function authHeaders(options) {
  const bearer =
    options.token ||
    process.env.CATALOG_PRODUCT_QUALITY_TOKEN ||
    process.env.CATALOG_AUTH_TOKEN ||
    process.env.CATALOG_ACCESS_TOKEN ||
    "";
  const internalToken = process.env.CATALOG_INTERNAL_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || "";
  return {
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    ...(internalToken ? { "x-internal-service-token": internalToken, "x-service-name": "catalog-microservice" } : {}),
  };
}

function appendFilterParams(params, filters) {
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  }
}

async function fetchJson(url, options) {
  if (typeof fetch !== "function") {
    throw new Error("[MISSING: Node.js global fetch support]");
  }
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...authHeaders(options),
    },
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Catalog product quality response was not JSON: HTTP ${response.status}`);
  }
  if (!response.ok || payload?.success === false) {
    const reason = payload?.message || payload?.error || `HTTP ${response.status}`;
    throw new Error(`Catalog product quality API request failed: ${reason}`);
  }
  return payload;
}

async function fetchApiRows(options) {
  const base = apiBaseFromOptions(options);
  if (!base) {
    return null;
  }

  const rows = [];
  const blockers = [];
  let policyId = POLICY_ID;
  let page = 1;
  let pages = 1;

  do {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(options.limit));
    appendFilterParams(params, options.filters);

    const payload = await fetchJson(`${base}/products/review/quality?${params.toString()}`, options);
    const normalized = normalizePayload(payload);
    rows.push(...normalized.rows);
    blockers.push(...normalized.blockers);
    policyId = normalized.policyId || policyId;
    pages = Number(normalized.pagination?.pages || normalized.pagination?.totalPages || page);
    if (!Number.isFinite(pages) || pages < page) {
      pages = page;
    }
    page += 1;
  } while (page <= pages && page <= options.maxPages);

  const runBlockers = [];
  if (page <= pages) {
    runBlockers.push(`[MISSING: live audit pagination exceeded --max-pages=${options.maxPages}]`);
  }

  return {
    mode: "api",
    label: base.replace(/^https?:\/\//, ""),
    rows,
    policyId,
    blockers,
    runBlockers,
  };
}

async function loadRows(options) {
  if (options.synthetic) {
    return {
      mode: "synthetic",
      label: "synthetic/sanitized",
      rows: syntheticRows(),
      policyId: POLICY_ID,
      blockers: ["[MISSING: generated description state contract]"],
      runBlockers: [],
    };
  }
  if (options.input) {
    return readInputRows(options.input);
  }
  const apiRows = await fetchApiRows(options);
  if (apiRows) {
    return apiRows;
  }
  return {
    mode: "synthetic",
    label: "synthetic/sanitized",
    rows: syntheticRows(),
    policyId: POLICY_ID,
    blockers: ["[MISSING: generated description state contract]"],
    runBlockers: ["[MISSING: live Catalog API base/token; synthetic validation mode used]"],
  };
}

function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const keys = selector(item);
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      const value = compactWhitespace(key || "[UNKNOWN]");
      counts[value] = (counts[value] || 0) + 1;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function buildReport(loaded, options) {
  const generatedAt = stableNow();
  const items = loaded.rows.map((row) => normalizeReviewItem(row, options.maskOwners));
  const blockedItems = items.filter((item) => item.blockingMissingFields.length > 0);

  return {
    policyId: loaded.policyId || POLICY_ID,
    contract: "catalog.product_quality.validation_report.v1",
    generatedAt,
    source: {
      mode: loaded.mode,
      label: loaded.label,
      synthetic: loaded.mode === "synthetic",
    },
    safety: {
      readOnly: true,
      mutatesCatalog: false,
      mutatesWarehouse: false,
      mutatesMarketplace: false,
      ownerIdentifiersMasked: options.maskOwners,
    },
    blockers: unique([...(loaded.blockers || []), ...(loaded.runBlockers || [])]),
    totals: {
      products: items.length,
      blocked: blockedItems.length,
      readyForActivation: items.length - blockedItems.length,
      byLifecycle: countBy(items, (item) => item.lifecycle),
      byBlockingField: countBy(blockedItems, (item) => item.blockingMissingFields),
    },
    items,
  };
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function toCsv(report) {
  const rows = [
    [
      "productId",
      "sku",
      "title",
      "ownerScope",
      "sourceScope",
      "lifecycle",
      "blockingMissingFields",
      "optionalOpportunities",
      "completionScore",
      "canActivate",
      "nextAction",
    ],
    ...report.items.map((item) => [
      item.productId,
      item.sku,
      item.title,
      item.ownerScope,
      item.sourceScope,
      item.lifecycle,
      item.blockingMissingFields.join("|"),
      item.optionalOpportunities.map((issue) => issue.code).join("|"),
      String(item.completionScore),
      String(item.canActivate),
      item.nextAction,
    ]),
  ];
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function markdownCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .trim();
}

function toMarkdown(report) {
  const lines = [
    "# Product Quality Validation Report",
    "",
    `Generated at: ${report.generatedAt}`,
    `Policy: ${report.policyId}`,
    `Source: ${report.source.mode} (${report.source.label})`,
    `Owner identifiers masked: ${report.safety.ownerIdentifiersMasked ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    `- Products audited: ${report.totals.products}`,
    `- Blocked products: ${report.totals.blocked}`,
    `- Ready for activation: ${report.totals.readyForActivation}`,
    "",
    "## Blockers",
    "",
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ["- none"]),
    "",
    "## Owner Review Rows",
    "",
    "| Product ID | SKU | Title | Owner | Source | Lifecycle | Blocking fields | Optional opportunities | Next action |",
    "|---|---|---|---|---|---|---|---|---|",
  ];

  for (const item of report.items) {
    lines.push([
      markdownCell(item.productId),
      markdownCell(item.sku || "[MISSING: sku]"),
      markdownCell(item.title || "[MISSING: title]"),
      markdownCell(item.ownerScope),
      markdownCell(item.sourceScope),
      markdownCell(item.lifecycle),
      markdownCell(item.blockingMissingFields.join(", ") || "none"),
      markdownCell(item.optionalOpportunities.map((issue) => issue.code).join(", ") || "none"),
      markdownCell(item.nextAction),
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }

  return `${lines.join("\n")}\n`;
}

function serialize(report, format) {
  if (format === "markdown") {
    return toMarkdown(report);
  }
  if (format === "csv") {
    return toCsv(report);
  }
  return `${JSON.stringify(report, null, 2)}\n`;
}

function writeOutput(filePath, content) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const loaded = await loadRows(options);
  const report = buildReport(loaded, options);
  const output = serialize(report, options.format);

  if (options.out) {
    writeOutput(options.out, output);
    console.log(JSON.stringify({
      status: "completed",
      policyId: report.policyId,
      contract: report.contract,
      format: options.format,
      out: options.out,
      source: report.source,
      ownerIdentifiersMasked: report.safety.ownerIdentifiersMasked,
      totals: report.totals,
      blockers: report.blockers,
    }, null, 2));
  } else {
    process.stdout.write(output);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "failed",
    policyId: POLICY_ID,
    contract: "catalog.product_quality.validation_report.v1",
    readOnly: true,
    mutatesCatalog: false,
    mutatesWarehouse: false,
    mutatesMarketplace: false,
    error: error.message,
  }, null, 2));
  process.exit(1);
});
