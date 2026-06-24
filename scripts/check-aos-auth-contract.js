#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const docsPath = path.join(
  repoRoot,
  'docs/orchestrator/2026-06-24-aos-auth-static-inventory.md',
);
const authControllerPath = path.join(repoRoot, 'src/auth/auth.controller.ts');
const authGuardPath = path.join(repoRoot, 'src/auth/catalog-auth.guard.ts');
const standardPath =
  '/home/ssf/Documents/Github/auth-microservice/docs/HOSTED_AUTH_CONSUMER_STANDARD.md';

const failures = [];
const warnings = [];
const findings = [];

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function listFiles(dir, predicate, out = []) {
  if (!exists(dir)) {
    return out;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(repoRoot, fullPath);
    if (
      entry.isDirectory() &&
      !['.git', 'node_modules', 'dist', 'build', '.next', 'coverage'].includes(entry.name)
    ) {
      listFiles(fullPath, predicate, out);
    } else if (entry.isFile() && predicate(relPath)) {
      out.push(fullPath);
    }
  }
  return out;
}

function record(condition, okMessage, failMessage) {
  if (condition) {
    findings.push(okMessage);
  } else {
    failures.push(failMessage);
  }
}

const srcAndDocsFiles = [
  ...listFiles(path.join(repoRoot, 'src'), (relPath) => /\.(ts|tsx|js|jsx|html|md)$/.test(relPath)),
  ...listFiles(path.join(repoRoot, 'docs'), (relPath) => /\.md$/.test(relPath)),
];

const docsText = exists(docsPath) ? readText(docsPath) : '';
const authControllerText = exists(authControllerPath) ? readText(authControllerPath) : '';
const authGuardText = exists(authGuardPath) ? readText(authGuardPath) : '';

record(exists(docsPath), `inventory doc present: ${path.relative(repoRoot, docsPath)}`, 'missing AOS auth static inventory doc');
record(
  docsText.includes(standardPath),
  `central standard referenced: ${standardPath}`,
  `inventory doc must reference ${standardPath}`,
);

