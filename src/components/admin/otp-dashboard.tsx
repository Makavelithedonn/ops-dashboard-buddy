import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, ShieldHalf } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/lib/database.types";

type OtpRow = Database["public"]["Tables"]["otps"]["Row"];

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

function playOtpChime() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const notes = [880, 1320, 1760, 880];
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.1;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const shifted = new Date(d.getTime() + 3 * 60 * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h24 = shifted.getUTCHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? "AM" : "PM";
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate(),
  )} ${pad(h12)}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())} ${ampm}`;
}

export function AdminOtpDashboard() {
  const [otps, setOtps] = useState<OtpRow[]>([]);

  useEffect(() => {
    let mounted = true;

    const fetchOtps = async () => {
      const { data } = await supabase
        .from("otps")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (mounted && data) setOtps(data);
    };

    fetchOtps();

    const channel = supabase
      .channel("realtime_otps")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "otps" },
        (payload) => {
          const row = payload.new as OtpRow;
          playOtpChime();
          toast.info("New OTP received", {
            description: `${row.otp_code} · ${row.session_id.slice(0, 8)}`,
          });
          setOtps((prev) => [row, ...prev]);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const markRead = async (id: string) => {
    const { error } = await supabase.from("otps").update({ read: true }).eq("id", id);
    if (error) {
      toast.error("Failed to mark as read");
      return;
    }
    setOtps((prev) => prev.map((o) => (o.id === id ? { ...o, read: true } : o)));
  };

  const unreadCount = otps.filter((o) => !o.read).length;

  return (
    <div dir="ltr" className="min-h-screen bg-background px-6 py-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
            <ShieldHalf className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">OTP Notifications</h1>
            <p className="text-sm text-muted-foreground">Live one-time passwords from customer sessions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl bg-foreground px-3 py-2 text-xs font-medium text-background">
            <Bell className="size-3.5" />
            {unreadCount} unread
          </span>
        </div>
      </header>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-lg">Incoming OTPs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Session / Phone</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-xl tracking-widest">OTP Code</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otps.map((item) => (
                  <TableRow key={item.id} className={item.read ? "opacity-60" : undefined}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatTime(item.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{item.session_id}</div>
                      {item.phone_number && (
                        <div className="text-xs text-muted-foreground">{item.phone_number}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {item.source ?? "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xl font-semibold tracking-widest text-foreground">
                      {item.otp_code}
                    </TableCell>
                    <TableCell className="text-right">
                      {!item.read && (
                        <Button size="sm" variant="outline" onClick={() => markRead(item.id)}>
                          <CheckCircle2 className="mr-1.5 size-4" />
                          Mark read
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {otps.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center text-muted-foreground">
                      No OTPs received yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
