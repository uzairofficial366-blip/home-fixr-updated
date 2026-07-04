import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meQueryOptions } from "@/components/nav";
import { Container, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { ensureSchema, getSql } from "@/lib/db.server";

type Category = {
  id: number;
  name: string;
  description: string;
  job_count: number;
  created_at: string;
};

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "Categories Management — HomeFixr Admin" }] }),
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  const userQuery = useQuery(meQueryOptions());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [actionType, setActionType] = useState<"delete" | "edit" | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const qc = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["adminCategories", search, page],
    queryFn: async () => {
      await ensureSchema();
      const sql = getSql();
      let query = `
        SELECT 
          c.id,
          c.name,
          c.description,
          COUNT(j.id) as job_count,
          c.created_at
        FROM categories c
        LEFT JOIN jobs j ON j.category = c.name
      `;
      const params: any[] = [];

      if (search) {
        params.push(`%${search}%`);
        query += ` WHERE c.name ILIKE $1 OR c.description ILIKE $1`;
      }

      query += ` GROUP BY c.id, c.name, c.description, c.created_at`;
      query += ` ORDER BY c.name ASC LIMIT 20 OFFSET $${params.length + 1}`;
      params.push(page * 20);

      const result = await sql.query(query, params);
      return result as Category[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const sql = getSql();
      await sql`INSERT INTO categories (name, description) VALUES (${data.name}, ${data.description})`;
    },
    onSuccess: () => {
      toast.success("Category created successfully");
      qc.invalidateQueries({ queryKey: ["adminCategories"] });
      setFormData({ name: "", description: "" });
      setIsCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; description: string }) => {
      const sql = getSql();
      await sql`UPDATE categories SET name = ${data.name}, description = ${data.description} WHERE id = ${data.id}`;
    },
    onSuccess: () => {
      toast.success("Category updated successfully");
      qc.invalidateQueries({ queryKey: ["adminCategories"] });
      setSelectedCategory(null);
      setActionType(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const sql = getSql();
      await sql`DELETE FROM categories WHERE id = ${categoryId}`;
    },
    onSuccess: () => {
      toast.success("Category deleted successfully");
      qc.invalidateQueries({ queryKey: ["adminCategories"] });
      setSelectedCategory(null);
      setActionType(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (userQuery.data && userQuery.data.role !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  const handleSubmit = () => {
    if (isCreating) {
      if (!formData.name.trim()) {
        toast.error("Category name is required");
        return;
      }
      createMutation.mutate(formData);
    } else if (selectedCategory && actionType === "edit") {
      updateMutation.mutate({
        id: selectedCategory.id,
        name: formData.name || selectedCategory.name,
        description: formData.description || selectedCategory.description,
      });
    }
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setFormData({ name: category.name, description: category.description });
    setActionType("edit");
  };

  return (
    <Container>
      <PageHeader
        title="Categories Management"
        subtitle="Manage service categories"
        action={
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        }
      />

      <Card className="my-6">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="my-6">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg font-semibold">No categories found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex-1">
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {category.job_count} jobs
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setSelectedCategory(category);
                        setActionType("delete");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!(isCreating || (selectedCategory && actionType === "edit"))}
        onOpenChange={() => {
          setIsCreating(false);
          setSelectedCategory(null);
          setActionType(null);
          setFormData({ name: "", description: "" });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isCreating ? "Create Category" : "Edit Category"}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Category name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Category description"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              {isCreating ? "Create" : "Update"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!selectedCategory && actionType === "delete"}
        onOpenChange={() => {
          setSelectedCategory(null);
          setActionType(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCategory && deleteMutation.mutate(selectedCategory.id)}
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

import { Label } from "@/components/ui/label";