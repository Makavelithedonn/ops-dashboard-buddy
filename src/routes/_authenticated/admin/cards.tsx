import { createFileRoute } from "@tanstack/react-router";
import { AdminCardsList } from "@/components/admin/cards-list";

export const Route = createFileRoute("/_authenticated/admin/cards")({
  head: () => ({
    meta: [
      { title: "Cards · Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminCardsList,
});
