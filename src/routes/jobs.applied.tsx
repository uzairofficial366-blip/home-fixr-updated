import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { meQueryOptions } from "@/components/nav";
import { listAppliedJobs } from "@/lib/provider.functions";
import { Container, PageHeader, StatusBadge } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BriefcaseBusiness } from "lucide-react";

export const Route = createFileRoute("/jobs/applied")({
  head: () => ({ meta: [{ title: "Jobs Applied — HomeFixr" }] }),
  component: JobsAppliedPage,
});

type AppliedJob = {
  bid_id: number;
  bid_amount: number;
  bid_status: string;
  applied_at: string;
  job_id: number;
  title: string;
  category: string;
  job_status: string;
  homeowner_name: string;
};

function JobsAppliedPage() {
  const userQuery = useQuery(meQueryOptions());
  const jobsQuery = useQuery<AppliedJob[]>({
    queryKey: ["appliedJobs"],
    queryFn: () => listAppliedJobs(),
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "status">("newest");

  if (userQuery.data && userQuery.data.role !== "provider") return <Navigate to="/dashboard" />;

  const jobs = jobsQuery.data ?? [];
  const filtered = jobs
    .filter((j) => j.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "newest")
        return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
      if (sort === "oldest")
        return new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
      return a.bid_status.localeCompare(b.bid_status);
    });

  return (
    <Container>
      <PageHeader title="Jobs Applied" subtitle="All jobs you have submitted a bid on." />

      <div className="my-6 flex gap-2">
        <Input
          placeholder="Search by job title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="status">By status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {jobsQuery.isLoading ? (
        <p className="my-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="my-10 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand">
            <BriefcaseBusiness className="h-6 w-6" />
          </span>
          <h3 className="text-lg font-semibold">No applications yet</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Browse open jobs and submit your first bid.
          </p>
          <Link to="/browse">
            <Button>Browse jobs</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((j) => (
            <Card key={j.bid_id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={j.bid_status} />
                    <span className="text-xs text-muted-foreground">{j.category}</span>
                    <span className="text-xs text-muted-foreground">
                      · Job: <StatusBadge status={j.job_status} />
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{j.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>
                      Owner: <span className="font-medium text-foreground">{j.homeowner_name}</span>
                    </span>
                    <span>Applied: {new Date(j.applied_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">PKR {Number(j.bid_amount).toLocaleString()}</p>
                  <div className="mt-2 flex gap-2 justify-end">
                    <Link to="/jobs/$id" params={{ id: String(j.job_id) }}>
                      <Button size="sm" variant="outline">
                        View Job
                      </Button>
                    </Link>
                    <Link to="/jobs/$id" params={{ id: String(j.job_id) }}>
                      <Button size="sm">Message Owner</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