const browserPasswordMatches = [];
const browserFilePattern = /\.(tsx|jsx|html)$/;
for (const filePath of srcAndDocsFiles) {
  const relPath = path.relative(repoRoot, filePath);
  const text = readText(filePath);
  const isBrowserLike = browserFilePattern.test(relPath) || relPath.startsWith('docs/');
  const passwordInput = /<input\b[^>]*\btype\s*=\s*["']?password["']?/i.test(text);
  const passwordField = /\btype\s*:\s*["']password["']/i.test(text) && browserFilePattern.test(relPath);
  if (isBrowserLike && (passwordInput || passwordField)) {
    browserPasswordMatches.push(relPath);
  }
}

record(
  browserPasswordMatches.length === 0,
  'no browser password form collection found in src/docs',
  `browser password collection found: ${browserPasswordMatches.join(', ')}`,
);

const browserTokenStorageMatches = [];
const tokenStoragePattern =
  /\b(?:localStorage|sessionStorage)\s*\.\s*(?:setItem|getItem|removeItem)\s*\([^)]*(?:token|jwt|bearer|auth|session)/i;
for (const filePath of srcAndDocsFiles) {
  const relPath = path.relative(repoRoot, filePath);
  const text = readText(filePath);
  if (tokenStoragePattern.test(text)) {
    browserTokenStorageMatches.push(relPath);
  }
}

record(
  browserTokenStorageMatches.length === 0,
  'no browser localStorage/sessionStorage token storage found in src/docs',
  `browser token storage found: ${browserTokenStorageMatches.join(', ')}`,
);

const hasLoginProxy =
  /@Post\(\s*['"]login['"]\s*\)/.test(authControllerText) &&
  /POST \/api\/auth\/login/.test(authControllerText);
const hasRegisterProxy =
  /@Post\(\s*['"]register['"]\s*\)/.test(authControllerText) &&
  /POST \/api\/auth\/register/.test(authControllerText);
record(
  hasLoginProxy && hasRegisterProxy,
  'local /api/auth/login and /api/auth/register proxy endpoints are present',
  'local auth proxy markers disappeared from src/auth/auth.controller.ts; update docs and migration decision before removal',
);

const docsClassifyProxyDebt =
  /\/api\/auth\/login/.test(docsText) &&
  /\/api\/auth\/register/.test(docsText) &&
  /transitional debt/i.test(docsText);
record(
  docsClassifyProxyDebt,
  'local auth proxy endpoints are documented as transitional debt',
  'inventory doc must classify local /api/auth/login and /api/auth/register as transitional debt',
);

const controllerFiles = listFiles(path.join(repoRoot, 'src'), (relPath) =>
  relPath.endsWith('.controller.ts'),
).filter((filePath) => !filePath.endsWith(path.join('src', 'auth', 'auth.controller.ts')));

const unguardedMutations = [];
for (const filePath of controllerFiles) {
  const relPath = path.relative(repoRoot, filePath);
  const lines = readText(filePath).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!/@(?:Post|Put|Patch|Delete)\b/.test(line)) {
      return;
    }
    const decoratorBlock = lines.slice(index, Math.min(index + 8, lines.length)).join('\n');
    if (!/@UseGuards\(\s*CatalogAuthGuard\s*\)/.test(decoratorBlock)) {
      unguardedMutations.push(`${relPath}:${index + 1}:${line.trim()}`);
    }
  });
}

record(
  unguardedMutations.length === 0,
  `CatalogAuthGuard protects write decorators in ${controllerFiles.length} non-auth controllers`,
  `write decorators missing CatalogAuthGuard: ${unguardedMutations.join('; ')}`,
);

const localJwtVerificationMarkers = [];
if (/verifyJwt\s*\(/.test(authGuardText)) {
  localJwtVerificationMarkers.push('verifyJwt()');
}
if (/createHmac\(\s*['"]sha256['"]/.test(authGuardText)) {
  localJwtVerificationMarkers.push('HS256 createHmac()');
}
if (/\b(?:JWT_SECRET|AUTH_JWT_SECRET)\b/.test(authGuardText)) {
  localJwtVerificationMarkers.push('JWT_SECRET/AUTH_JWT_SECRET');
}
if (/Token expired|Invalid token signature|Unsupported token algorithm/.test(authGuardText)) {
  localJwtVerificationMarkers.push('local JWT verification error text');
}

record(
  localJwtVerificationMarkers.length === 0,
  'no local HS256/JWT_SECRET bearer-token verification remains in CatalogAuthGuard',
  `CatalogAuthGuard must not locally verify user JWTs: ${localJwtVerificationMarkers.join(', ')}`,
);

const hasAuthValidatePath =
  /AUTH_SERVICE_URL/.test(authGuardText) &&
  /http:\/\/auth-microservice:3370/.test(authGuardText) &&
  /\/auth\/validate/.test(authGuardText) &&
  /method:\s*['"]POST['"]/.test(authGuardText) &&
  /JSON\.stringify\(\{\s*token\s*\}\)/.test(authGuardText);
record(
  hasAuthValidatePath,
  'bearer tokens are validated through Auth POST /auth/validate using AUTH_SERVICE_URL',
  'CatalogAuthGuard must validate bearer tokens through Auth POST /auth/validate with { token } and AUTH_SERVICE_URL default',
);

const hasFailClosedAuthValidation =
  /UnauthorizedException\(['"]Token validation failed['"]\)/.test(authGuardText) &&
  /UnauthorizedException\(['"]Invalid token['"]\)/.test(authGuardText) &&
  /catch\s*\{\s*throw new UnauthorizedException\(['"]Token validation failed['"]\)/s.test(authGuardText);
record(
  hasFailClosedAuthValidation,
  'Auth validation errors and non-valid responses fail closed with UnauthorizedException',
  'CatalogAuthGuard must fail closed on Auth validation errors/non-valid responses with UnauthorizedException',
);

const docsClassifyAuthValidate =
  /POST `?\/auth\/validate`?/i.test(docsText) &&
  /local HS256\/JWT_SECRET verification removed/i.test(docsText) &&
  /AUTH_SERVICE_URL/i.test(docsText);
record(
  docsClassifyAuthValidate,
  'inventory doc records Auth /auth/validate migration and removed local JWT debt',
  'inventory doc must record Auth /auth/validate migration and removed local HS256/JWT_SECRET debt',
);

const hasServiceTokenPath =
  /x-internal-service-token/.test(authGuardText) &&
  /CATALOG_INTERNAL_SERVICE_TOKEN|INTERNAL_SERVICE_TOKEN/.test(authGuardText) &&
  /type:\s*['"]service['"]/.test(authGuardText) &&
  /serviceName:\s*source/.test(authGuardText) &&
  /authMethod:\s*['"]internal-service-token['"]/.test(authGuardText) &&
  /request\.serviceActor\s*=\s*actor/.test(authGuardText);
record(
  hasServiceTokenPath,
  'internal service token path detected in CatalogAuthGuard with explicit service actor',
  'internal service token path marker missing from CatalogAuthGuard or service actor is not explicit',
);

const docsClassifyServiceBoundary =
  /service-token paths/i.test(docsText) &&
  /machine\/service boundary|separate machine\/service boundary|separate boundary/i.test(docsText);
record(
  docsClassifyServiceBoundary,
  'internal service token path is classified as a separate machine/service boundary',
  'inventory doc must classify service-token handling as a separate machine/service boundary',
);

record(
  /Catalog Internal Service Actor Slice/.test(docsText) &&
    /serviceName/i.test(docsText) &&
    /authMethod/i.test(docsText) &&
    /internal-service-token/i.test(docsText),
  'inventory doc records Catalog internal service actor slice',
  'inventory doc must record Catalog internal service actor slice with serviceName/authMethod evidence',
);

if (/speakasap-portal/.test(srcAndDocsFiles.map((filePath) => path.relative(repoRoot, filePath)).join('\n'))) {
  warnings.push('legacy speakasap-portal is mentioned in docs; checker did not inspect or touch that repository');
}

console.log('AOS auth static contract check');
for (const finding of findings) {
  console.log(`PASS ${finding}`);
}
for (const warning of warnings) {
  console.log(`WARN ${warning}`);
}
for (const failure of failures) {
  console.log(`FAIL ${failure}`);
}

if (failures.length > 0) {
  process.exit(1);
}
