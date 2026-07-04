import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meQueryOptions } from "@/components/nav";
import { createAdmin, getAdmins, deleteAdmin } from "@/lib/admin.functions";
import { Container, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Shield, Plus, Trash2, UserPlus } from "lucide-react";
import { format } from "date-fns";

type Admin = {
  id: number;
  email: string;
  name: string;
  created_at: string;
};

export const Route = createFileRoute("/admin/admins")({
  head: () => ({ meta: [{ title: "Admins Management — HomeFixr Admin" }] }),
  component: AdminAdminsPage,
});

function AdminAdminsPage() {
  const userQuery = useQuery(meQueryOptions());
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const qc = useQueryClient();
  const doCreateAdmin = useServerFn(createAdmin);
  const doDeleteAdmin = useServerFn(deleteAdmin);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: () => getAdmins(),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      await doCreateAdmin({ data });
    },
    onSuccess: () => {
      toast.success("Admin created successfully");
      qc.invalidateQueries({ queryKey: ["admins"] });
      setFormData({ name: "", email: "", password: "" });
      setIsCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (adminId: number) => {
      await doDeleteAdmin({ data: { adminId } });
    },
    onSuccess: () => {
      toast.success("Admin deleted successfully");
      qc.invalidateQueries({ queryKey: ["admins"] });
      setSelectedAdmin(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (userQuery.data && userQuery.data.role !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error("All fields are required");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (!selectedAdmin) return;
    deleteMutation.mutate(selectedAdmin.id);
  };

  return (
    <Container>
      <PageHeader
        title="Admins Management"
        subtitle="Manage admin accounts"
        action={
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Admin
          </Button>
        }
      />

      <Card className="my-6">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">Loading admins...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-semibold">No admins found</p>
              <p className="text-sm text-muted-foreground">
                Create your first admin account
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-hero/10 p-3">
                      <Shield className="h-5 w-5 text-hero" />
                    </div>
                    <div>
                      <p className="font-medium">{admin.name}</p>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(admin.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  {admin.id !== userQuery.data?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setSelectedAdmin(admin)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={isCreating}
        onOpenChange={() => {
          setIsCreating(false);
          setFormData({ name: "", email: "", password: "" });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Add a new admin account to the system
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Admin name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@homefixr.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min. 8 characters"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreate}>
              Create Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!selectedAdmin}
        onOpenChange={() => setSelectedAdmin(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete admin "{selectedAdmin?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}