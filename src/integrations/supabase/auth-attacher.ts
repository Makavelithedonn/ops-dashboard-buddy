import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

/**
 * Attaches the current Supabase user's bearer token to every server-function
 * request. Server functions using `requireSupabaseAuth` middleware rely on
 * this header to identify the caller.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const headers: Record<string, string> = {};
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      // no session — proceed unauthenticated
    }
    return next({ sendContext: {}, headers });
  },
);
