import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [
      { title: "Admin Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => null,
});
