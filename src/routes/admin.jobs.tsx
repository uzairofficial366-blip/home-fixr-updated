import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meQueryOptions } from "@/components/nav";
import { adminListJobs, adminCancelJob } from "@/lib/admin.functions";
import { StatusBadge } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, XCircle, Eye, MapPin, ChevronLeft, ChevronRight, Wrench } from "lucide-react";

export const Route = createFileRoute("/admin/jobs")({
  head: () => ({ meta: [{ title: "Jobs — HomeFixr Admin" }] }),
  component: AdminJobsPage,
});

type Job = {
  id: number; title: string; category: string; status: string; budget: number;
  address: string; created_at: string; homeowner_name: string; homeowner_email: string;
  bid_count: number; accepted_bids: number;
};

function AdminJobsPage() {
  const { data: user } = useQuery(meQueryOptions());
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [viewJob, setViewJob] = useState<Job | null>(null);
  const [cancelJob, setCancelJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);

  const doCancel = useServerFn(adminCancelJob);

  const { data, isLoading } = useQuery({
    queryKey: ["adminJobs", search, status, page],
    queryFn: () => adminListJobs({ data: { search: search || undefined, status, page } }),
    placeholderData: (prev) => prev,
  });

  if (user && user.role !== "admin") return <Navigate to="/dashboard" />;

  const jobs = (data?.jobs ?? []) as Job[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleCancel = async () => {
    if (!cancelJob) return;
    setBusy(true);
    try {
      await doCancel({ data: { jobId: cancelJob.id } });
      toast.success("Job cancelled");
      qc.invalidateQueries({ queryKey: ["adminJobs"] });
      qc.invalidateQueries({ queryKey: ["adminDashStats"] });
      setCancelJob(null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search jobs…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground/40" />
              <p className="font-semibold">No jobs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Job", "Category", "Homeowner", "Budget", "Bids", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium">{j.title}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{j.address}</p>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{j.category}</td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium">{j.homeowner_name}</p>
                        <p className="text-xs text-muted-foreground">{j.homeowner_email}</p>
                      </td>
                      <td className="px-5 py-3.5 font-medium">PKR {Number(j.budget || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{j.bid_count}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={j.status} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewJob(j)}><Eye className="h-4 w-4" /></Button>
                          {["open", "in_progress"].includes(j.status) && (
                            <Button variant="ghost" size="sm" onClick={() => setCancelJob(j)}><XCircle className="h-4 w-4 text-destructive" /></Button>
                          )}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {page * 20 + 1}–{Math.min((page + 1) * 20, total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* View dialog */}
      <Dialog open={!!viewJob} onOpenChange={() => setViewJob(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Job Details</DialogTitle></DialogHeader>
          {viewJob && (
            <div className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">Title</p><p className="font-semibold">{viewJob.title}</p></div>
                <div><p className="text-xs text-muted-foreground">Category</p><p className="font-semibold">{viewJob.category}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={viewJob.status} /></div>
                <div><p className="text-xs text-muted-foreground">Budget</p><p className="font-semibold">PKR {Number(viewJob.budget || 0).toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Bids</p><p className="font-semibold">{viewJob.bid_count}</p></div>
                <div><p className="text-xs text-muted-foreground">Posted</p><p className="font-semibold">{new Date(viewJob.created_at).toLocaleDateString()}</p></div>
                <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Address</p><p className="font-semibold">{viewJob.address}</p></div>
                <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Homeowner</p><p className="font-semibold">{viewJob.homeowner_name} · {viewJob.homeowner_email}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <AlertDialog open={!!cancelJob} onOpenChange={() => setCancelJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Job</AlertDialogTitle>
            <AlertDialogDescription>Cancel "{cancelJob?.title}"? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {busy ? "Cancelling…" : "Cancel Job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
