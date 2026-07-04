import { me } from "@/lib/auth.functions";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  acceptJobBroadcast,
  customizeJobBroadcastPrice,
  getPendingJobBroadcast,
  listMyJobs,
  listOpenJobs,
  rejectJobBroadcast,
} from "@/lib/jobs.functions";
import { getProviderProfile } from "@/lib/provider.functions";
import { Container, PageHeader, StatusBadge } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ClipboardList,
  Clock,
  MapPin,
  PlusCircle,
  Search,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard - HomeFixr" }] }),
  loader: ({ context }: any) => {
    context.queryClient.ensureQueryData({ queryKey: ["me"], queryFn: () => me(), staleTime: 30_000 });
  },
  component: Dashboard,
});

type HomeownerJob = {
  id: number;
  title: string;
  category: string;
  description: string;
  status: string;
  bid_count: number;
};

type OpenJob = {
  id: number;
  title: string;
  category: string;
  address: string;
  description: string;
  already_bid: boolean;
  ai_suggested_min?: number | string | null;
  ai_suggested_max?: number | string | null;
};

type ProviderProfile = {
  verification_status?: string;
};

type JobBroadcast = {
  broadcast_id: number;
  id: number;
  title: string;
  category: string;
  description: string;
  address: string;
  estimated_hours?: number | string | null;
  estimated_days?: number | string | null;
  budget?: number | string | null;
  ai_suggested_min?: number | string | null;
  ai_suggested_max?: number | string | null;
  customer_name: string;
  suggested_budget: number;
  estimated_total_hours: number;
};

const myJobsQO = queryOptions({
  queryKey: ["myJobs"],
  queryFn: () => listMyJobs(),
  refetchInterval: 15_000,
});
const openJobsQO = queryOptions({
  queryKey: ["openJobs"],
  queryFn: () => listOpenJobs(),
});
const profileQO = queryOptions({
  queryKey: ["providerProfile"],
  queryFn: () => getProviderProfile(),
});
const pendingBroadcastQO = queryOptions({
  queryKey: ["pendingJobBroadcast"],
  queryFn: () => getPendingJobBroadcast(),
  refetchInterval: 5_000,
});

function Dashboard() {
  const { data: user } = useSuspenseQuery({ queryKey: ["me"], queryFn: () => me(), staleTime: 30_000 });
  if (!user) return <Navigate to="/auth" search={{ mode: "login" }} />;
  return user.role === "homeowner" ? <HomeownerDash /> : <ProviderDash />;
}

