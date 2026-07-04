import { me } from "@/lib/auth.functions";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminListUsers, adminSuspendUser, adminDeleteUser } from "@/lib/admin.functions";
import { StatusBadge } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, UserX, Trash2, Mail, Calendar, ChevronLeft, ChevronRight, Users } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Customers — HomeFixr Admin" }] }),
  component: AdminUsersPage,
});

type User = { id: number; email: string; name: string; role: string; phone: string | null; created_at: string; verification_status: string | null; job_count: number; bid_count: number };

function AdminUsersPage() {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => me(), staleTime: 30_000 });
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ user: User; action: "suspend" | "delete" } | null>(null);
  const [busy, setBusy] = useState(false);

  const doSuspend = adminSuspendUser;
  const doDelete = adminDeleteUser;

  const { data, isLoading } = useQuery({
    queryKey: ["adminUsers", search, role, page],
    queryFn: () => adminListUsers({ data: { search: search || undefined, role, page } }),
    placeholderData: (prev) => prev,
  });

  if (user && user.role !== "admin") return <Navigate to="/dashboard" />;

  const users = (data?.users ?? []) as User[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.action === "suspend") {
        await doSuspend({ data: { userId: confirm.user.id } });
        toast.success(`${confirm.user.name} suspended`);
      } else {
        await doDelete({ data: { userId: confirm.user.id } });
        toast.success(`${confirm.user.name} deleted`);
      }
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
      qc.invalidateQueries({ queryKey: ["adminDashStats"] });
      setConfirm(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
            </div>
            <Select value={role} onValueChange={(v) => { setRole(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="homeowner">Homeowners</SelectItem>
                <SelectItem value="provider">Providers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40" />
              <p className="font-semibold">No users found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["User", "Role", "Phone", "Jobs / Bids", "Joined", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium">{u.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{u.email}</p>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={u.role} /></td>
                      <td className="px-5 py-3.5 text-muted-foreground">{u.phone || "—"}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{u.job_count} / {u.bid_count}</td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />{new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" title="Suspend" onClick={() => setConfirm({ user: u, action: "suspend" })}>
                            <UserX className="h-4 w-4 text-yellow-600" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Delete" onClick={() => setConfirm({ user: u, action: "delete" })}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {page * 20 + 1}–{Math.min((page + 1) * 20, total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <AlertDialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.action === "delete" ? "Delete User" : "Suspend User"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "delete"
                ? `Permanently delete ${confirm?.user.name}? This cannot be undone.`
                : `Suspend ${confirm?.user.name}? They will lose access to their account.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={handleConfirm} className={confirm?.action === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
              {busy ? "Processing…" : confirm?.action === "delete" ? "Delete" : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
