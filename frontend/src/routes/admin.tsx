import { me } from "@/lib/auth.functions";
import { createFileRoute, Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Panel — HomeFixr" }] }),
  component: AdminLayoutParent,
});

function AdminLayoutParent() {
  const { data: user, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => me(), staleTime: 30_000 });
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1F3A63] border-t-transparent" />
      </div>
    );
  }

  // Allow admin login page to render without layout wrapper
  if (location.pathname === "/admin/login" || location.pathname === "/admin/login/") {
    if (user && user.role === "admin") {
      return <Navigate to="/admin/users" />;
    }
    return <Outlet />;
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/admin/login" />;
  }

  if (location.pathname === "/admin" || location.pathname === "/admin/") {
    return <Navigate to="/admin/users" />;
  }

  return <AdminLayout />;
}