function HomeownerDash() {
  const { data: jobs = [] } = useQuery(myJobsQO);
  return (
    <Container>
      <PageHeader
        title="My jobs"
        subtitle="Track your posted jobs, bids, and progress."
        action={
          <Link to="/jobs/new">
            <Button className="bg-accent-orange hover:bg-orange-600 text-white shadow-md">
              <PlusCircle className="h-4 w-4" />
              {" "}
              Post a job
            </Button>
          </Link>
        }
      />
      {jobs.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No jobs yet"
          body="Post your first job to start receiving bids."
          cta={
            <Link to="/jobs/new">
              <Button className="bg-accent-orange hover:bg-orange-600 text-white">Post a job</Button>
            </Link>
          }
        />
      ) : (
        <div className="my-6 grid gap-3">
          {jobs.map((j: any) => (
            <Link key={j.id} to="/jobs/$id" params={{ id: String(j.id) }}>
              <Card className="p-5 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1 border-border/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={j.status} />
                      <span className="text-xs text-muted-foreground">{j.category}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">{j.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {j.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{j.bid_count}</p>
                    <p className="text-xs text-muted-foreground">bids</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}

function ProviderDash() {
  const { data: jobs = [] } = useQuery(openJobsQO);
  const { data: profile } = useQuery(profileQO);
  const { data: pendingBroadcast } = useQuery(pendingBroadcastQO);
  const needsVerify = !profile || profile.verification_status !== "verified";
  const hasBlockingBroadcast = Boolean(pendingBroadcast);

  return (
    <>
      <div
        className={
          hasBlockingBroadcast
            ? "pointer-events-none select-none blur-sm transition duration-200"
            : "transition duration-200"
        }
        aria-hidden={hasBlockingBroadcast}
      >
        <Container>
          <PageHeader
            title="Available jobs"
            subtitle="Browse and bid on open jobs near you."
            action={
              <Link to="/browse">
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-accent-orange hover:text-white"
                >
                  <Search className="h-4 w-4" />
                  Browse all
                </Button>
              </Link>
            }
          />
          {needsVerify && (
            <Card className="my-6 border-warning/40 bg-warning/5 p-5 shadow-card">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 text-warning" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Complete your provider profile</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Homeowners strongly prefer verified providers. Add your details and submit for
                    verification.
                  </p>
                  <Link to="/provider" className="mt-3 inline-block">
                    <Button size="sm" className="bg-accent-orange hover:bg-orange-600 text-white">
                      Go to profile
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}
          {jobs.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="No open jobs right now"
              body="Check back soon - new jobs are posted every day."
            />
          ) : (
            <div className="my-6 grid gap-3">
              {jobs.slice(0, 10).map((j: any) => (
                <Link key={j.id} to="/jobs/$id" params={{ id: String(j.id) }}>
                  <Card className="p-5 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1 border-border/60">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded bg-brand-soft px-1.5 py-0.5 font-medium text-primary">
                            {j.category}
                          </span>
                          <span>- {j.address}</span>
                          {j.already_bid && (
                            <span className="rounded bg-success/15 px-1.5 py-0.5 font-medium text-success">
                              You bid
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-foreground">{j.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {j.description}
                        </p>
                      </div>
                      {j.ai_suggested_min && (
                        <div className="rounded-lg bg-brand-soft px-3 py-2 text-center">
                          <p className="text-xs text-primary">AI range</p>
                          <p className="text-sm font-bold text-primary">
                            PKR {Number(j.ai_suggested_min).toLocaleString()} -{" "}
                            {Number(j.ai_suggested_max).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </div>
      {pendingBroadcast && <JobRequestPopup broadcast={pendingBroadcast} />}
    </>
  );
}

function formatDuration(job: JobBroadcast) {
  const days = Number(job.estimated_days || 0);
  const hours = Number(job.estimated_hours || 0);
  if (days > 0 && hours > 0) return `${days} day${days === 1 ? "" : "s"} + ${hours} hr`;
  if (days > 0) return `${days} day${days === 1 ? "" : "s"}`;
  if (hours > 0) return `${hours} hr`;
  return `${job.estimated_total_hours} hr estimate`;
}

function formatBudget(job: JobBroadcast) {
  if (job.suggested_budget > 0) return `PKR ${job.suggested_budget.toLocaleString()}`;
  const min = Number(job.ai_suggested_min || 0);
  const max = Number(job.ai_suggested_max || 0);
  if (min > 0 && max > 0) return `PKR ${min.toLocaleString()} - ${max.toLocaleString()}`;
  return "Not specified";
}

function JobRequestPopup({ broadcast }: { broadcast: JobBroadcast }) {
  const queryClient = useQueryClient();
  const accept = acceptJobBroadcast;
  const reject = rejectJobBroadcast;
  const customize = customizeJobBroadcastPrice;
  const [customizing, setCustomizing] = useState(false);
  const [customTotal, setCustomTotal] = useState(
    broadcast.suggested_budget > 0 ? String(broadcast.suggested_budget) : "",
  );
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState<"accept" | "reject" | "customize" | null>(null);

  const refreshDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["pendingJobBroadcast"] }),
      queryClient.invalidateQueries({ queryKey: ["openJobs"] }),
      queryClient.invalidateQueries({ queryKey: ["notifCount"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    ]);
  };

  const onAccept = async () => {
    setBusyAction("accept");
    try {
      await accept({ data: { broadcastId: broadcast.broadcast_id } });
      toast.success("Bid submitted at the suggested price.");
      await refreshDashboard();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  const onReject = async () => {
    setBusyAction("reject");
    try {
      await reject({ data: { broadcastId: broadcast.broadcast_id } });
      toast.success("Job request rejected.");
      await refreshDashboard();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  const onCustomize = async () => {
    const total = Number(customTotal);
    if (!total || total <= 0) {
      toast.error("Enter a custom price first.");
      return;
    }
    setBusyAction("customize");
    try {
      await customize({
        data: {
          broadcastId: broadcast.broadcast_id,
          total,
          message,
        },
      });
      toast.success("Custom price submitted.");
      await refreshDashboard();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/25 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl border-2 border-accent-orange/30 bg-white p-6 shadow-elevated animate-scale-in">
        <div className="flex flex-col gap-2 border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-orange">
            High priority job request
          </p>
          <h2 className="text-2xl font-bold text-foreground">{broadcast.title}</h2>
          <p className="text-sm text-muted-foreground">
            Respond to this request before continuing dashboard activities.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoItem label="Customer Name" value={broadcast.customer_name} />
          <InfoItem label="Service Category" value={broadcast.category} />
          <InfoItem
            icon={<MapPin className="h-4 w-4 text-accent-orange" />}
            label="Job Location"
            value={broadcast.address}
          />
          <InfoItem
            icon={<Clock className="h-4 w-4 text-accent-orange" />}
            label="Estimated Duration"
            value={formatDuration(broadcast)}
          />
          <InfoItem
            icon={<Wallet className="h-4 w-4 text-accent-orange" />}
            label="Suggested Budget"
            value={formatBudget(broadcast)}
          />
          <InfoItem label="Distance" value="Not available" />
        </div>

        <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground">Job Description</p>
          <p className="mt-1 text-sm leading-6 text-foreground">{broadcast.description}</p>
        </div>

        {customizing && (
          <div className="mt-4 grid gap-3 rounded-xl border-2 border-accent-orange/30 bg-brand-soft/20 p-4">
            <div>
              <Label htmlFor="customTotal" className="text-base font-semibold">
                Custom total price (PKR)
              </Label>
              <Input
                id="customTotal"
                type="number"
                min={1}
                value={customTotal}
                onChange={(e) => setCustomTotal(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="customMessage" className="text-base font-semibold">
                Message (optional)
              </Label>
              <Input
                id="customMessage"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a short note for the customer"
                className="mt-2"
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busyAction !== null}
            onClick={onReject}
            className="border-destructive text-destructive hover:bg-destructive hover:text-white"
          >
            {busyAction === "reject" ? "Rejecting..." : "Reject"}
          </Button>
          <Button
            type="button"
            variant={customizing ? "default" : "outline"}
            disabled={busyAction !== null || (customizing && Number(customTotal) <= 0)}
            onClick={customizing ? onCustomize : () => setCustomizing(true)}
            className="border-primary text-primary hover:bg-accent-orange hover:text-white hover:border-accent-orange"
          >
            {busyAction === "customize"
              ? "Submitting..."
              : customizing
                ? "Submit counter-offer"
                : "Customize Price"}
          </Button>
          <Button
            type="button"
            disabled={busyAction !== null}
            onClick={onAccept}
            className="bg-success hover:bg-green-600 text-white"
          >
            {busyAction === "accept" ? "Accepting..." : "Accept"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="my-10 flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-primary">
        {icon}
      </span>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {cta}
    </div>
  );
}