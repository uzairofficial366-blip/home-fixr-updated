import { me } from "@/lib/auth.functions";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListPayments,
  adminRefundPayment,
  adminGetEscrowDetails,
  adminGetRevenueDetails,
} from "@/lib/admin.functions";
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

function AdminPaymentsPage() {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => me(), staleTime: 30_000 });
  const qc = useQueryClient();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);

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

  if (user && user.role !== "admin") return <Navigate to="/dashboard" />;

  const payments = (data?.payments ?? []) as Payment[];
  const summary = data?.summary as
    { escrow: number; released: number; pending: number; refunded: number } | undefined;
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

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

  const currentTab = tab;

  return (
    <div className="space-y-5">
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
        value={currentTab}
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

        <TabsContent value={currentTab} className="mt-4">
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

      {/* View dialog */}
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
