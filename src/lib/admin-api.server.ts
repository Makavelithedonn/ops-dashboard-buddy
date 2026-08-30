import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Service-role client: used only inside server route handlers. */
export function makeServiceClient(): SupabaseClient {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/**
 * Verifies the request carries a bearer token belonging to a user with the
 * admin role. Returns the user id, or null when the caller is not an admin.
 */
export async function verifyAdmin(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  const admin = makeServiceClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();

  return roles ? data.user.id : null;
}
