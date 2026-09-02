import { createFileRoute } from "@tanstack/react-router";
import { AdminCardDetail } from "@/components/admin/card-detail";

export const Route = createFileRoute("/_authenticated/admin/cards/$cardId")({
  component: ({ params }: any) => <AdminCardDetail cardId={params.cardId} />,
});
