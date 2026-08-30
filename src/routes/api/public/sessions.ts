import { createFileRoute } from "@tanstack/react-router";
import { makeServiceClient, verifyAdmin } from "@/lib/admin-api.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

export const Route = createFileRoute("/api/public/sessions")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }: { request: Request }) => {
        if (!(await verifyAdmin(request))) {
          return new Response("Unauthorized", { status: 401, headers: cors });
        }
        const supabase = makeServiceClient();
        const { data, error } = await supabase
          .from("tracked_sessions")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(200);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ sessions: data ?? [] }), {
          headers: {
            ...cors,
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
