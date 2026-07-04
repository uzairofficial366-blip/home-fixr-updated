import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meQueryOptions } from "@/components/nav";
import { adminListVerifications, adminVerifyProvider } from "@/lib/admin.functions";
import { StatusBadge } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldX,
  Eye,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/admin/verifications")({
  head: () => ({ meta: [{ title: "AI Verification — HomeFixr Admin" }] }),
  component: AdminVerificationsPage,
});

type Verification = {
  id: number;
  provider_id: number;
  status: string;
  full_name: string;
  document_type: string;
  document_description: string;
  id_document_url: string;
  license_document_url: string | null;
  admin_notes: string;
  submitted_at: string;
  reviewed_at: string | null;
  name: string;
  email: string;
  profile_status: string;
};

function AdminVerificationsPage() {
  const { data: user } = useQuery(meQueryOptions());
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [viewTarget, setViewTarget] = useState<Verification | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<Verification | null>(null);
  const [verifyDecision, setVerifyDecision] = useState<"verified" | "rejected">("verified");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const doVerify = useServerFn(adminVerifyProvider);

  const { data, isLoading } = useQuery({
    queryKey: ["adminVerifications", search, status, page],
    queryFn: () =>
      adminListVerifications({ data: { status: status === "all" ? undefined : status, page } }),
    placeholderData: (prev) => prev,
  });

  if (user && user.role !== "admin") return <Navigate to="/dashboard" />;

  const verifications = (data?.verifications ?? []) as Verification[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleVerify = async () => {
    if (!verifyTarget) return;
    if (verifyDecision === "rejected" && !verifyNotes.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setBusy(true);
    try {
      await doVerify({
        data: {
          providerId: verifyTarget.provider_id,
          decision: verifyDecision,
          notes: verifyNotes || undefined,
        },
      });
      toast.success(`Provider ${verifyDecision}`);
      qc.invalidateQueries({ queryKey: ["adminVerifications"] });
      qc.invalidateQueries({ queryKey: ["adminDashStats"] });
      qc.invalidateQueries({ queryKey: ["adminProviders"] });
      setVerifyTarget(null);
      setVerifyNotes("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
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
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : verifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40" />
              <p className="font-semibold">No verification requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Provider", "Document", "Status", "Profile", "Submitted", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {verifications.map((v) => (
                    <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium">{v.name}</p>
                        <p className="text-xs text-muted-foreground">{v.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm">{v.document_type}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {v.document_description}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={v.profile_status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-muted-foreground">
                          {new Date(v.submitted_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View"
                            onClick={() => setViewTarget(v)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {v.status !== "verified" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Approve"
                              onClick={() => {
                                setVerifyTarget(v);
                                setVerifyDecision("verified");
                                setVerifyNotes("");
                              }}
                            >
                              <ShieldCheck className="h-4 w-4 text-success" />
                            </Button>
                          )}
                          {v.status !== "rejected" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Reject"
                              onClick={() => {
                                setVerifyTarget(v);
                                setVerifyDecision("rejected");
                                setVerifyNotes("");
                              }}
                            >
                              <ShieldX className="h-4 w-4 text-destructive" />
                            </Button>
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

      {/* View dialog */}
      <Dialog open={!!viewTarget} onOpenChange={() => setViewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p className="font-semibold">
                    {viewTarget.name} · {viewTarget.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Document Type</p>
                  <p className="font-semibold">{viewTarget.document_type}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="font-semibold">{viewTarget.document_description}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ID Document</p>
                  <a
                    href={viewTarget.id_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-orange hover:underline"
                  >
                    View Document
                  </a>
                </div>
                {viewTarget.license_document_url && (
                  <div>
                    <p className="text-xs text-muted-foreground">License Document</p>
                    <a
                      href={viewTarget.license_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-orange hover:underline"
                    >
                      View Document
                    </a>
                  </div>
                )}
                {viewTarget.admin_notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Admin Notes</p>
                    <p className="font-semibold">{viewTarget.admin_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify dialog */}
      <Dialog open={!!verifyTarget} onOpenChange={() => setVerifyTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verifyDecision === "verified" ? "Approve Verification" : "Reject Verification"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {verifyDecision === "verified"
                ? `Approve ${verifyTarget?.name}'s verification request?`
                : `Reject ${verifyTarget?.name}'s verification request?`}
            </p>
            <div>
              <Label>
                {verifyDecision === "rejected" ? "Rejection reason (required)" : "Notes (optional)"}
              </Label>
              <Textarea
                rows={3}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder={
                  verifyDecision === "rejected"
                    ? "e.g. Document is blurry or expired."
                    : "Optional admin notes…"
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVerifyTarget(null)}>
                Cancel
              </Button>
              <Button
                disabled={busy}
                onClick={handleVerify}
                className={
                  verifyDecision === "rejected"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-success text-success-foreground hover:bg-success/90"
                }
              >
                {busy ? "Processing…" : verifyDecision === "verified" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
