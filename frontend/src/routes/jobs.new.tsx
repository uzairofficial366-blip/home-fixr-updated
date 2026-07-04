import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { createJob, suggestPrice, CATEGORIES } from "@/lib/jobs.functions";
import { Container, PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ImageIcon, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/jobs/new")({
  head: () => ({ meta: [{ title: "Post a job — HomeFixr" }] }),
  component: NewJob,
});

type ServiceCategory = (typeof CATEGORIES)[number];

const PRICE_RECOMMENDATIONS: Record<ServiceCategory, { hourly: number; daily: number }> = {
  Plumbing: { hourly: 1000, daily: 6500 },
  Electrical: { hourly: 900, daily: 6000 },
  Gardening: { hourly: 800, daily: 5000 },
  Carpenter: { hourly: 950, daily: 6200 },
  Painter: { hourly: 850, daily: 5500 },
  Cleaning: { hourly: 700, daily: 4500 },
  "AC Technician": { hourly: 1200, daily: 7500 },
  Mason: { hourly: 1000, daily: 6500 },
  "Home Maintenance": { hourly: 900, daily: 6000 },
  "Appliance Repair": { hourly: 1100, daily: 7000 },
  "Pest Control": { hourly: 1000, daily: 6500 },
  "Other Services": { hourly: 850, daily: 5500 },
};

const formatPKR = (amount: number) => `Rs.${amount.toLocaleString()}`;

