import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicProviderProfile } from "@/lib/provider.functions";
import { Container, StatusBadge } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Star,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Briefcase,
  CalendarCheck,
  MessageSquare,
  ChevronLeft,
  Wrench,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/providers/$id")({
  head: () => ({ meta: [{ title: "Provider Profile — HomeFixr" }] }),
  component: PublicProviderProfile,
});

function PublicProviderProfile() {
  const { id } = Route.useParams();
  const providerId = Number(id);

  const { data, isLoading, error } = useQuery({
    queryKey: ["publicProvider", providerId],
    queryFn: () => getPublicProviderProfile({ data: { id: providerId } }),
    enabled: !isNaN(providerId) && providerId > 0,
  });

  if (isLoading) {
    return (
      <Container className="max-w-4xl">
        <ProfileSkeleton />
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container className="max-w-4xl">
        <div className="my-16 text-center">
          <p className="text-destructive">
            {error ? (error as Error).message : "Provider not found."}
          </p>
          <Link to="/browse" className="mt-4 inline-block">
            <Button variant="outline">
              <ChevronLeft className="h-4 w-4" /> Back to browse
            </Button>
          </Link>
        </div>
      </Container>
    );
  }

  const p = data.profile as {
    id: number;
    name: string;
    bio: string;
    categories: string[];
    hourly_rate: number;
    daily_rate: number;
    years_experience: number;
    is_available: boolean;
    profile_picture_url: string | null;
    verification_status: string;
    avg_rating: number;
    review_count: number;
    completed_jobs: number;
  };

  const reviews = data.reviews as Array<{
    rating: number;
    comment: string;
    created_at: string;
    reviewer_name: string;
  }>;

  const initials = p.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const avgRating = Number(p.avg_rating) || 0;
  const fullStars = Math.floor(avgRating);
  const hasHalf = avgRating - fullStars >= 0.5;

  return (
    <Container className="max-w-4xl">
      {/* Back link */}
      <div className="pt-6">
        <Link to="/browse">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
      </div>

      <div className="my-4 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* ── Left column ── */}
        <div className="space-y-6">
          {/* Hero card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start gap-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar className="h-24 w-24 ring-2 ring-border">
                    <AvatarImage src={p.profile_picture_url ?? undefined} alt={p.name} />
                    <AvatarFallback className="text-2xl font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  {/* Availability dot */}
                  <span
                    className={cn(
                      "absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background",
                      p.is_available ? "bg-success" : "bg-muted-foreground",
                    )}
                    title={p.is_available ? "Available" : "Unavailable"}
                  />
                </div>

                {/* Name + badges */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
                    {p.verification_status === "verified" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        <ShieldAlert className="h-3 w-3" /> Unverified
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        p.is_available
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <CircleDot className="h-3 w-3" />
                      {p.is_available ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  {/* Star rating summary */}
                  <div className="mt-2 flex items-center gap-2">
                    <StarRow rating={avgRating} />
                    <span className="text-sm font-semibold">
                      {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {p.review_count > 0
                        ? `(${p.review_count} review${p.review_count !== 1 ? "s" : ""})`
                        : "No reviews yet"}
                    </span>
                  </div>

                  {/* Bio */}
                  {p.bio && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.bio}</p>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-4">
                <StatBox
                  icon={<Clock className="h-4 w-4" />}
                  label="Hourly Rate"
                  value={`PKR ${Number(p.hourly_rate).toLocaleString()}`}
                />
                <StatBox
                  icon={<CalendarCheck className="h-4 w-4" />}
                  label="Daily Rate"
                  value={`PKR ${Number(p.daily_rate).toLocaleString()}`}
                />
                <StatBox
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Experience"
                  value={`${p.years_experience} yr${p.years_experience !== 1 ? "s" : ""}`}
                />
                <StatBox
                  icon={<CalendarCheck className="h-4 w-4" />}
                  label="Jobs Done"
                  value={String(p.completed_jobs)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Services offered */}
          {p.categories?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wrench className="h-4 w-4 text-brand" /> Services Offered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {p.categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rating breakdown + reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4 fill-warning text-warning" /> Ratings & Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Big rating display */}
              <div className="flex items-center gap-6 rounded-xl border border-border bg-muted/20 p-5">
                <div className="text-center">
                  <p className="text-5xl font-bold tracking-tight">
                    {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">out of 5</p>
                </div>
                <div className="flex-1">
                  <StarRow rating={avgRating} size="lg" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Based on <span className="font-semibold text-foreground">{p.review_count}</span>{" "}
                    {p.review_count === 1 ? "review" : "reviews"}
                  </p>
                  {/* Rating bar breakdown */}
                  <RatingBars reviews={reviews} />
                </div>
              </div>

              {/* Individual reviews */}
              {reviews.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No reviews yet. Be the first to leave feedback!
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-semibold">Recent Reviews</p>
                  {reviews.map((r, i) => (
                    <ReviewCard key={i} review={r} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">
          {/* Quick stats card */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <p className="text-sm font-semibold">Quick Overview</p>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Verification</span>
                  <StatusBadge status={p.verification_status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Availability</span>
                  <span
                    className={cn(
                      "font-medium",
                      p.is_available ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    {p.is_available ? "Available" : "Unavailable"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Hourly rate</span>
                  <span className="font-semibold">
                    PKR {Number(p.hourly_rate).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Daily rate</span>
                  <span className="font-semibold">PKR {Number(p.daily_rate).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Experience</span>
                  <span className="font-semibold">{p.years_experience} years</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Jobs completed</span>
                  <span className="font-semibold">{p.completed_jobs}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg rating</span>
                  <span className="flex items-center gap-1 font-semibold">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                    <span className="text-xs font-normal text-muted-foreground">/ 5</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total reviews</span>
                  <span className="font-semibold">{p.review_count}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services mini card */}
          {p.categories?.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="mb-3 text-sm font-semibold">Services</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer feedback highlights */}
          {reviews.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4 text-brand" /> Customer Feedback
                </p>
                <div className="space-y-2">
                  {reviews.slice(0, 3).map((r, i) => (
                    <div key={i} className="rounded-lg bg-muted/40 px-3 py-2">
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: r.rating }).map((_, s) => (
                          <Star key={s} className="h-3 w-3 fill-warning text-warning" />
                        ))}
                      </div>
                      {r.comment ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">"{r.comment}"</p>
                      ) : (
                        <p className="text-xs italic text-muted-foreground">No comment left.</p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">— {r.reviewer_name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}

/* ── Sub-components ── */

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-muted/20 p-3 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-base font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = rating >= n;
        const half = !filled && rating >= n - 0.5;
        return (
          <Star
            key={n}
            className={cn(
              sz,
              filled || half ? "fill-warning text-warning" : "text-muted-foreground/40",
            )}
          />
        );
      })}
    </div>
  );
}

function RatingBars({ reviews }: { reviews: Array<{ rating: number }> }) {
  if (reviews.length === 0) return null;
  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const max = Math.max(...counts.map((c) => c.count), 1);
  return (
    <div className="mt-3 space-y-1">
      {counts.map(({ star, count }) => (
        <div key={star} className="flex items-center gap-2 text-xs">
          <span className="w-3 text-right text-muted-foreground">{star}</span>
          <Star className="h-3 w-3 fill-warning text-warning" />
          <div className="flex-1 overflow-hidden rounded-full bg-muted h-1.5">
            <div
              className="h-full rounded-full bg-warning transition-all"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-4 text-muted-foreground">{count}</span>
        </div>
      ))}
    </div>
  );
}

function ReviewCard({
  review,
}: {
  review: { rating: number; comment: string; created_at: string; reviewer_name: string };
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
            {review.reviewer_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{review.reviewer_name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(review.created_at).toLocaleDateString("en-PK", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <StarRow rating={review.rating} />
      </div>
      {review.comment && (
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">"{review.comment}"</p>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="my-6 animate-pulse space-y-4">
      <div className="h-48 rounded-xl bg-muted" />
      <div className="h-32 rounded-xl bg-muted" />
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  );
}
