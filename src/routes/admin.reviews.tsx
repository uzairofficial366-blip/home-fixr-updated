import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meQueryOptions } from "@/components/nav";
import { adminListReviews, adminDeleteReview } from "@/lib/admin.functions";
import { StatusBadge } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, ChevronLeft, ChevronRight, Star, Trash2, Eye } from "lucide-react";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "Reviews — HomeFixr Admin" }] }),
  component: AdminReviewsPage,
});

type Review = {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  job_id: number;
  job_title: string;
  reviewer_name: string;
  reviewer_email: string;
  provider_name: string;
};

function AdminReviewsPage() {
  const { data: user } = useQuery(meQueryOptions());
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [viewReview, setViewReview] = useState<Review | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);

  const doDelete = useServerFn(adminDeleteReview);

  const { data, isLoading } = useQuery({
    queryKey: ["adminReviews", search, page],
    queryFn: () => adminListReviews({ data: { search: search || undefined, page } }),
    placeholderData: (prev) => prev,
  });

  if (user && user.role !== "admin") return <Navigate to="/dashboard" />;

  const reviews = (data?.reviews ?? []) as Review[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await doDelete({ data: { reviewId: deleteTarget.id } });
      toast.success("Review deleted");
      qc.invalidateQueries({ queryKey: ["adminReviews"] });
      qc.invalidateQueries({ queryKey: ["adminDashStats"] });
      setDeleteTarget(null);
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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by reviewer, provider, or job…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
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
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Star className="h-12 w-12 text-muted-foreground/40" />
              <p className="font-semibold">No reviews found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Rating", "Job", "Reviewer", "Provider", "Date", "Actions"].map((h) => (
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
                  {reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${i < r.rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium">{r.job_title}</p>
                        <p className="text-xs text-muted-foreground">#{r.job_id}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium">{r.reviewer_name}</p>
                        <p className="text-xs text-muted-foreground">{r.reviewer_email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium">{r.provider_name}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewReview(r)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(r)}>
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
      <Dialog open={!!viewReview} onOpenChange={() => setViewReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
          </DialogHeader>
          {viewReview && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < viewReview.rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
                  />
                ))}
                <span className="ml-1 text-muted-foreground">{viewReview.rating}/5</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Job</p>
                <p className="font-semibold">
                  {viewReview.job_title} #{viewReview.job_id}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reviewer</p>
                <p className="font-semibold">{viewReview.reviewer_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Provider</p>
                <p className="font-semibold">{viewReview.provider_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comment</p>
                <p className="font-semibold">{viewReview.comment || "No comment"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-semibold">
                  {new Date(viewReview.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete this review? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
