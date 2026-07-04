import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meQueryOptions } from "@/components/nav";
import { adminListProviders, adminVerifyProvider, adminSuspendProvider } from "@/lib/admin.functions";
import { StatusBadge } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldX, UserX, Star, Briefcase, ChevronLeft, ChevronRight, Mail, Calendar } from "lucide-react";

export const Route = createFileRoute("/admin/providers")({
  head: () => ({ meta: [{ title: "Providers — HomeFixr Admin" }] }),
  component: AdminProvidersPage,
});

type Provider = {
  id: number; email: string; name: string; phone: string | null; created_at: string;
  verification_status: string; bio: string; categories: string[]; hourly_rate: number;
  years_experience: number; is_available: boolean; avg_rating: number;
  review_count: number; completed_jobs: number; total_bids: number;
};

function AdminProvidersPage() {
  const { data: user } = useQuery(meQueryOptions());
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [verifyTarget, setVerifyTarget] = useState<Provider | null>(null);
  const [verifyDecision, setVerifyDecision] = useState<"verified" | "rejected">("verified");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<Provider | null>(null);
  const [busy, setBusy] = useState(false);

  const doVerify = useServerFn(adminVerifyProvider);
  const doSuspend = useServerFn(adminSuspendProvider);

  const { data, isLoading } = useQuery({
    queryKey: ["adminProviders", search, status, page],
    queryFn: () => adminListProviders({ data: { search: search || undefined, status, page } }),
    placeholderData: (prev) => prev,
  });

  if (user && user.role !== "admin") return <Navigate to="/dashboard" />;

  const providers = (data?.providers ?? []) as Provider[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleVerify = async () => {
    if (!verifyTarget) return;
    if (verifyDecision === "rejected" && !verifyNotes.trim()) { toast.error("Please provide a rejection reason"); return; }
    setBusy(true);
    try {
      await doVerify({ data: { providerId: verifyTarget.id, decision: verifyDecision, notes: verifyNotes || undefined } });
      toast.success(`Provider ${verifyDecision}`);
      qc.invalidateQueries({ queryKey: ["adminProviders"] });
      qc.invalidateQueries({ queryKey: ["adminDashStats"] });
      setVerifyTarget(null);
      setVerifyNotes("");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setBusy(true);
    try {
      await doSuspend({ data: { providerId: suspendTarget.id } });
      toast.success(`${suspendTarget.name} suspended`);
      qc.invalidateQueries({ queryKey: ["adminProviders"] });
      setSuspendTarget(null);
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
              <Input placeholder="Search providers…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : providers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground/40" />
              <p className="font-semibold">No providers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Provider", "Verification", "Rating", "Jobs", "Rate", "Joined", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {providers.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium">{p.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{p.email}</p>
                        {(p.categories ?? []).length > 0 && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{(p.categories ?? []).slice(0, 2).join(", ")}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={p.verification_status} /></td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          {Number(p.avg_rating).toFixed(1)} ({p.review_count})
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">{p.completed_jobs} done</td>
                      <td className="px-5 py-3.5 text-muted-foreground">PKR {Number(p.hourly_rate).toLocaleString()}/hr</td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />{new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          {p.verification_status !== "verified" && (
                            <Button variant="ghost" size="sm" title="Approve" onClick={() => { setVerifyTarget(p); setVerifyDecision("verified"); setVerifyNotes(""); }}>
                              <ShieldCheck className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          {p.verification_status !== "rejected" && (
                            <Button variant="ghost" size="sm" title="Reject" onClick={() => { setVerifyTarget(p); setVerifyDecision("rejected"); setVerifyNotes(""); }}>
                              <ShieldX className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" title="Suspend" onClick={() => setSuspendTarget(p)}>
                            <UserX className="h-4 w-4 text-yellow-600" />
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {page * 20 + 1}–{Math.min((page + 1) * 20, total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Verify dialog */}
      <Dialog open={!!verifyTarget} onOpenChange={() => setVerifyTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{verifyDecision === "verified" ? "Approve Provider" : "Reject Provider"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {verifyDecision === "verified"
                ? `Approve ${verifyTarget?.name} as a verified provider?`
                : `Reject ${verifyTarget?.name}'s verification request?`}
            </p>
            <div>
              <Label>{verifyDecision === "rejected" ? "Rejection reason (required)" : "Notes (optional)"}</Label>
              <Textarea rows={3} value={verifyNotes} onChange={(e) => setVerifyNotes(e.target.value)} placeholder={verifyDecision === "rejected" ? "e.g. Document is blurry or expired." : "Optional admin notes…"} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVerifyTarget(null)}>Cancel</Button>
              <Button disabled={busy} onClick={handleVerify} className={verifyDecision === "rejected" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-success text-success-foreground hover:bg-success/90"}>
                {busy ? "Processing…" : verifyDecision === "verified" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend dialog */}
      <AlertDialog open={!!suspendTarget} onOpenChange={() => setSuspendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Provider</AlertDialogTitle>
            <AlertDialogDescription>Suspend {suspendTarget?.name}? They will lose access to their account.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={handleSuspend}>{busy ? "Processing…" : "Suspend"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
