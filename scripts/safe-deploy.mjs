#!/usr/bin/env node
// ============================================================================
// safe-deploy.mjs — the ONLY safe way to deploy in the shared Downloads tree.
//
// Why this exists: the Vercel CLI walks UP the directory tree looking for a
// `.vercel` link. A stray `C:\Users\yurik\Downloads\.vercel` (linked to
// portlev-site) keeps getting recreated by other sessions, so a plain
// `vercel --prod` from ANY app subfolder can silently deploy onto the WRONG
// project (this took portlev.com down three times).
//
// This wrapper removes that class of bug entirely:
//   1. Reads THIS app's own .vercel/project.json (the source of truth).
//   2. Deletes any stray `.vercel` in the parent dir that points elsewhere.
//   3. Force-pins VERCEL_ORG_ID + VERCEL_PROJECT_ID from the local link. These
//      env vars OVERRIDE the link file and the directory walk-up, so the
//      deploy CANNOT resolve to another project no matter what.
//
// Usage:  npm run deploy            (production)
//         npm run deploy -- --prod=false   (preview; pass extra vercel args)
// ============================================================================

import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const linkPath = path.join(projectRoot, ".vercel", "project.json");

if (!existsSync(linkPath)) {
  console.error(
    `✗ No .vercel/project.json in ${projectRoot}.\n` +
      `  Link this folder first:  VERCEL_ORG_ID=... VERCEL_PROJECT_ID=... vercel link --yes`,
  );
  process.exit(1);
}

const link = JSON.parse(readFileSync(linkPath, "utf8"));
const { orgId, projectId, projectName } = link;
if (!orgId || !projectId) {
  console.error("✗ .vercel/project.json is missing orgId or projectId.");
  process.exit(1);
}

// Remove any stray parent .vercel that points at a DIFFERENT project — the
// exact foot-gun the CLI walks up to.
const parentLink = path.join(projectRoot, "..", ".vercel");
try {
  const parentJson = path.join(parentLink, "project.json");
  if (existsSync(parentJson)) {
    const parent = JSON.parse(readFileSync(parentJson, "utf8"));
    if (parent.projectId !== projectId) {
      rmSync(parentLink, { recursive: true, force: true });
      console.log(`• Removed stray parent link -> ${parent.projectName ?? parent.projectId}`);
    }
  }
} catch {
  /* best-effort cleanup; the pin below is the real guarantee */
}

const extra = process.argv.slice(2);
const args = extra.length ? extra : ["--prod", "--yes"];

console.log(`• Deploying to PINNED project: ${projectName} (${projectId})`);
console.log(`• vercel ${args.join(" ")}`);

const child = spawn("vercel", args, {
  stdio: "inherit",
  shell: true, // resolves the vercel binary on Windows + posix
  env: { ...process.env, VERCEL_ORG_ID: orgId, VERCEL_PROJECT_ID: projectId },
});

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (e) => {
  console.error("✗ Failed to launch vercel:", e.message);
  process.exit(1);
});
