#!/usr/bin/env npx tsx
/**
 * Purge orphaned files from Supabase Storage bucket "videos".
 *
 * Compares storage folders ({user_id}/{project_id}/) against
 * existing projects in the DB. Deletes any folder whose project
 * no longer exists — plus optionally nukes ALL files if --all flag.
 *
 * Usage:
 *   npx tsx scripts/purge-storage.ts          # orphans only
 *   npx tsx scripts/purge-storage.ts --all    # wipe entire bucket
 *   npx tsx scripts/purge-storage.ts --dry    # preview, don't delete
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BUCKET = "videos";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry");
const NUKE_ALL = args.includes("--all");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  console.error("Run from frontend/ or set env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function listAllFiles(prefix: string): Promise<string[]> {
  const paths: string[] = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) {
    console.error(`  Error listing ${prefix}:`, error.message);
    return paths;
  }
  for (const item of data ?? []) {
    const fullPath = prefix ? `${prefix}${item.name}` : item.name;
    if (item.id === null) {
      // It's a folder — recurse
      const nested = await listAllFiles(`${fullPath}/`);
      paths.push(...nested);
    } else {
      paths.push(fullPath);
    }
  }
  return paths;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"} | ${NUKE_ALL ? "DELETE ALL" : "ORPHANS ONLY"}\n`);

  // 1. List top-level folders (user IDs)
  const { data: userFolders, error: ufErr } = await supabase.storage.from(BUCKET).list("", { limit: 100 });
  if (ufErr) {
    console.error("Failed to list bucket:", ufErr.message);
    process.exit(1);
  }

  if (!userFolders || userFolders.length === 0) {
    console.log("Bucket is already empty.");
    return;
  }

  // 2. Get all existing project IDs from DB
  const { data: dbProjects } = await supabase.from("projects").select("id");
  const existingIds = new Set((dbProjects ?? []).map((p: { id: string }) => p.id));
  console.log(`DB has ${existingIds.size} projects\n`);

  let totalFiles = 0;
  let toDelete: string[] = [];

  for (const userFolder of userFolders) {
    if (userFolder.id !== null) continue; // skip files at root
    const userId = userFolder.name;

    // List project folders under this user
    const { data: projectFolders } = await supabase.storage.from(BUCKET).list(`${userId}/`, { limit: 1000 });

    for (const pf of projectFolders ?? []) {
      if (pf.id !== null) continue;
      const projectId = pf.name;
      const prefix = `${userId}/${projectId}/`;

      const files = await listAllFiles(prefix);
      totalFiles += files.length;

      const isOrphan = !existingIds.has(projectId);

      if (NUKE_ALL || isOrphan) {
        const label = isOrphan ? "ORPHAN" : "EXISTS";
        console.log(`  [${label}] ${prefix} → ${files.length} file(s)`);
        toDelete.push(...files);
      } else {
        console.log(`  [KEEP]   ${prefix} → ${files.length} file(s)`);
      }
    }
  }

  console.log(`\nTotal files in bucket: ${totalFiles}`);
  console.log(`Files to delete: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log("Nothing to purge.");
    return;
  }

  if (DRY_RUN) {
    console.log("\n--dry flag set. No files deleted.");
    return;
  }

  // Delete in batches of 100 (Supabase limit)
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      console.error(`  Batch ${i / 100 + 1} error:`, error.message);
    } else {
      console.log(`  Deleted batch ${i / 100 + 1} (${batch.length} files)`);
    }
  }

  const freed = toDelete.length;
  console.log(`\nDone. ${freed} files removed from storage.`);
}

main().catch(console.error);
