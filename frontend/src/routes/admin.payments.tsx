import { me } from "@/lib/auth.functions";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  adminListPayments,
  adminRefundPayment,
  adminGetEscrowDetails,
  adminGetRevenueDetails,
  adminListCommissions,
  adminReviewCommission,
} from "@/lib/admin.functions";
import { StatusBadge } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Wallet,
  RefreshCw,
  XCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  ReceiptText,
} from "lucide-react";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payments — HomeFixr Admin" }] }),
  component: AdminPaymentsPage,
});

type Payment = {
  id: number;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  job_id: number;
  job_title: string;
  homeowner_name: string;
  homeowner_email: string;
};

type CommissionRecord = {
  id: number;
  job_id: number;
  job_title: string;
  completed_at: string | null;
  job_payment_amount: number;
  amount_owed: number;
  status: string;
  receipt_url: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  admin_notes: string;
  provider_name: string;
  provider_email: string;
};

function CommissionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    unpaid: { label: "Unpaid", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    pending_approval: { label: "Pending Verification", className: "bg-blue-100 text-blue-800 border-blue-200" },
    paid: { label: "Paid", className: "bg-green-100 text-green-800 border-green-200" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200" },
  };
  const config = map[status] ?? { label: status, className: "bg-muted text-foreground border-border" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

function AdminPaymentsPage() {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => me(), staleTime: 30_000 });
  const qc = useQueryClient();
  const [mainTab, setMainTab] = useState("payments");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);

  // Commission state
  const [commissionStatus, setCommissionStatus] = useState("all");
  const [commissionSearch, setCommissionSearch] = useState("");
  const [commissionPage, setCommissionPage] = useState(0);
  const [reviewTarget, setReviewTarget] = useState<CommissionRecord | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [reviewMode, setReviewMode] = useState<"approve" | "reject" | null>(null);

  const doRefund = adminRefundPayment;
  const doFetchEscrow = adminGetEscrowDetails;
  const doFetchRevenue = adminGetRevenueDetails;

  const { data, isLoading } = useQuery({
    queryKey: ["adminPayments", tab, search, page],
    queryFn: () => adminListPayments({ data: { status: tab === "all" ? undefined : tab, page } }),
    placeholderData: (prev) => prev,
  });

  const { data: escrowData } = useQuery({
    queryKey: ["adminEscrow"],
    queryFn: () => doFetchEscrow(),
    refetchInterval: 60_000,
  });
  const { data: revenueData } = useQuery({
    queryKey: ["adminRevenue"],
    queryFn: () => doFetchRevenue(),
    refetchInterval: 60_000,
  });

  const { data: commissionsData, isLoading: commissionsLoading } = useQuery({
    queryKey: ["adminCommissions", commissionStatus, commissionSearch, commissionPage],
    queryFn: () => adminListCommissions({
      data: {
        status: commissionStatus === "all" ? undefined : commissionStatus,
        search: commissionSearch || undefined,
        page: commissionPage,
      },
    }),
    placeholderData: (prev) => prev,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ decision, notes }: { decision: "paid" | "rejected"; notes?: string }) =>
      adminReviewCommission({ data: { commissionId: reviewTarget!.id, decision, adminNotes: notes } }),
    onSuccess: () => {
      toast.success(reviewMode === "approve" ? "Commission approved!" : "Commission rejected.");
      qc.invalidateQueries({ queryKey: ["adminCommissions"] });
      setReviewTarget(null);
      setRejectNotes("");
      setReviewMode(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (user && user.role !== "admin") return <Navigate to="/dashboard" />;

  const payments = (data?.payments ?? []) as Payment[];
  const summary = data?.summary as
    { escrow: number; released: number; pending: number; refunded: number } | undefined;
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const commissions = (commissionsData?.commissions ?? []) as CommissionRecord[];
  const commissionSummary = commissionsData?.summary as
    { unpaid: number; pending: number; paid: number; rejected: number } | undefined;
  const commissionTotal = commissionsData?.total ?? 0;
  const commissionTotalPages = Math.ceil(commissionTotal / 20);

  const handleRefund = async () => {
    if (!refundTarget) return;
    setBusy(true);
    try {
      await doRefund({ data: { paymentId: refundTarget.id } });
      toast.success("Payment refunded");
      qc.invalidateQueries({ queryKey: ["adminPayments"] });
      qc.invalidateQueries({ queryKey: ["adminDashStats"] });
      setRefundTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top-level tabs: Payments vs Commissions */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v)}>
        <TabsList className="bg-muted/60 rounded-xl">
          <TabsTrigger value="payments">Homeowner Payments</TabsTrigger>
          <TabsTrigger value="commissions">
            Provider Commissions
            {Number(commissionSummary?.pending ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                {commissionSummary?.pending}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Homeowner Payments Tab ─── */}
        <TabsContent value="payments" className="mt-4 space-y-5">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-orange-50 p-2.5 text-orange-600">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Escrow</p>
                    <p className="text-lg font-bold">
                      PKR {Number(summary?.escrow ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-green-50 p-2.5 text-green-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Released</p>
                    <p className="text-lg font-bold">
                      PKR {Number(summary?.released ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-yellow-50 p-2.5 text-yellow-600">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="text-lg font-bold">{summary?.pending ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-50 p-2.5 text-red-600">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Refunded</p>
                    <p className="text-lg font-bold">
                      PKR {Number(summary?.refunded ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v);
              setPage(0);
            }}
          >
            <TabsList className="bg-muted/60 rounded-xl">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="held">Escrow</TabsTrigger>
              <TabsTrigger value="released">Released</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="refunded">Refunded</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="space-y-3 p-6">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : payments.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                      <Wallet className="h-12 w-12 text-muted-foreground/40" />
                      <p className="font-semibold">No payments found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            {["Job", "Customer", "Amount", "Status", "Date", "Actions"].map((h) => (
                              <th
                                key={h}
                                className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {payments.map((p) => (
                            <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-5 py-3.5">
                                <p className="font-medium">{p.job_title}</p>
                                <p className="text-xs text-muted-foreground">#{p.job_id}</p>
                              </td>
                              <td className="px-5 py-3.5">
                                <p className="text-sm font-medium">{p.homeowner_name}</p>
                                <p className="text-xs text-muted-foreground">{p.homeowner_email}</p>
                              </td>
                              <td className="px-5 py-3.5 font-medium">
                                PKR {Number(p.amount).toLocaleString()}
                              </td>
                              <td className="px-5 py-3.5">
                                <StatusBadge status={p.status} />
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(p.created_at).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => setViewPayment(p)}>
                                    <Search className="h-4 w-4" />
                                  </Button>
                                  {p.status === "held" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setRefundTarget(p)}
                                    >
                                      <XCircle className="h-4 w-4 text-destructive" />
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
            </TabsContent>
          </Tabs>

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
        </TabsContent>

        {/* ─── Provider Commissions Tab ─── */}
        <TabsContent value="commissions" className="mt-4 space-y-5">
          {/* Commission Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-yellow-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-yellow-100 p-2.5"><AlertCircle className="h-5 w-5 text-yellow-600" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Unpaid</p>
                    <p className="text-lg font-bold text-yellow-700">PKR {Number(commissionSummary?.unpaid ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-100 p-2.5"><Clock className="h-5 w-5 text-blue-600" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Review</p>
                    <p className="text-lg font-bold text-blue-700">PKR {Number(commissionSummary?.pending ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-green-100 p-2.5"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paid</p>
                    <p className="text-lg font-bold text-green-700">PKR {Number(commissionSummary?.paid ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-red-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-100 p-2.5"><XCircle className="h-5 w-5 text-red-600" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                    <p className="text-lg font-bold text-red-700">PKR {Number(commissionSummary?.rejected ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search provider or job…"
              value={commissionSearch}
              onChange={(e) => { setCommissionSearch(e.target.value); setCommissionPage(0); }}
              className="max-w-xs"
            />
            <Select value={commissionStatus} onValueChange={(v) => { setCommissionStatus(v); setCommissionPage(0); }}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Commission Table */}
          <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {commissionsLoading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : commissions.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <ReceiptText className="h-12 w-12 text-muted-foreground/40" />
                  <p className="font-semibold">No commission records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {["Provider", "Job", "Earned", "Commission (20%)", "Status", "Submitted", "Actions"].map((h) => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {commissions.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-medium">{c.provider_name}</p>
                            <p className="text-xs text-muted-foreground">{c.provider_email}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-medium">{c.job_title}</p>
                            <p className="text-xs text-muted-foreground">#{c.job_id}</p>
                          </td>
                          <td className="px-5 py-3.5 font-medium text-emerald-700">
                            PKR {Number(c.job_payment_amount || 0).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-orange-600">
                            PKR {Number(c.amount_owed).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5">
                            <CommissionStatusBadge status={c.status} />
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs text-muted-foreground">
                              {c.submitted_at ? new Date(c.submitted_at).toLocaleDateString() : "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {c.status === "pending_approval" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setReviewTarget(c); setReviewMode(null); setRejectNotes(""); }}
                                className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs"
                              >
                                Review
                              </Button>
                            )}
                            {c.status !== "pending_approval" && c.receipt_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setReviewTarget(c); setReviewMode(null); setRejectNotes(""); }}
                              >
                                <Search className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {commissionTotalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {commissionPage * 20 + 1}–{Math.min((commissionPage + 1) * 20, commissionTotal)} of {commissionTotal}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={commissionPage === 0} onClick={() => setCommissionPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={commissionPage >= commissionTotalPages - 1} onClick={() => setCommissionPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* View Payment dialog */}
      <Dialog open={!!viewPayment} onOpenChange={() => setViewPayment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {viewPayment && (
            <div className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Job</p>
                  <p className="font-semibold">
                    {viewPayment.job_title} #{viewPayment.job_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-semibold">{viewPayment.homeowner_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-semibold">PKR {Number(viewPayment.amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={viewPayment.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-semibold">
                    {new Date(viewPayment.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="font-semibold">
                    {new Date(viewPayment.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Commission Review Dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={(o) => { if (!o) { setReviewTarget(null); setReviewMode(null); setRejectNotes(""); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-accent-orange" />
              Commission Review
            </DialogTitle>
          </DialogHeader>
          {reviewTarget && (
            <div className="space-y-4">
              {/* Details */}
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p className="font-semibold">{reviewTarget.provider_name}</p>
                  <p className="text-xs text-muted-foreground">{reviewTarget.provider_email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Job</p>
                  <p className="font-semibold">{reviewTarget.job_title} #{reviewTarget.job_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Job Earnings</p>
                  <p className="font-semibold text-emerald-700">PKR {Number(reviewTarget.job_payment_amount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Commission Due (20%)</p>
                  <p className="font-semibold text-orange-600">PKR {Number(reviewTarget.amount_owed).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <CommissionStatusBadge status={reviewTarget.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted At</p>
                  <p className="font-semibold">{reviewTarget.submitted_at ? new Date(reviewTarget.submitted_at).toLocaleString() : "—"}</p>
                </div>
              </div>

              {/* Receipt Image */}
              {reviewTarget.receipt_url && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Payment Receipt</p>
                  <div className="rounded-xl border border-border overflow-hidden bg-muted/10">
                    <img
                      src={reviewTarget.receipt_url}
                      alt="Payment receipt"
                      className="w-full object-contain max-h-80"
                    />
                  </div>
                </div>
              )}

              {/* Previous Admin Notes (if rejected before) */}
              {reviewTarget.admin_notes && (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Admin Notes</p>
                  <p className="text-sm">{reviewTarget.admin_notes}</p>
                </div>
              )}

              {/* Review Actions (only for pending_approval) */}
              {reviewTarget.status === "pending_approval" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  {reviewMode === "reject" ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="rejectNotes" className="text-sm font-semibold">Rejection Reason (required)</Label>
                        <Textarea
                          id="rejectNotes"
                          rows={3}
                          placeholder="Describe why this payment is rejected…"
                          value={rejectNotes}
                          onChange={(e) => setRejectNotes(e.target.value)}
                          className="mt-1.5"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setReviewMode(null)} className="flex-1">
                          Back
                        </Button>
                        <Button
                          onClick={() => reviewMutation.mutate({ decision: "rejected", notes: rejectNotes })}
                          disabled={!rejectNotes.trim() || reviewMutation.isPending}
                          className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                        >
                          {reviewMutation.isPending ? "Rejecting…" : "Confirm Reject"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => reviewMutation.mutate({ decision: "paid" })}
                        disabled={reviewMutation.isPending}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {reviewMutation.isPending ? "Approving…" : "Approve Payment"}
                      </Button>
                      <Button
                        onClick={() => setReviewMode("reject")}
                        disabled={reviewMutation.isPending}
                        variant="outline"
                        className="flex-1 border-destructive text-destructive hover:bg-destructive/5"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund dialog */}
      <AlertDialog open={!!refundTarget} onOpenChange={() => setRefundTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Refund PKR {Number(refundTarget?.amount).toLocaleString()} for job "
              {refundTarget?.job_title}"? This will release the escrow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={handleRefund}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Processing…" : "Refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
