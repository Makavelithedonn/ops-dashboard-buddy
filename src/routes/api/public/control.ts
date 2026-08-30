import { createFileRoute } from "@tanstack/react-router";
import { makeServiceClient, verifyAdmin } from "@/lib/admin-api.server";
import { z } from "zod";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

const BodySchema = z.object({
  sid: z.string().min(4).max(64),
  // "approve" | "reject" | "block" | any path starting with "/"
  directive: z.string().min(1).max(200),
});

function makeClient() {
  return makeServiceClient();
}

export const Route = createFileRoute("/api/public/control")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        if (!(await verifyAdmin(request))) {
          return new Response("Unauthorized", { status: 401, headers: cors });
        }
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return new Response("Bad JSON", { status: 400, headers: cors });
        }
        const parsed = BodySchema.safeParse(json);
        if (!parsed.success) {
          return new Response("Invalid payload", { status: 400, headers: cors });
        }
        const { sid, directive } = parsed.data;
        const supabase = makeClient();
        const nonce =
          (globalThis.crypto?.randomUUID?.() ??
            Math.random().toString(36).slice(2) + Date.now().toString(36));
        const update: Record<string, unknown> = {
          admin_directive: directive,
          directive_nonce: nonce,
          awaiting_approval: false,
          directive_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (directive === "block") update["state"] = "blocked";
        if (directive.startsWith("/")) update["current_page"] = directive;

        const { error } = await supabase
          .from("tracked_sessions")
          .update(update)
          .eq("session_id", sid);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true, nonce }), {
          headers: { ...cors, "Content-Type": "application/json" },
        });
      },
    },
  },
});
