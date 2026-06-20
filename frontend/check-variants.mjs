import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data: variants, error } = await c
  .from("variants")
  .select("variant_index, status, hash, phash, phash_distance, project_id")
  .order("created_at", { ascending: false })
  .limit(10);

if (error) { console.log("Error:", error.message); process.exit(1); }
if (!variants || variants.length === 0) { console.log("No variants found"); process.exit(0); }

// Group by project
const byProject = {};
for (const v of variants) {
  if (!byProject[v.project_id]) byProject[v.project_id] = [];
  byProject[v.project_id].push(v);
}

for (const [pid, pvariants] of Object.entries(byProject)) {
  console.log(`\n=== Project ${pid.slice(0, 8)}... ===`);
  const hashes = new Set();
  const phashes = new Set();
  for (const v of pvariants) {
    hashes.add(v.hash);
    phashes.add(v.phash);
    const dist = v.phash_distance !== null && v.phash_distance !== undefined ? v.phash_distance : "N/A";
    console.log(`  V${String(v.variant_index).padStart(2, "0")} | status=${v.status} | file_hash=${v.hash || "N/A"} | pHash_dist=${dist}`);
  }
  console.log(`  ---`);
  console.log(`  File hashes uniques: ${hashes.size}/${pvariants.length}`);
  console.log(`  pHashes uniques:     ${phashes.size}/${pvariants.length}`);
  const distances = pvariants.map(v => v.phash_distance).filter(d => d !== null && d !== undefined);
  if (distances.length > 0) {
    console.log(`  pHash distance min=${Math.min(...distances)} max=${Math.max(...distances)} avg=${(distances.reduce((a,b) => a+b, 0) / distances.length).toFixed(1)}`);
    console.log(`  Objectif: distance ≥ 10 → ${distances.every(d => d >= 10) ? "✅ ATTEINT" : "❌ INSUFFISANT (certaines < 10)"}`);
  } else {
    console.log(`  pHash distance: non calculée`);
  }
}
