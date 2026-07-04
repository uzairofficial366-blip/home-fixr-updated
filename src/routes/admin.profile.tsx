import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meQueryOptions } from "@/components/nav";
import { adminUpdateProfile, adminChangePassword } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { UserCircle2, Lock, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({ meta: [{ title: "Profile — HomeFixr Admin" }] }),
  component: AdminProfilePage,
});

function AdminProfilePage() {
  const { data: user } = useQuery(meQueryOptions());
  const qc = useQueryClient();
  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);

  const doUpdateProfile = useServerFn(adminUpdateProfile);
  const doChangePassword = useServerFn(adminChangePassword);

  if (user && user.role !== "admin") return <Navigate to="/dashboard" />;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await doUpdateProfile({ data: { name } });
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await doChangePassword({ data: { currentPassword, newPassword } });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#1F3A63] text-white text-2xl font-bold shadow-lg">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className="mt-1 inline-flex items-center rounded-full bg-[#1F3A63]/10 px-2.5 py-0.5 text-xs font-medium text-[#1F3A63]">
                Administrator
              </span>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} disabled className="bg-muted/50" />
            </div>
            <Button type="submit" disabled={busy} className="bg-[#1F3A63] hover:bg-[#1F3A63]/90">
              {busy ? "Saving…" : "Update Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-[#1F3A63]" />
            <h3 className="text-base font-semibold">Change Password</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="current">Current Password</Label>
              <div className="relative">
                <Input
                  id="current"
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new">New Password</Label>
              <div className="relative">
                <Input
                  id="new"
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="confirm">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? (
                  <EyeOff className="h-4 w-4 mr-1" />
                ) : (
                  <Eye className="h-4 w-4 mr-1" />
                )}
                {showPasswords ? "Hide passwords" : "Show passwords"}
              </Button>
            </div>
            <Button type="submit" disabled={busy} className="bg-[#1F3A63] hover:bg-[#1F3A63]/90">
              {busy ? "Changing…" : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
