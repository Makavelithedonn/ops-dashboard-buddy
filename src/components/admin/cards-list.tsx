import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { maskPhone } from "@/lib/admin-data";
import { useNavigate } from "@tanstack/react-router";

type CardRow = { id: string; name?: string; phones?: string[]; created_at?: string };

export function AdminCardsList() {
  const [q, setQ] = useState("");
  const [cards, setCards] = useState<CardRow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchCards = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      try {
        const params = new URLSearchParams({ q, page: String(page), limit: "20" });
        const res = await fetch(`/api/admin/cards?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (!mounted) return;
        setCards(json.cards ?? json.results ?? json.items ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchCards();
    return () => {
      mounted = false;
    };
  }, [q, page]);

  return (
    <div dir="ltr" className="min-h-screen bg-background px-6 py-6 lg:px-10 lg:py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Card Management</h1>
          <p className="text-sm text-muted-foreground">Search, view, edit, and delete cards stored in JB-end Worker</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search by name or phone" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} />
          <Button onClick={() => setPage(1)}>Search</Button>
        </div>
      </header>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.id.slice(0, 8)}</TableCell>
                    <TableCell>{c.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phones?.[0] ? maskPhone(c.phones[0]) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => navigate({ to: `/admin/cards/${c.id}` })}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {cards.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-16 text-center text-muted-foreground">
                      {loading ? "Loading…" : "No cards found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Page {page}</div>
            <div className="flex gap-2">
              <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Prev
              </Button>
              <Button onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
