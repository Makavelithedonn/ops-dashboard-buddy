import { createFileRoute } from "@tanstack/react-router";
import { verifyAdmin } from "@/lib/admin-api.server";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

export async function getCardsHandler({ request }: { request: Request }) {
  if (!(await verifyAdmin(request))) {
    return new Response("Unauthorized", { status: 401, headers: cors });
  }

  const workerBase = process.env["WORKER_API_BASE"] ?? "";
  const token = process.env["WORKER_API_TOKEN"] ?? "";
  if (!workerBase) {
    return new Response(JSON.stringify({ error: "WORKER_API_BASE not configured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id) {
      const res = await fetch(`${workerBase}/cards/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: { ...cors, "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
      });
    }

    // list / search
    const q = url.searchParams.get("q") ?? "";
    const page = url.searchParams.get("page") ?? "1";
    const limit = url.searchParams.get("limit") ?? "20";
    const params = new URLSearchParams({ q, page, limit });

    const res = await fetch(`${workerBase}/cards/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...cors, "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}

export async function putCardsHandler({ request }: { request: Request }) {
  if (!(await verifyAdmin(request))) {
    return new Response("Unauthorized", { status: 401, headers: cors });
  }
  const workerBase = process.env["WORKER_API_BASE"] ?? "";
  const token = process.env["WORKER_API_TOKEN"] ?? "";
  if (!workerBase) {
    return new Response(JSON.stringify({ error: "WORKER_API_BASE not configured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400, headers: cors });

    const payload = await request.text();
    const res = await fetch(`${workerBase}/cards/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: payload,
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...cors, "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}

export async function deleteCardsHandler({ request }: { request: Request }) {
  if (!(await verifyAdmin(request))) {
    return new Response("Unauthorized", { status: 401, headers: cors });
  }
  const workerBase = process.env["WORKER_API_BASE"] ?? "";
  const token = process.env["WORKER_API_TOKEN"] ?? "";
  if (!workerBase) {
    return new Response(JSON.stringify({ error: "WORKER_API_BASE not configured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing id", { status: 400, headers: cors });

    const res = await fetch(`${workerBase}/cards/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...cors, "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/admin/cards")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: getCardsHandler,
      PUT: putCardsHandler,
      DELETE: deleteCardsHandler,
    },
  },
});