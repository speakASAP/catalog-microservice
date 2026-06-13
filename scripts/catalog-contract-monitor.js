#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const smokeScript = path.join(projectRoot, "scripts", "catalog-smoke.js");
const timeoutMs = Number(process.env.CATALOG_MONITOR_TIMEOUT_MS || 120000);

function isEnabled(value) {
  return value === "1" || value === "true" || value === "yes";
}

function runSmokeProfile(name, envPatch) {
  const startedAt = new Date().toISOString();
  const child = spawnSync(process.execPath, [smokeScript], {
    cwd: projectRoot,
    env: { ...process.env, ...envPatch },
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
  });

  const endedAt = new Date().toISOString();
  if (child.error) {
    return {
      name,
      status: "fail",
      startedAt,
      endedAt,
      exitCode: child.status,
      error: child.error.code || "smoke_runner_error",
      failedContracts: [{ contract: "catalog-smoke-runner", message: child.error.message }],
    };
  }

  let smoke = null;
  try {
    smoke = JSON.parse(child.stdout || "{}");
  } catch {
    return {
      name,
      status: "fail",
      startedAt,
      endedAt,
      exitCode: child.status,
      error: "invalid_smoke_json",
      failedContracts: [{ contract: "catalog-smoke-runner", message: "Smoke output was not valid JSON." }],
    };
  }

  const results = Array.isArray(smoke.results) ? smoke.results : [];
  const failedContracts = results
    .filter((result) => result.status === "fail")
    .map((result) => ({
      contract: result.contract,
      statusCode: result.statusCode ?? null,
      message: result.message || null,
    }));

  const skippedContracts = results
    .filter((result) => result.status === "skip")
    .map((result) => ({
      contract: result.contract,
      reason: result.reason || null,
    }));

  return {
    name,
    status: child.status === 0 && failedContracts.length === 0 ? "pass" : "fail",
    startedAt,
    endedAt,
    exitCode: child.status,
    passed: Number(smoke.passed || 0),
    skipped: Number(smoke.skipped || 0),
    failed: Number(smoke.failed || failedContracts.length),
    failedContracts,
    skippedContracts,
  };
}

function main() {
  const profiles = [
    {
      name: "anonymous",
      env: {
        CATALOG_SMOKE_AUTHORIZED: "",
        CATALOG_SMOKE_ENABLE_BAZOS_AUTHORIZED: "",
      },
    },
  ];

  if (isEnabled(process.env.CATALOG_MONITOR_AUTHORIZED)) {
    profiles.push({
      name: "authorized",
      env: {
        CATALOG_SMOKE_AUTHORIZED: "true",
        CATALOG_SMOKE_ENABLE_BAZOS_AUTHORIZED: "",
      },
    });
  }

  if (isEnabled(process.env.CATALOG_MONITOR_INCLUDE_BAZOS_AUTHORIZED)) {
    profiles.push({
      name: "bazos-authorized",
      env: {
        CATALOG_SMOKE_AUTHORIZED: "true",
        CATALOG_SMOKE_ENABLE_BAZOS_AUTHORIZED: "true",
      },
    });
  }

  const profileResults = profiles.map((profile) => runSmokeProfile(profile.name, profile.env));
  const failedProfiles = profileResults.filter((profile) => profile.status === "fail");
  const summary = {
    monitor: "catalog-contract-monitor",
    generatedAt: new Date().toISOString(),
    baseUrl: (process.env.CATALOG_SMOKE_BASE_URL || "https://catalog.alfares.cz").replace(/\/+$/, ""),
    profileCount: profileResults.length,
    passedProfiles: profileResults.length - failedProfiles.length,
    failedProfiles: failedProfiles.length,
    profiles: profileResults,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failedProfiles.length > 0) {
    process.exitCode = 1;
  }
}

main();
