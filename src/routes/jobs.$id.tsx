import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { getJob, requestJobCompletion, confirmJobCompletion } from "@/lib/jobs.functions";
import { listBidsForJob, createBid, acceptBid, declineBid } from "@/lib/bids.functions";
import { listMessages, sendMessage } from "@/lib/messages.functions";
import { getPayment, holdPayment } from "@/lib/payments.functions";
import { createReview, getJobReview } from "@/lib/reviews.functions";
import { getPublicProviderProfile } from "@/lib/provider.functions";
import { meQueryOptions } from "@/components/nav";
import { Container, PageHeader, StatusBadge } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Check,
  CheckCheck,
  Clock,
  DollarSign,
  FileText,
  ImageIcon,
  MapPin,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs/$id")({
  head: () => ({ meta: [{ title: "Job — HomeFixr" }] }),
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const jobId = Number(id);
  const qc = useQueryClient();
  const { data: user } = useQuery(meQueryOptions());
  const { data: job, error } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob({ data: { id: jobId } }),
    refetchInterval: 15_000,
  });
  const { data: bids = [] } = useQuery({
    queryKey: ["bids", jobId],
    queryFn: () => listBidsForJob({ data: { jobId } }),
  });
  const { data: payment } = useQuery({
    queryKey: ["payment", jobId],
    queryFn: () => getPayment({ data: { jobId } }),
    enabled: !!job,
  });
  const [activeProviderId, setActiveProviderId] = useState<number | null>(null);

  if (error)
    return (
      <Container>
        <p className="my-10 text-destructive">{(error as Error).message}</p>
      </Container>
    );
  if (!job || !user)
    return (
      <Container>
        <p className="my-10">Loading…</p>
      </Container>
    );

  const j = job as any;
  const isHomeowner = user.id === j.homeowner_id;
  const isProvider = user.role === "provider";
  const isExpired = j.status === "expired";
  const acceptedBid = (bids as any[]).find((b: any) => b.status === "accepted");
  const myBid = isProvider ? (bids as any[]).find((b: any) => b.provider_id === user.id) : null;
  const isActiveProvider = isProvider && myBid?.status === "accepted";
  const activeBid = (bids as any[]).find((b: any) => b.provider_id === activeProviderId);
  const activeChatBid = acceptedBid ?? activeBid;
  const completionRequested = Boolean(j.completion_requested_at);
  const durationParts = [
    Number(j.estimated_hours) > 0 ? `${Number(j.estimated_hours)} hour(s)` : null,
    Number(j.estimated_days) > 0 ? `${Number(j.estimated_days)} day(s)` : null,
  ].filter(Boolean);
  const photos = Array.isArray(j.photos) ? j.photos : [];

  return (
    <Container className="max-w-5xl">
      <PageHeader
        title={j.title}
        subtitle={`${j.category} · ${j.address}`}
        action={<StatusBadge status={j.status} />}
      />

      {isHomeowner && isExpired && (
        <Card className="mt-6 border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <p className="font-semibold text-destructive">No providers available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No service providers are available at this time. Please create a new job request or
              try again later.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="my-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm whitespace-pre-wrap">{j.description}</p>
              <div className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Posted by:</span>{" "}
                  <span className="font-medium">{j.homeowner_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{j.address}</span>
                </div>
                {j.preferred_date && (
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(j.preferred_date).toLocaleDateString()}</span>
                  </div>
                )}
                {j.preferred_time && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{j.preferred_time}</span>
                  </div>
                )}
                {durationParts.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span>{durationParts.join(" / ")}</span>
                  </div>
                )}
                {j.budget && (
                  <div>
                    <span className="text-muted-foreground">Budget:</span> PKR{" "}
                    {Number(j.budget).toLocaleString()}
                  </div>
                )}
              </div>
              {j.additional_notes && (
                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Additional notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{j.additional_notes}</p>
                </div>
              )}
              {photos.length > 0 && (
                <div className="mt-4">
                  <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                    <ImageIcon className="h-4 w-4" /> Photos
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {photos.map((photo: any) => (
                      <a
                        key={photo.id}
                        href={photo.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="overflow-hidden rounded-lg border border-border bg-muted/20"
                      >
                        <img
                          src={photo.file_url}
                          alt={photo.original_name}
                          className="h-44 w-full object-cover"
                        />
                        <p className="truncate px-3 py-2 text-xs text-muted-foreground">
                          {photo.original_name}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {j.ai_suggested_min && (
                <div className="mt-4 rounded-lg border border-brand/30 bg-brand-soft/40 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-brand">
                    <Sparkles className="h-3 w-3" /> AI fair-price range
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    PKR {Number(j.ai_suggested_min).toLocaleString()} –{" "}
                    {Number(j.ai_suggested_max).toLocaleString()}
                  </p>
                  {j.ai_reasoning && (
                    <p className="mt-1 text-xs text-muted-foreground">{j.ai_reasoning}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bids */}
          {(isHomeowner || isProvider) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {isHomeowner ? `Bids (${(bids as any[]).length})` : "Your bid"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isProvider && j.status === "open" && (
                  <BidForm
                    jobId={jobId}
                    existing={myBid}
                    onSaved={() => qc.invalidateQueries({ queryKey: ["bids", jobId] })}
                  />
                )}
                {(bids as any[]).length === 0 && !isProvider && (
                  <p className="text-sm text-muted-foreground">No bids yet.</p>
                )}
                {(bids as any[]).map((b: any) => (
                  <div
                    key={b.id}
                    className={`rounded-lg border p-4 ${b.status === "accepted" ? "border-success/40 bg-success/5" : b.status === "rejected" ? "border-destructive/20 bg-destructive/5" : "border-border"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{b.provider_name}</p>
                          {b.verification_status === "verified" && (
                            <ShieldCheck className="h-4 w-4 text-success" />
                          )}
                          {b.avg_rating > 0 && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3 w-3 fill-warning text-warning" />{" "}
                              {Number(b.avg_rating).toFixed(1)} ({b.review_count})
                            </span>
                          )}
                          <StatusBadge status={b.status} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          PKR {Number(b.hourly_rate).toLocaleString()}/hr · {b.hours_estimate}h ·
                          Equipment PKR {Number(b.equipment_cost).toLocaleString()}
                        </p>
                        {isHomeowner && (
                          <div className="mt-3 grid gap-2 rounded-lg border border-brand/25 bg-brand-soft/20 p-3 text-sm sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Original Budget</p>
                              <p className="font-semibold">
                                {j.budget
                                  ? `PKR ${Number(j.budget).toLocaleString()}`
                                  : "Not specified"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Provider's Offered Price
                              </p>
                              <p className="font-semibold">
                                PKR {Number(b.total).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Optional Note</p>
                              <p className="font-semibold">{b.message || "No note added"}</p>
                            </div>
                          </div>
                        )}
                        {b.message && <p className="mt-2 text-sm">{b.message}</p>}
                        <div className="mt-3">
                          <ProviderProfileButton providerId={b.provider_id} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">PKR {Number(b.total).toLocaleString()}</p>
                        {isHomeowner && j.status === "open" && b.status === "pending" && (
                          <div className="mt-2 flex gap-2 justify-end">
                            <AcceptBidButton bidId={b.id} jobId={jobId} />
                            <DeclineBidButton bidId={b.id} jobId={jobId} />
                          </div>
                        )}
                        {isHomeowner && b.status === "accepted" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => setActiveProviderId(b.provider_id)}
                          >
                            Message Provider
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {/* Chat opens once the customer confirms an offer. */}
          {isHomeowner && activeChatBid && (
            <ChatBox
              jobId={jobId}
              providerId={activeChatBid.provider_id}
              userId={user.id}
              title={`Chat with ${activeChatBid.provider_name}`}
            />
          )}

          {isActiveProvider && (
            <ChatBox jobId={jobId} providerId={user.id} userId={user.id} title="Chat with owner" />
          )}
          {isActiveProvider && j.status === "in_progress" && (
            <ProviderCompletionPanel
              jobId={jobId}
              requested={completionRequested}
              onChanged={() => {
                qc.invalidateQueries({ queryKey: ["job", jobId] });
                qc.invalidateQueries({ queryKey: ["notifications"] });
                qc.invalidateQueries({ queryKey: ["notifCount"] });
              }}
            />
          )}
          {isHomeowner && j.status === "in_progress" && completionRequested && (
            <CustomerCompletionPanel
              jobId={jobId}
              onConfirmed={() => {
                qc.invalidateQueries({ queryKey: ["job", jobId] });
                qc.invalidateQueries({ queryKey: ["payment", jobId] });
                qc.invalidateQueries({ queryKey: ["notifications"] });
                qc.invalidateQueries({ queryKey: ["notifCount"] });
              }}
            />
          )}
          {/* Review */}
          {isHomeowner && j.status === "completed" && <ReviewSection jobId={jobId} />}
        </div>

        {/* Payment sidebar */}
        <div>
          {acceptedBid && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Escrow Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount</p>
                  <p className="text-3xl font-bold">
                    PKR {Number(acceptedBid.total).toLocaleString()}
                  </p>
                </div>
                <div className="flex justify-center">
                  <StatusBadge status={payment?.status ?? "pending"} />
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Demo escrow (no real charge)
                </p>
                {isHomeowner && (
                  <div className="space-y-2 pt-2">
                    {payment?.status === "pending" && (
                      <Button
                        className="w-full"
                        onClick={async () => {
                          try {
                            await holdPayment({ data: { jobId } });
                            qc.invalidateQueries({ queryKey: ["payment", jobId] });
                            toast.success("Payment held in escrow");
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        Hold in escrow
                      </Button>
                    )}
                    {payment?.status === "held" && j.status === "in_progress" && (
                      <>
                        <p className="rounded-md border border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
                          {completionRequested
                            ? "Confirm completion in the job timeline to release payment and leave a review."
                            : "Waiting for the provider to mark the work as completed."}
                        </p>
                        <Button variant="outline" className="w-full" disabled>
                          Raise an Issue
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}

function CustomerCompletionPanel({
  jobId,
  onConfirmed,
}: {
  jobId: number;
  onConfirmed: () => void;
}) {
  const confirm = useServerFn(confirmJobCompletion);
  const [busy, setBusy] = useState(false);

  return (
    <Card className="border-success/30 bg-success/5">
      <CardHeader>
        <CardTitle className="text-base">Confirm Job Completion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          The provider marked this job as complete. Confirm once the work is finished, then share a
          star rating and written review.
        </p>
        <Button
          className="w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await confirm({ data: { jobId } });
              onConfirmed();
              toast.success("Job completed. You can now leave a review.");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Confirming..." : "Confirm Completion"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ProviderCompletionPanel({
  jobId,
  requested,
  onChanged,
}: {
  jobId: number;
  requested: boolean;
  onChanged: () => void;
}) {
  const markCompleted = useServerFn(requestJobCompletion);
  const [busy, setBusy] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Job Completion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requested ? (
          <p className="rounded-md border border-success/30 bg-success/5 p-3 text-sm text-success">
            Completion sent to the customer for confirmation.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Mark this job as completed when the work is finished. The customer will be notified to
              confirm completion.
            </p>
            <Button
              className="w-full"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await markCompleted({ data: { jobId } });
                  onChanged();
                  toast.success("Customer notified to confirm completion");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Sending..." : "Mark as Completed"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AcceptBidButton({ bidId, jobId }: { bidId: number; jobId: number }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await acceptBid({ data: { bidId } });
          toast.success("Bid accepted — provider notified");
          qc.invalidateQueries({ queryKey: ["job", jobId] });
          qc.invalidateQueries({ queryKey: ["bids", jobId] });
          qc.invalidateQueries({ queryKey: ["payment", jobId] });
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "…" : "Accept"}
    </Button>
  );
}

function DeclineBidButton({ bidId, jobId }: { bidId: number; jobId: number }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await declineBid({ data: { bidId } });
          toast.success("Offer rejected - provider notified");
          qc.invalidateQueries({ queryKey: ["bids", jobId] });
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "..." : "Reject"}
    </Button>
  );
}

function BidForm({
  jobId,
  existing,
  onSaved,
}: {
  jobId: number;
  existing?: any;
  onSaved: () => void;
}) {
  const submit = useServerFn(createBid);
  const [rate, setRate] = useState(existing?.hourly_rate ?? "");
  const [hours, setHours] = useState(existing?.hours_estimate ?? "");
  const [equip, setEquip] = useState(existing?.equipment_cost ?? 0);
  const [msg, setMsg] = useState(existing?.message ?? "");
  const [busy, setBusy] = useState(false);
  const total = Number(rate || 0) * Number(hours || 0) + Number(equip || 0);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await submit({
            data: {
              jobId,
              hourlyRate: Number(rate),
              hoursEstimate: Number(hours),
              equipmentCost: Number(equip),
              message: msg,
            },
          });
          toast.success(existing ? "Bid updated" : "Bid submitted");
          onSaved();
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-lg border border-dashed border-brand/40 bg-brand-soft/30 p-4"
    >
      <p className="mb-3 text-sm font-semibold">{existing ? "Update your bid" : "Submit a bid"}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Hourly rate (PKR)</Label>
          <Input
            type="number"
            required
            min={0}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Hours estimate</Label>
          <Input
            type="number"
            required
            min={0.1}
            step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Equipment (PKR)</Label>
          <Input type="number" min={0} value={equip} onChange={(e) => setEquip(e.target.value)} />
        </div>
      </div>
      <div className="mt-3">
        <Label className="text-xs">Message (optional)</Label>
        <Textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-sm">
          Total: <span className="text-lg font-bold">PKR {total.toLocaleString()}</span>
        </p>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : existing ? "Update bid" : "Submit bid"}
        </Button>
      </div>
    </form>
  );
}

type PublicProviderProfile = {
  id: number;
  name: string;
  bio: string | null;
  categories: string[] | null;
  hourly_rate: number | string | null;
  years_experience: number | string | null;
  is_available: boolean;
  profile_picture_url: string | null;
  verification_status: string;
  avg_rating: number | string;
  review_count: number | string;
  completed_jobs: number | string;
};

type PublicProviderReview = {
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name: string;
};

function ProviderProfileButton({ providerId }: { providerId: number }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["publicProviderProfile", providerId],
    queryFn: () => getPublicProviderProfile({ data: { id: providerId } }),
    enabled: open,
  });
  const profile = data?.profile as PublicProviderProfile | undefined;
  const reviews = (data?.reviews ?? []) as PublicProviderReview[];
  const hourlyRate = Number(profile?.hourly_rate ?? 0);
  const dailyRate = hourlyRate * 8;
  const avgRating = Number(profile?.avg_rating ?? 0);
  const reviewCount = Number(profile?.review_count ?? 0);
  const initials = getInitials(profile?.name ?? "Provider");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <UserRound className="mr-2 h-4 w-4" />
          View Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Provider Profile</DialogTitle>
        </DialogHeader>
        {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>}
        {error && (
          <p className="py-8 text-center text-sm text-destructive">{(error as Error).message}</p>
        )}
        {profile && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.profile_picture_url ?? undefined} alt={profile.name} />
                <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{profile.name}</h2>
                  <StatusBadge status={profile.verification_status} />
                  {profile.verification_status === "verified" && (
                    <ShieldCheck className="h-4 w-4 text-success" />
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile.bio || "No bio added yet."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(profile.categories ?? []).length > 0 ? (
                    (profile.categories ?? []).map((category) => (
                      <Badge key={category} variant="secondary">
                        {category}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">No services listed</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ProfileMetric
                label="Years of Experience"
                value={`${Number(profile.years_experience ?? 0)} yrs`}
              />
              <ProfileMetric
                label="Hourly Rate"
                value={formatPKR(hourlyRate)}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <ProfileMetric label="Daily Rate" value={formatPKR(dailyRate)} />
              <ProfileMetric
                label="Total Completed Jobs"
                value={Number(profile.completed_jobs ?? 0).toLocaleString()}
              />
              <ProfileMetric label="Number of Reviews" value={reviewCount.toLocaleString()} />
              <ProfileMetric
                label="Availability Status"
                value={profile.is_available ? "Available" : "Unavailable"}
                tone={profile.is_available ? "success" : "muted"}
              />
            </div>

            <div className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold">Average Rating</p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <p className="flex items-center gap-1 text-2xl font-bold">
                  <Star className="h-5 w-5 fill-warning text-warning" />
                  {avgRating > 0 ? avgRating.toFixed(1) : "0.0"} / 5
                </p>
                <p className="pb-1 text-sm text-muted-foreground">
                  Based on {reviewCount.toLocaleString()} {reviewCount === 1 ? "Review" : "Reviews"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold">Customer Feedback</h3>
              {reviews.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No customer feedback yet.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {reviews.slice(0, 5).map((review, index) => (
                    <div
                      key={`${review.created_at}-${index}`}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{review.reviewer_name}</p>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                          {review.rating} / 5
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileMetric({
  label,
  value,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "muted";
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 flex items-center gap-1.5 font-semibold ${
          tone === "success" ? "text-success" : tone === "muted" ? "text-muted-foreground" : ""
        }`}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}

function formatPKR(value: number) {
  return `PKR ${Math.max(0, Math.round(value)).toLocaleString()}`;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

type MessageRow = {
  id: number;
  sender_id: number;
  sender_name: string;
  body: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | string | null;
  read_at: string | null;
};

function ChatBox({
  jobId,
  providerId,
  userId,
  title,
}: {
  jobId: number;
  providerId: number;
  userId: number;
  title: string;
}) {
  const send = useServerFn(sendMessage);
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", jobId, providerId],
    queryFn: () => listMessages({ data: { jobId, providerId } }),
    refetchInterval: 2500,
  });
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<{
    fileName: string;
    mimeType: string;
    fileContentBase64: string;
    sizeBytes: number;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const chatMessages = messages as MessageRow[];
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);
  const chooseAttachment = async (file: File | undefined) => {
    if (!file) return;
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP, PDF, DOC, or DOCX files can be shared.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error(`${file.name} must be under 3MB.`);
      return;
    }
    const fileContentBase64 = await readFileAsDataUrl(file);
    setAttachment({
      fileName: file.name,
      mimeType: file.type,
      fileContentBase64,
      sizeBytes: file.size,
    });
    if (fileInput.current) fileInput.current.value = "";
  };
  const submitMessage = async () => {
    if (!body.trim() && !attachment) return;
    setSending(true);
    try {
      await send({
        data: {
          jobId,
          providerId,
          body: body.trim(),
          attachment: attachment
            ? {
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                fileContentBase64: attachment.fileContentBase64,
              }
            : undefined,
        },
      });
      setBody("");
      setAttachment(null);
      qc.invalidateQueries({ queryKey: ["messages", jobId, providerId] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span>{title}</span>
          <span className="text-xs font-normal text-muted-foreground">Live chat</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={scroller}
          className="mb-3 h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-3"
        >
          {chatMessages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">Start the conversation.</p>
          )}
          {chatMessages.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-brand text-brand-foreground" : "bg-muted"}`}
                >
                  {!mine && <p className="text-xs opacity-70">{m.sender_name}</p>}
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  {m.attachment_url && (
                    <a
                      href={m.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-2 flex items-center gap-2 rounded-md border px-2 py-2 ${mine ? "border-brand-foreground/30 bg-brand-foreground/10" : "border-border bg-background"}`}
                    >
                      {String(m.attachment_type).startsWith("image/") ? (
                        <img
                          src={m.attachment_url}
                           alt={m.attachment_name ?? undefined}
                          className="h-14 w-14 rounded object-cover"
                        />
                      ) : (
                        <FileText className="h-5 w-5 shrink-0" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium">
                          {m.attachment_name}
                        </span>
                        <span className="block text-[11px] opacity-70">
                          {formatBytes(Number(m.attachment_size || 0))}
                        </span>
                      </span>
                    </a>
                  )}
                  {mine && (
                    <p className="mt-1 flex items-center justify-end gap-1 text-[11px] opacity-70">
                      {m.read_at ? (
                        <>
                          <CheckCheck className="h-3 w-3" /> Read
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3" /> Sent
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await submitMessage();
          }}
          className="space-y-2"
        >
          {attachment && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                {attachment.mimeType.startsWith("image/") ? (
                  <ImageIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{attachment.fileName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBytes(attachment.sizeBytes)}
                </span>
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setAttachment(null)}
                aria-label="Remove attachment"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message..."
            />
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx"
              onChange={(e) => void chooseAttachment(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInput.current?.click()}
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button type="submit" disabled={sending || (!body.trim() && !attachment)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ReviewSection({ jobId }: { jobId: number }) {
  const submit = useServerFn(createReview);
  const qc = useQueryClient();
  const { data: existing } = useQuery({
    queryKey: ["review", jobId],
    queryFn: () => getJobReview({ data: { jobId } }),
  });
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (existing) {
      setRating(existing.rating);
      setComment(existing.comment);
    }
  }, [existing]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{existing ? "Your review" : "Leave a review"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const writtenReview = comment.trim();
            if (!writtenReview) {
              toast.error("Please add a written review.");
              return;
            }
            setBusy(true);
            try {
              await submit({ data: { jobId, rating, comment: writtenReview } });
              qc.invalidateQueries({ queryKey: ["review", jobId] });
              setComment(writtenReview);
              toast.success(existing ? "Review updated" : "Review submitted");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-4"
        >
          <div>
            <Label className="text-xs">Rating</Label>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="rounded-sm p-1 transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  aria-pressed={rating === n}
                >
                  <Star
                    className={`h-7 w-7 ${n <= rating ? "fill-warning text-warning" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-medium">{rating}/5</span>
            </div>
          </div>
          <div>
            <Label htmlFor="review-comment" className="text-xs">
              Written Review
            </Label>
            <Textarea
              id="review-comment"
              rows={4}
              required
              maxLength={1000}
              placeholder="Excellent service. Arrived on time and completed the work professionally."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving..." : existing ? "Update review" : "Submit review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
