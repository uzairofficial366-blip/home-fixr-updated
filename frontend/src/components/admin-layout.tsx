import { Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import {
  Users,
  Briefcase,
  Clock,
  Star,
  BarChart3,
  Settings,
  Shield,
  UserCheck,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  Tag,
  Wrench,
  UserCircle2,
  TrendingUp,
} from "lucide-react";
const homefixrLogo = "/Home Fixr Icon-128x128.jpg";

const NAV = [
  { title: "Customers", icon: Users, path: "/admin/users" },
  { title: "Providers", icon: Briefcase, path: "/admin/providers" },
  { title: "Jobs", icon: Wrench, path: "/admin/jobs" },
  { title: "Bids", icon: Clock, path: "/admin/bids" },
  { title: "Revenue", icon: TrendingUp, path: "/admin/payments" },
  { title: "Categories", icon: Tag, path: "/admin/categories" },
  { title: "Reviews", icon: Star, path: "/admin/reviews" },
  { title: "Reports", icon: BarChart3, path: "/admin/reports" },
  { title: "Notifications", icon: Bell, path: "/admin/notifications" },
  { title: "AI Verification", icon: UserCheck, path: "/admin/verifications" },
  { title: "Admins", icon: Shield, path: "/admin/admins" },
  { title: "Settings", icon: Settings, path: "/admin/settings" },
  { title: "Profile", icon: UserCircle2, path: "/admin/profile" },
];

export function AdminLayout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      nav({ to: "/admin/login" });
      toast.success("Logged out");
    } catch {
      toast.error("Logout failed");
    }
  };

  const pageTitle =
    NAV.find(
      (n) =>
        location.pathname === n.path ||
        (n.path !== "/admin" && location.pathname.startsWith(n.path)),
    )?.title ?? "Admin Panel";

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-white transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <Link to="/admin" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <img
              src={homefixrLogo}
              alt="HomeFixr Logo"
              className="h-9 w-9 object-contain mix-blend-multiply"
            />
            <div>
              <p className="text-base font-bold text-[#1F3A63] leading-none">HomeFixr</p>
              <p className="text-[11px] text-muted-foreground">Admin Panel</p>
            </div>
          </Link>
          <button
            className="rounded-lg p-1.5 hover:bg-muted lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV.map((item) => {
            const active =
              location.pathname === item.path ||
              (item.path !== "/admin" && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-[#1F3A63] text-white shadow-sm"
                    : "text-muted-foreground hover:bg-[#1F3A63]/8 hover:text-[#1F3A63]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.title}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-border p-4 space-y-3">
          <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5">
            <p className="text-sm font-semibold text-foreground truncate">{user?.name || "Admin"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            <span className="mt-1 inline-flex items-center rounded-full bg-[#1F3A63]/10 px-2 py-0.5 text-[11px] font-medium text-[#1F3A63]">
              Administrator
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 hover:bg-muted lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.name || "Admin"}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
