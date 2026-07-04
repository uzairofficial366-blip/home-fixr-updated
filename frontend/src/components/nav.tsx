import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { notificationsService } from "@/services/notifications.service";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  LayoutDashboard,
  PlusCircle,
  Search,
  UserCircle2,
  Bell,
  BriefcaseBusiness,
  Menu,
  X,
} from "lucide-react";

type Notification = {
  id: number;
  userId: number;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export function Nav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    qc.clear();
    nav({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 font-bold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white shadow-md">
            <img
              src="/Home Fixr Icon-128x128.jpg"
              alt="HomeFixr Logo"
              className="h-full w-full object-contain p-1"
            />
          </span>
          <span className="text-xl tracking-tight">
            <span className="text-primary">Home</span>
            <span className="text-accent-orange">Fixr</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {user && (
            <>
              <Link to="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-foreground hover:text-accent-orange hover:bg-muted"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              {user.role === "homeowner" && (
                <Link to="/jobs/new">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-foreground hover:text-accent-orange hover:bg-muted"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Post a job
                  </Button>
                </Link>
              )}
              {user.role === "provider" && (
                <>
                  <Link to="/browse">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-foreground hover:text-accent-orange hover:bg-muted"
                    >
                      <Search className="h-4 w-4" />
                      Browse jobs
                    </Button>
                  </Link>
                  <Link to="/jobs/applied">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-foreground hover:text-accent-orange hover:bg-muted"
                    >
                      <BriefcaseBusiness className="h-4 w-4" />
                      Jobs Applied
                    </Button>
                  </Link>
                  <Link to="/provider">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-foreground hover:text-accent-orange hover:bg-muted"
                    >
                      <UserCircle2 className="h-4 w-4" />
                      Profile
                    </Button>
                  </Link>
                </>
              )}
              {user.role === "admin" && (
                <Link to="/admin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-foreground hover:text-accent-orange hover:bg-muted"
                  >
                    Admin
                  </Button>
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {(user.role === "provider" || user.role === "homeowner") && <NotificationBell />}
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.name} ·{" "}
                <span className="capitalize font-medium text-foreground">{user.role}</span>
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-primary text-primary hover:bg-accent-orange hover:text-white hover:border-accent-orange"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth" search={{ mode: "login" }} className="hidden sm:block">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-foreground hover:text-accent-orange hover:bg-muted"
                >
                  Sign in
                </Button>
              </Link>
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button
                  size="sm"
                  className="bg-accent-orange hover:bg-orange-600 text-white shadow-md"
                >
                  Get started
                </Button>
              </Link>
            </>
          )}

          {/* Mobile menu button */}
          <button
            className="lg:hidden rounded-lg p-2 text-foreground hover:bg-muted"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-white lg:hidden animate-slide-up">
          <div className="container mx-auto px-4 py-4 space-y-2">
            {user ? (
              <>
                <Link to="/dashboard" className="block" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-foreground hover:text-accent-orange">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                {user.role === "homeowner" && (
                  <Link to="/jobs/new" className="block" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-foreground hover:text-accent-orange">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Post a job
                    </Button>
                  </Link>
                )}
                {user.role === "provider" && (
                  <>
                    <Link to="/browse" className="block" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-foreground hover:text-accent-orange">
                        <Search className="h-4 w-4 mr-2" />
                        Browse jobs
                      </Button>
                    </Link>
                    <Link to="/jobs/applied" className="block" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-foreground hover:text-accent-orange">
                        <BriefcaseBusiness className="h-4 w-4 mr-2" />
                        Jobs Applied
                      </Button>
                    </Link>
                    <Link to="/provider" className="block" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-foreground hover:text-accent-orange">
                        <UserCircle2 className="h-4 w-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                  </>
                )}
                {user.role === "admin" && (
                  <Link to="/admin" className="block" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-foreground hover:text-accent-orange">
                      Admin
                    </Button>
                  </Link>
                )}
                <Button
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-accent-orange hover:text-white"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth" search={{ mode: "login" }} className="block" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-foreground hover:text-accent-orange">
                    Sign in
                  </Button>
                </Link>
                <Link to="/auth" search={{ mode: "signup" }} className="block" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-accent-orange hover:bg-orange-600 text-white">
                    Get started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: count = 0, refetch: refetchCount } = useQuery({
    queryKey: ["notifCount"],
    queryFn: () => notificationsService.getUnreadCount(),
    refetchInterval: 15_000,
  });
  const { data: notifications = [], refetch: refetchList } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsService.listNotifications(),
    enabled: open,
    staleTime: 0,
  });

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkRead = async (id: number) => {
    await notificationsService.markRead(id);
    qc.invalidateQueries({ queryKey: ["notifCount"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleMarkAll = async () => {
    await notificationsService.markAllRead();
    qc.invalidateQueries({ queryKey: ["notifCount"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const countValue = typeof count === "object" && count !== null ? (count as any).count || 0 : count;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            refetchCount();
            refetchList();
          }
        }}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-white hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-foreground" />
        {countValue > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {countValue > 9 ? "9+" : countValue}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-white shadow-elevated animate-scale-in">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {countValue > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-accent-orange hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {(notifications as Notification[]).length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              (notifications as Notification[]).map((n: Notification) => (
                <div
                  key={n.id}
                  className={`border-b border-border/50 px-4 py-3 last:border-0 ${!n.isRead ? "bg-brand-soft/30" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-foreground">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="mt-0.5 shrink-0 text-[10px] text-accent-orange hover:underline font-medium"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  {n.link && (
                    <Link
                      to={n.link}
                      onClick={() => {
                        handleMarkRead(n.id);
                        setOpen(false);
                      }}
                      className="mt-1 text-[10px] font-medium text-accent-orange hover:underline"
                    >
                      View →
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