function NewJob() {
  const nav = useNavigate();
  const create = createJob;
  const suggest = suggestPrice;

  const [form, setForm] = useState({
    category: "Plumbing" as ServiceCategory,
    title: "",
    description: "",
    address: "",
    preferredDate: "",
    preferredTime: "",
    estimatedHours: "",
    estimatedDays: "",
    additionalNotes: "",
    budget: "",
  });
  const [photos, setPhotos] = useState<
    Array<{ fileName: string; mimeType: string; fileContentBase64: string }>
  >([]);
  const [suggestion, setSuggestion] = useState<{
    min: number;
    max: number;
    reasoning: string;
  } | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSuggest = form.title.length >= 3 && form.description.length >= 10;
  const recommendedPrice = PRICE_RECOMMENDATIONS[form.category];
  const serviceLabel = form.category === "Electrical" ? "Electrician" : form.category;

  const onAcceptSuggestedPrice = () => {
    const estimatedDays = Number(form.estimatedDays);
    const estimatedHours = Number(form.estimatedHours);
    const suggestedBudget =
      estimatedDays > 0
        ? Math.round(estimatedDays * recommendedPrice.daily)
        : estimatedHours > 0
          ? Math.round(estimatedHours * recommendedPrice.hourly)
          : recommendedPrice.daily;

    setForm({ ...form, budget: String(suggestedBudget) });
    toast.success("Suggested price added to your budget.");
  };

  const onSuggest = async () => {
    if (!canSuggest) return;
    setSuggesting(true);
    try {
      const r = await suggest({
        data: { category: form.category, title: form.title, description: form.description },
      });
      setSuggestion(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSuggesting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { id } = await create({
        data: {
          category: form.category,
          title: form.title,
          description: form.description,
          address: form.address,
          preferredDate: form.preferredDate,
          preferredTime: form.preferredTime,
          estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
          estimatedDays: form.estimatedDays ? Number(form.estimatedDays) : undefined,
          photos,
          additionalNotes: form.additionalNotes,
          budget: form.budget ? Number(form.budget) : undefined,
        },
      });
      toast.success("Job posted");
      nav({ to: "/jobs/$id", params: { id: String(id) } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const onPhotosSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remainingSlots = 4 - photos.length;
    if (remainingSlots <= 0) {
      toast.error("You can upload up to 4 photos.");
      e.target.value = "";
      return;
    }

    const accepted = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) toast.error("Only the first 4 photos will be added.");

    try {
      const nextPhotos = await Promise.all(
        accepted.map(async (file) => {
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            throw new Error("Only JPG, PNG, or WebP photos are allowed.");
          }
          if (file.size > 2 * 1024 * 1024) {
            throw new Error(`${file.name} must be under 2MB.`);
          }
          const fileContentBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
            reader.readAsDataURL(file);
          });
          return { fileName: file.name, mimeType: file.type, fileContentBase64 };
        }),
      );
      setPhotos((current) => [...current, ...nextPhotos]);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <Container className="max-w-3xl">
      <PageHeader
        title="Post a job request"
        subtitle="Share the service, timing, location, duration, and any photos providers need to quote accurately."
      />
      <form onSubmit={onSubmit} className="my-6 space-y-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as ServiceCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-brand/30 bg-brand-soft/30 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-brand">Smart price recommendation</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fair starting rates for {serviceLabel}.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={onAcceptSuggestedPrice}>
                  <Check className="h-4 w-4" />
                  Accept suggested price
                </Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Suggested Hourly Rate</p>
                  <p className="mt-1 text-xl font-bold">{formatPKR(recommendedPrice.hourly)}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Suggested Daily Rate</p>
                  <p className="mt-1 text-xl font-bold">{formatPKR(recommendedPrice.daily)}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Acceptance uses your entered duration when available, otherwise the daily rate.
              </p>
            </div>
            <div>
              <Label htmlFor="title">Job title</Label>
              <Input
                id="title"
                required
                maxLength={160}
                placeholder="e.g. Fix leaking kitchen sink"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                required
                minLength={10}
                maxLength={2000}
                rows={5}
                placeholder="Describe the problem, what you've tried, and any parts already purchased."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="address">Address / Area</Label>
              <Input
                id="address"
                required
                placeholder="e.g. F-11 Markaz, Islamabad"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="preferredDate">Preferred date</Label>
                <Input
                  id="preferredDate"
                  type="date"
                  required
                  value={form.preferredDate}
                  onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="preferredTime">Preferred time</Label>
                <Input
                  id="preferredTime"
                  type="time"
                  required
                  value={form.preferredTime}
                  onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="estimatedHours">Estimated duration: hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  min={0}
                  step="0.5"
                  placeholder="e.g. 3"
                  value={form.estimatedHours}
                  onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="estimatedDays">Estimated duration: days</Label>
                <Input
                  id="estimatedDays"
                  type="number"
                  min={0}
                  step="0.5"
                  placeholder="e.g. 1"
                  value={form.estimatedDays}
                  onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="photos">Photos (optional)</Label>
              <label
                htmlFor="photos"
                className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 p-6 transition hover:border-brand/50 hover:bg-brand-soft/20"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Upload up to 4 JPG, PNG, or WebP photos (max 2MB each)
                </span>
              </label>
              <Input
                id="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={onPhotosSelected}
              />
              {photos.length > 0 && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {photos.map((photo, index) => (
                    <div
                      key={`${photo.fileName}-${index}`}
                      className="relative overflow-hidden rounded-lg border border-border bg-muted/20"
                    >
                      <img
                        src={photo.fileContentBase64}
                        alt={photo.fileName}
                        className="h-36 w-full object-cover"
                      />
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{photo.fileName}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() =>
                            setPhotos((current) => current.filter((_, i) => i !== index))
                          }
                          aria-label={`Remove ${photo.fileName}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="additionalNotes">Additional notes (optional)</Label>
              <Textarea
                id="additionalNotes"
                maxLength={1000}
                rows={3}
                placeholder="Access instructions, parking details, materials available, or anything else providers should know."
                value={form.additionalNotes}
                onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="budget">Custom budget / accepted price (PKR, optional)</Label>
              <Input
                id="budget"
                type="number"
                min={0}
                placeholder={`e.g. ${recommendedPrice.daily}`}
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand/30 bg-brand-soft/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-brand">
                  <Sparkles className="h-4 w-4" />
                  <p className="font-semibold">AI fair-price guidance</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Get an AI-suggested price range before posting.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canSuggest || suggesting}
                onClick={onSuggest}
              >
                {suggesting ? "Analyzing…" : "Get suggestion"}
              </Button>
            </div>
            {suggestion && (
              <div className="mt-4 rounded-lg border border-brand/40 bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-brand">Fair range</p>
                <p className="mt-1 text-2xl font-bold">
                  PKR {suggestion.min.toLocaleString()} – {suggestion.max.toLocaleString()}
                </p>
                {suggestion.reasoning && (
                  <p className="mt-2 text-sm text-muted-foreground">{suggestion.reasoning}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Posting…" : "Post job"}
        </Button>
      </form>
    </Container>
  );
}
