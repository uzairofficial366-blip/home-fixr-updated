import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listOpenJobs } from "@/lib/jobs.functions";
import { Container, PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/browse")({
  head: () => ({ meta: [{ title: "Browse jobs — HomeFixr" }] }),
  component: Browse,
});

function Browse() {
  const {
    data: jobs = [],
    isLoading,
    error,
  } = useQuery({ queryKey: ["openJobs"], queryFn: () => listOpenJobs() });
  return (
    <Container>
      <PageHeader title="Open jobs" subtitle="Bid on jobs that match your skills." />
      {error && <p className="my-6 text-sm text-destructive">{(error as Error).message}</p>}
      {isLoading && <p className="my-6 text-muted-foreground">Loading…</p>}
      <div className="my-6 grid gap-3">
        {jobs.map((j: any) => (
          <Link key={j.id} to="/jobs/$id" params={{ id: String(j.id) }}>
            <Card className="p-5 transition hover:border-brand/40 hover:shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-brand-soft px-1.5 py-0.5 font-medium text-brand">
                      {j.category}
                    </span>
                    <span>· {j.address}</span>
                    <span>· {j.bid_count} bids</span>
                    {j.already_bid && (
                      <span className="rounded bg-success/15 px-1.5 py-0.5 font-medium text-success">
                        You bid
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{j.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{j.description}</p>
                </div>
                {j.ai_suggested_min && (
                  <div className="rounded-lg bg-brand-soft px-3 py-2 text-center">
                    <p className="text-xs text-brand">AI range</p>
                    <p className="text-sm font-bold text-brand">
                      PKR {Number(j.ai_suggested_min).toLocaleString()} –{" "}
                      {Number(j.ai_suggested_max).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Container>
  );
}
