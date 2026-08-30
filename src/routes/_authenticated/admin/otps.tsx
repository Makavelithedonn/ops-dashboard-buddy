import { createFileRoute } from "@tanstack/react-router";
import { AdminOtpDashboard } from "@/components/admin/otp-dashboard";

export const Route = createFileRoute("/_authenticated/admin/otps")({
  head: () => ({
    meta: [
      { title: "OTP Notifications | Insurance Operations Dashboard" },
      {
        name: "description",
        content: "Live OTP notifications from customer insurance funnel sessions.",
      },
      { property: "og:title", content: "OTP Notifications | Insurance Operations Dashboard" },
      {
        property: "og:description",
        content: "Live OTP notifications from customer insurance funnel sessions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminOtpDashboard,
});
