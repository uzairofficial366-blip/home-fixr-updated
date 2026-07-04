import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProviderProfile,
  updateProviderProfile,
  submitVerification,
  listAppliedJobs,
  uploadVerificationDocument,
} from "@/lib/provider.functions";
import { CATEGORIES } from "@/lib/jobs.functions";
import { Container, PageHeader, StatusBadge } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, ShieldCheck, Upload, FileText, Eye, BriefcaseBusiness } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/provider")({
  head: () => ({ meta: [{ title: "Provider profile — HomeFixr" }] }),
  component: ProviderPage,
});

const DOC_TYPES = [
  "CNIC Front",
  "CNIC Back",
  "Passport",
  "Driving License",
  "Other Government ID",
] as const;

type DocumentType = (typeof DOC_TYPES)[number];

type ProviderDocument = {
  id: number;
  document_type: string;
  original_name: string;
  file_url: string;
};

type ProviderProfile = {
  bio?: string;
  categories?: string[];
  hourly_rate?: number;
  years_experience?: number;
  is_available?: boolean;
  profile_picture_url?: string | null;
  verification_status?: string;
  verification_notes?: string;
  id_document_url?: string;
  documents?: ProviderDocument[];
  name?: string;
  email?: string;
};

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

function ProviderPage() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["providerProfile"],
    queryFn: () => getProviderProfile(),
  });
  const update = updateProviderProfile;
  const verify = submitVerification;
  const uploadDocument = uploadVerificationDocument;
  const p = (profile as ProviderProfile | undefined) ?? null;

  const [tab, setTab] = useState<"profile" | "verification" | "jobs">("profile");
  const [form, setForm] = useState({
    bio: "",
    categories: [] as string[],
    hourlyRate: 0,
    yearsExperience: 0,
    isAvailable: true,
    profilePictureUrl: "",
  });
  const [vform, setVform] = useState({
    fullName: "",
    idDocumentUrl: "",
    licenseDocumentUrl: "",
    documentType: DOC_TYPES[0] as DocumentType,
    documentDescription: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [vbusy, setVbusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (p) {
      setForm({
        bio: p.bio ?? "",
        categories: p.categories ?? [],
        hourlyRate: Number(p.hourly_rate) || 0,
        yearsExperience: p.years_experience ?? 0,
        isAvailable: p.is_available ?? true,
        profilePictureUrl: p.profile_picture_url ?? "",
      });
      if (p.id_document_url) {
        const docUrl = p.id_document_url as string;
        setVform((f) => ({ ...f, idDocumentUrl: docUrl }));
        if (!docUrl.includes("application/pdf")) setPreviewUrl(docUrl);
      }
    }
  }, [p]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP, or PDF files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB.");
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl("application/pdf");
    }

    setUploadProgress(0);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Unable to read file"));
        reader.readAsDataURL(file);
      });
      setUploadProgress(50);
      const result = await uploadDocument({
        data: {
          fileName: file.name,
          mimeType: file.type,
          fileContentBase64: base64,
          documentType: vform.documentType,
        },
      });
      setUploadProgress(100);
      setVform((f) => ({ ...f, idDocumentUrl: result.fileUrl }));
      if (file.type.startsWith("image/")) setPreviewUrl(result.fileUrl);
      toast.success("Document uploaded successfully.");
      await qc.invalidateQueries({ queryKey: ["providerProfile"] });
    } catch (e) {
      toast.error((e as Error).message);
      setPreviewUrl(null);
    } finally {
      setUploadProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Profile photo must be JPG, PNG, or WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile photo must be under 2MB.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((current) => ({ ...current, profilePictureUrl: dataUrl }));
    } catch {
      toast.error("Unable to read profile photo.");
    } finally {
      e.currentTarget.value = "";
    }
  };

  if (isLoading)
    return (
      <Container>
        <p className="my-10">Loading…</p>
      </Container>
    );

  return (
    <Container className="max-w-3xl">
      <PageHeader
        title="Provider profile"
        subtitle="Manage your services and verification."
        action={<StatusBadge status={p?.verification_status ?? "unverified"} />}
      />

      {/* Tabs */}
      <div className="my-6 flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {(["profile", "verification", "jobs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              tab === t
                ? "bg-white shadow-sm text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "profile" ? "Profile" : t === "verification" ? "Verification" : "Jobs Applied"}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-xl">About you</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await update({
                    data: {
                      bio: form.bio,
                      categories: form.categories as Array<(typeof CATEGORIES)[number]>,
                      hourlyRate: Number(form.hourlyRate),
                      yearsExperience: Number(form.yearsExperience),
                      isAvailable: form.isAvailable,
                      profilePictureUrl: form.profilePictureUrl,
                    },
                  });
                  await qc.invalidateQueries({ queryKey: ["providerProfile"] });
                  toast.success("Profile updated");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="space-y-5"
            >
              <div className="flex flex-wrap items-center gap-4 rounded-xl border-2 border-border p-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={form.profilePictureUrl} alt="Provider profile picture" />
                  <AvatarFallback className="text-lg font-semibold">
                    {p?.name?.slice(0, 2)?.toUpperCase() ?? "PR"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <Label htmlFor="profile-picture" className="text-base font-semibold">Profile picture</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Displayed to homeowners when they review your bid.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => profilePhotoRef.current?.click()}
                  className="border-primary text-primary hover:bg-accent-orange hover:text-white"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Upload photo
                </Button>
                <input
                  ref={profilePhotoRef}
                  id="profile-picture"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleProfilePhotoChange}
                />
              </div>
              <div>
                <Label htmlFor="bio" className="text-base font-semibold">Bio</Label>
                <Textarea
                  id="bio"
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="mb-3 block text-base font-semibold">Categories you serve</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CATEGORIES.map((c) => (
                    <label
                      key={c}
                      className="flex items-center gap-2 rounded-lg border-2 border-border p-3 text-sm cursor-pointer hover:border-accent-orange transition-colors"
                    >
                      <Checkbox
                        checked={form.categories.includes(c)}
                        onCheckedChange={(v) =>
                          setForm({
                            ...form,
                            categories: v
                              ? [...form.categories, c]
                              : form.categories.filter((x) => x !== c),
                          })
                        }
                      />
                      <span className="font-medium">{c}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border-2 border-border p-4">
                <div>
                  <Label htmlFor="isAvailable" className="text-base font-semibold">Available for new job requests</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Receive broadcasts for matching service categories.
                  </p>
                </div>
                <Switch
                  id="isAvailable"
                  checked={form.isAvailable}
                  onCheckedChange={(checked) => setForm({ ...form, isAvailable: checked })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="hourlyRate" className="text-base font-semibold">Default hourly rate (PKR)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    min={0}
                    value={form.hourlyRate}
                    onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="yearsExperience" className="text-base font-semibold">Years of experience</Label>
                  <Input
                    id="yearsExperience"
                    type="number"
                    min={0}
                    value={form.yearsExperience}
                    onChange={(e) => setForm({ ...form, yearsExperience: Number(e.target.value) })}
                    className="mt-2"
                  />
                </div>
              </div>
              <Button type="submit" disabled={busy} className="bg-accent-orange hover:bg-orange-600 text-white shadow-md">
                {busy ? "Saving…" : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "verification" && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-accent-orange" />
              Identity Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            {p?.verification_status === "verified" ? (
              <div className="rounded-xl border-2 border-success/40 bg-success/5 p-5">
                <p className="font-semibold text-success text-lg">You are verified ✓</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.verification_notes}</p>
                {p.id_document_url && (
                  <a
                    href={p.id_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm text-accent-orange hover:underline font-medium"
                  >
                    <Eye className="h-4 w-4" /> View submitted document
                  </a>
                )}
              </div>
            ) : (
              <>
                {p?.verification_status === "pending" && (
                  <div className="mb-4 rounded-xl border-2 border-warning/40 bg-warning/5 p-5">
                    <p className="font-semibold text-warning text-lg">Verification Pending</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your documents are under review by our admin team. You'll be notified once a
                      decision is made.
                    </p>
                    {p.id_document_url && (
                      <a
                        href={p.id_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-sm text-accent-orange hover:underline font-medium"
                      >
                        <Eye className="h-4 w-4" /> View submitted document
                      </a>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      You can submit new documents if needed.
                    </p>
                  </div>
                )}
                {p?.verification_status === "rejected" && p?.verification_notes && (
                  <div className="mb-4 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4">
                    <p className="font-medium text-destructive text-lg">Previous submission rejected</p>
                    <p className="mt-1 text-sm text-muted-foreground">{p.verification_notes}</p>
                  </div>
                )}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!vform.idDocumentUrl) {
                      toast.error("Please upload an ID document first.");
                      return;
                    }
                    setVbusy(true);
                    try {
                      await verify({ data: vform });
                      toast.success("Submitted for verification — status: Pending");
                      await qc.invalidateQueries({ queryKey: ["providerProfile"] });
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setVbusy(false);
                    }
                  }}
                  className="space-y-5"
                >
                  <p className="text-sm text-muted-foreground">
                    Upload a government-issued ID. Your documents will be reviewed by our admin team
                    within 24–48 hours.
                  </p>

                  <div>
                    <Label htmlFor="documentType" className="text-base font-semibold">Document type</Label>
                    <Select
                      value={vform.documentType}
                      onValueChange={(v) => setVform({ ...vform, documentType: v as DocumentType })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Upload ID document</Label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 transition hover:border-accent-orange hover:bg-brand-soft/20"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center">
                        Click to upload JPG, PNG, WebP or PDF (max 5MB)
                      </p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                    {uploadProgress !== null && (
                      <div className="mt-3">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-accent-orange transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {uploadProgress < 100
                            ? `Uploading… ${uploadProgress}%`
                            : "Upload complete"}
                        </p>
                      </div>
                    )}
                    {previewUrl && !previewUrl.includes("application/pdf") && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Preview:</p>
                        <img
                          src={previewUrl}
                          alt="Document preview"
                          className="max-h-40 rounded-lg border border-border object-contain"
                        />
                      </div>
                    )}
                    {vform.idDocumentUrl &&
                      (previewUrl?.includes("application/pdf") ||
                        (!previewUrl && vform.idDocumentUrl)) && (
                        <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">PDF document ready</span>
                        </div>
                      )}
                  </div>

                  <div>
                    <Label htmlFor="fullName" className="text-base font-semibold">Full legal name</Label>
                    <Input
                      id="fullName"
                      required
                      value={vform.fullName}
                      onChange={(e) => setVform({ ...vform, fullName: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="licenseDocumentUrl" className="text-base font-semibold">License / certification URL (optional)</Label>
                    <Input
                      id="licenseDocumentUrl"
                      type="url"
                      placeholder="https://…"
                      value={vform.licenseDocumentUrl}
                      onChange={(e) => setVform({ ...vform, licenseDocumentUrl: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="documentDescription" className="text-base font-semibold">Describe your documents</Label>
                    <Textarea
                      id="documentDescription"
                      rows={3}
                      required
                      minLength={10}
                      placeholder="e.g. Pakistani CNIC front & back, valid till 2028."
                      value={vform.documentDescription}
                      onChange={(e) => setVform({ ...vform, documentDescription: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={vbusy || !vform.idDocumentUrl}
                    className="bg-accent-orange hover:bg-orange-600 text-white shadow-md"
                  >
                    {vbusy ? "Submitting…" : "Submit for verification"}
                  </Button>
                </form>

                {/* Show previously uploaded documents */}
                {p?.documents && (p.documents as ProviderDocument[]).length > 0 && (
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="mb-3 text-sm font-semibold">Previously uploaded documents</p>
                    <div className="space-y-3">
                      {(p.documents as ProviderDocument[]).map((doc) => (
                        <div
                          key={doc.id}
                          className="rounded-lg border border-border bg-muted/20 p-3"
                        >
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            <span className="font-medium text-foreground">{doc.document_type}</span>
                            <span>— {doc.original_name}</span>
                          </div>
                          {doc.file_url?.startsWith("data:image") && (
                            <img
                              src={doc.file_url}
                              alt={doc.document_type}
                              className="mt-2 max-h-32 rounded border border-border object-contain"
                            />
                          )}
                          {doc.file_url?.startsWith("data:application/pdf") && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              PDF document uploaded
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "jobs" && <AppliedJobsTab />}
    </Container>
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

function AppliedJobsTab() {
  const { data: jobs = [], isLoading } = useQuery<AppliedJob[]>({
    queryKey: ["appliedJobs"],
    queryFn: () => listAppliedJobs(),
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "status">("newest");

  const filtered = jobs
    .filter((j) => j.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "newest")
        return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
      if (sort === "oldest")
        return new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
      return a.bid_status.localeCompare(b.bid_status);
    });

  if (isLoading) return <p className="my-6 text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search by job title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
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

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
          <BriefcaseBusiness className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No jobs found.</p>
        </div>
      ) : (
        filtered.map((j) => (
          <Card key={j.bid_id} className="p-4 shadow-card hover:shadow-card-hover transition-all">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={j.bid_status} />
                  <span className="text-xs text-muted-foreground">{j.category}</span>
                </div>
                <h3 className="mt-1 font-semibold text-foreground">{j.title}</h3>
                <p className="text-xs text-muted-foreground">Owner: {j.homeowner_name}</p>
                <p className="text-xs text-muted-foreground">
                  Applied: {new Date(j.applied_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">PKR {Number(j.bid_amount).toLocaleString()}</p>
                <div className="mt-2 flex gap-2 justify-end">
                  <Link to="/jobs/$id" params={{ id: String(j.job_id) }}>
                    <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-accent-orange hover:text-white">
                      View Job
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}