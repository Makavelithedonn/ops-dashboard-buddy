import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

type CardModel = { id: string; name?: string; phones?: string[] };

export function AdminCardDetail({ cardId }: { cardId: string }) {
  const [card, setCard] = useState<CardModel | null>(null);
  const [name, setName] = useState("");
  const [phones, setPhones] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchCard = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      try {
        const res = await fetch(`/api/admin/cards?id=${encodeURIComponent(cardId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!mounted) return;
        const json = await res.json();
        setCard(json.card ?? json);
        setName(json.card?.name ?? json.name ?? "");
        setPhones((json.card?.phones ?? json.phones ?? []).join(","));
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchCard();
    return () => {
      mounted = false;
    };
  }, [cardId]);

  const onSave = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    try {
      const payload = { name, phones: phones.split(",").map((s) => s.trim()).filter(Boolean) };
      const res = await fetch(`/api/admin/cards?id=${encodeURIComponent(cardId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Saved");
      navigate({ to: "/admin/cards" });
    } catch (err) {
      toast.error("Save failed");
      console.error(err);
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this card? This cannot be undone.")) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    try {
      const res = await fetch(`/api/admin/cards?id=${encodeURIComponent(cardId)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Deleted");
      navigate({ to: "/admin/cards" });
    } catch (err) {
      toast.error("Delete failed");
      console.error(err);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (!card) return <div className="p-6 text-muted-foreground">No card found.</div>;

  return (
    <div dir="ltr" className="min-h-screen bg-background px-6 py-6 lg:px-10 lg:py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Card: {card.id.slice(0, 8)}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Phones (comma separated)</label>
              <Input value={phones} onChange={(e) => setPhones((e.target as HTMLInputElement).value)} />
            </div>

            <div className="flex gap-2">
              <Button onClick={onSave}>Save</Button>
              <Button variant="destructive" onClick={onDelete}>Delete</Button>
              <Button variant="ghost" onClick={() => navigate({ to: "/admin/cards" })}>Back</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
