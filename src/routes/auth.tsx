import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { signup, login } from "@/lib/auth.functions";
import { Container } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { User2, Wrench, Eye, EyeOff } from "lucide-react";
import homefixrLogo from "../../public/Home Fixr Icon-128x128.jpg";

const SearchSchema = z.object({ mode: z.enum(["login", "signup"]).catch("login") });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => SearchSchema.parse(s),
  head: () => ({ meta: [{ title: "Sign in — HomeFixr" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const nav = useNavigate();
  const qc = useQueryClient();
  const doSignup = useServerFn(signup);
  const doLogin = useServerFn(login);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "homeowner" as "homeowner" | "provider",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        await doSignup({
          data: {
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            phone: form.phone || undefined,
          },
        });
        toast.success("Account created");
      } else {
        await doLogin({ data: { email: form.email, password: form.password } });
        toast.success("Welcome back");
      }
      await qc.invalidateQueries({ queryKey: ["me"] });
      nav({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-soft min-h-[calc(100vh-4rem)] py-12">
      <Container className="max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <img
            src={homefixrLogo}
            alt="HomeFixr Logo"
            className="h-12 w-12 object-contain"
          />
          <span className="text-2xl font-bold">
            <span className="text-primary">Home</span>
            <span className="text-accent-orange">Fixr</span>
          </span>
        </div>
        <Card className="shadow-card animate-slide-up">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription className="text-base">
              {mode === "signup"
                ? "Homeowners post jobs, professionals bid on them."
                : "Sign in to your HomeFixr account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              {mode === "signup" && (
                <>
                  <div>
                    <Label className="mb-3 block text-base font-semibold">I want to</Label>
                    <RadioGroup
                      value={form.role}
                      onValueChange={(v) =>
                        setForm({ ...form, role: v as "homeowner" | "provider" })
                      }
                      className="grid grid-cols-2 gap-3"
                    >
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-border p-4 transition-all hover:border-accent-orange has-[[data-state=checked]]:border-accent-orange has-[[data-state=checked]]:bg-brand-soft">
                        <RadioGroupItem value="homeowner" />
                        <User2 className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold">Customer</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-border p-4 transition-all hover:border-accent-orange has-[[data-state=checked]]:border-accent-orange has-[[data-state=checked]]:bg-brand-soft">
                        <RadioGroupItem value="provider" />
                        <Wrench className="h-5 w-5 text-primary" />
                        <span className="text-sm font-semibold">Service Provider</span>
                      </label>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="name" className="text-base font-semibold">
                      Full name
                    </Label>
                    <Input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-base font-semibold">
                      Phone (optional)
                    </Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email" className="text-base font-semibold">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-base font-semibold">
                  Password
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {mode === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="font-medium text-accent-orange hover:underline"
                      onClick={() => nav({ to: "/auth", search: { mode: "login" } })}
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    New to HomeFixr?{" "}
                    <button
                      type="button"
                      className="font-medium text-accent-orange hover:underline"
                      onClick={() => nav({ to: "/auth", search: { mode: "signup" } })}
                    >
                      Create an account
                    </button>
                  </>
                )}
              </p>
            </form>
          </CardContent>
        </Card>
      </Container>
    </main>
  );
}