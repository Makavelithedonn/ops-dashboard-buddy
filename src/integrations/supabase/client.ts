import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const env = import.meta.env as Record<string, string | undefined>;
const proc = (typeof process !== "undefined" ? process.env : {}) as Record<
  string,
  string | undefined
>;
const SUPABASE_URL = env["VITE_SUPABASE_URL"] ?? proc["SUPABASE_URL"] ?? "";
const SUPABASE_PUBLISHABLE_KEY =
  env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? proc["SUPABASE_PUBLISHABLE_KEY"] ?? "";

// sb_publishable_* keys are opaque (not JWTs). The default supabase-js client
// sends them as Authorization: Bearer <key>, which PostgREST rejects with
// "Expected 3 parts in JWT; got 1". Strip that header and send apikey only.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
  global: {
    fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (
        SUPABASE_PUBLISHABLE_KEY.startsWith("sb_") &&
        headers.get("Authorization") === `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      ) {
        headers.delete("Authorization");
      }
      headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
      return fetch(input, { ...init, headers });
    },
  },
});
