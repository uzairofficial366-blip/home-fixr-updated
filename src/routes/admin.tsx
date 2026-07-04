import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { meQueryOptions } from "@/components/nav";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Panel — HomeFixr" }] }),
  component: AdminRedirect,
});

function AdminRedirect() {
  const { data: user } = useQuery(meQueryOptions());
  if (user && user.role !== "admin") return <Navigate to="/dashboard" />;
  return <Navigate to="/admin/users" />;
}