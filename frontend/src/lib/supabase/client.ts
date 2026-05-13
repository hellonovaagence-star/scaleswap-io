import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[Supabase] Missing env vars — NEXT_PUBLIC_SUPABASE_URL:",
      supabaseUrl ? "OK" : "MISSING",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY:",
      supabaseAnonKey ? "OK" : "MISSING"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
