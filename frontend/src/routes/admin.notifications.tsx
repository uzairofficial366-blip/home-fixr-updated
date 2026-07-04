import { me } from "@/lib/auth.functions";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminGetNotifications,
  adminMarkNotificationRead,
  adminMarkAllNotificationsRead,
} from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Bell, CheckCheck, BellOff, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — HomeFixr Admin" }] }),
  component: AdminNotificationsPage,
});

type Notification = {
  id: number;
  user_id: number;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  user_name: string;
  user_email: string;
  user_role: string;
};

function AdminNotificationsPage() {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => me(), staleTime: 30_000 });
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const doMarkRead = adminMarkNotificationRead;
  const doMarkAll = adminMarkAllNotificationsRead;

  const { data, isLoading } = useQuery({
    queryKey: ["adminNotifications", filter, page],
    queryFn: () => adminGetNotifications({ data: { page } }),
    placeholderData: (prev) => prev,
  });

  if (user && user.role !== "admin") return <Navigate to="/dashboard" />;

  const notifications = (data?.notifications ?? []) as Notification[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const filtered =
    filter === "all"
      ? notifications
      : filter === "unread"
        ? notifications.filter((n) => !n.is_read)
        : notifications.filter((n) => n.is_read);

  const handleMarkRead = async (id: number) => {
    try {
      await doMarkRead({ data: { notificationId: id } });
      qc.invalidateQueries({ queryKey: ["adminNotifications"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleMarkAll = async () => {
    try {
      await doMarkAll();
      toast.success("All notifications marked as read");
      qc.invalidateQueries({ queryKey: ["adminNotifications"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilter("all");
              setPage(0);
            }}
            className={filter === "all" ? "bg-[#1F3A63] text-white" : ""}
          >
            All
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilter("unread");
              setPage(0);
            }}
            className={filter === "unread" ? "bg-[#1F3A63] text-white" : ""}
          >
            Unread
          </Button>
          <Button
            variant={filter === "read" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFilter("read");
              setPage(0);
            }}
            className={filter === "read" ? "bg-[#1F3A63] text-white" : ""}
          >
            Read
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleMarkAll}>
          <CheckCheck className="h-4 w-4 mr-2" /> Mark All Read
        </Button>
      </div>

      <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <BellOff className="h-12 w-12 text-muted-foreground/40" />
              <p className="font-semibold">No notifications found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 p-4 transition-colors hover:bg-muted/20 ${!n.is_read ? "bg-brand-soft/30" : ""}`}
                >
                  <div
                    className={`mt-0.5 rounded-lg p-2 ${n.is_read ? "bg-muted/50 text-muted-foreground" : "bg-[#1F3A63]/10 text-[#1F3A63]"}`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {n.user_name} · {n.user_role}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkRead(n.id)}
                      className="shrink-0 text-accent-orange hover:text-accent-orange"
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {page * 20 + 1}–{Math.min((page + 1) * 20, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
