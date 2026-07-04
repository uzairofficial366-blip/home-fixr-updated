import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meQueryOptions } from "@/components/nav";
import { adminListBids } from "@/lib/admin.functions";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, Briefcase, User, DollarSign } from "lucide-react";

export const Route = createFileRoute("/admin/bids")({
  head: () => ({ meta: [{ title: "Bids — HomeFixr Admin" }] }),
  component: AdminBidsPage,
});

type Bid = {
  id: number;
  status: string;
  total: number;
  hourly_rate: number;
  hours_estimate: number;
  equipment_cost: number;
  message: string;
  created_at: string;
  job_id: number;
  job_title: string;
  job_status: string;
  provider_name: string;
  provider_email: string;
};

function AdminBidsPage() {
  const { data: user } = useQuery(meQueryOptions());
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [viewBid, setViewBid] = useState<Bid | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["adminBids", search, status, page],
    queryFn: () => adminListBids({ data: { search: search || undefined, status, page } }),
    placeholderData: (prev) => prev,
  });

  if (user && user.role !== "admin") return <Navigate to="/dashboard" />;

  const bids = (data?.bids ?? []) as Bid[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleAccept = async (bidId: number) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bids/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId }),
      });
      if (!res.ok) throw new Error("Failed to accept bid");
      toast.success("Bid accepted");
      qc.invalidateQueries({ queryKey: ["adminBids"] });
      qc.invalidateQueries({ queryKey: ["adminDashStats"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (bidId: number) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bids/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId }),
      });
      if (!res.ok) throw new Error("Failed to reject bid");
      toast.success("Bid rejected");
      qc.invalidateQueries({ queryKey: ["adminBids"] });
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
                placeholder="Search bids by job or provider…"
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
                <SelectItem value="accepted">Accepted</SelectItem>
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
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : bids.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground/40" />
              <p className="font-semibold">No bids found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Job", "Provider", "Amount", "Rate", "Hours", "Status", "Actions"].map(
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
                  {bids.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium">{b.job_title}</p>
                        <p className="text-xs text-muted-foreground">#{b.job_id}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium">{b.provider_name}</p>
                        <p className="text-xs text-muted-foreground">{b.provider_email}</p>
                      </td>
                      <td className="px-5 py-3.5 font-medium">
                        PKR {Number(b.total).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        PKR {Number(b.hourly_rate).toLocaleString()}/hr
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {Number(b.hours_estimate)}h
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View"
                            onClick={() => setViewBid(b)}
                          >
                            <Search className="h-4 w-4" />
                          </Button>
                          {b.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Accept"
                                onClick={() => handleAccept(b.id)}
                                disabled={busy}
                              >
                                <span className="text-xs text-success font-medium">Accept</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Reject"
                                onClick={() => handleReject(b.id)}
                                disabled={busy}
                              >
                                <span className="text-xs text-destructive font-medium">Reject</span>
                              </Button>
                            </>
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
      <Dialog open={!!viewBid} onOpenChange={() => setViewBid(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bid Details</DialogTitle>
          </DialogHeader>
          {viewBid && (
            <div className="space-y-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Job</p>
                  <p className="font-semibold">
                    {viewBid.job_title} #{viewBid.job_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p className="font-semibold">{viewBid.provider_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold">PKR {Number(viewBid.total).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hourly Rate</p>
                  <p className="font-semibold">
                    PKR {Number(viewBid.hourly_rate).toLocaleString()}/hr
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Est. Hours</p>
                  <p className="font-semibold">{Number(viewBid.hours_estimate)}h</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Equipment</p>
                  <p className="font-semibold">
                    PKR {Number(viewBid.equipment_cost).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <StatusBadge status={viewBid.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-semibold">
                    {new Date(viewBid.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Message</p>
                  <p className="font-semibold">{viewBid.message || "—"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
