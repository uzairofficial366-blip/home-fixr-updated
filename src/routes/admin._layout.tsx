import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin-layout";

export const Route = createFileRoute("/admin/_layout")({
  component: AdminLayout,
});
