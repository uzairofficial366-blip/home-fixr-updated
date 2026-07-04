import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meQueryOptions } from "@/components/nav";
import { Container, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, Globe, Shield, Brain, CreditCard, Mail, Key, Server } from "lucide-react";
import { ensureSchema, getSql } from "@/lib/db.server";

type Settings = {
  site_name: string;
  site_description: string;
  maintenance_mode: boolean;
  ai_pricing_enabled: boolean;
  ai_verification_enabled: boolean;
  payment_escrow_enabled: boolean;
  support_email: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  jwt_secret: string;
  payment_stripe_key: string;
  payment_stripe_secret: string;
  payment_paypal_client: string;
  payment_paypal_secret: string;
};

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — HomeFixr Admin" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const userQuery = useQuery(meQueryOptions());
  const qc = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    site_name: "HomeFixr",
    site_description: "Trusted home service professionals",
    maintenance_mode: false,
    ai_pricing_enabled: true,
    ai_verification_enabled: true,
    payment_escrow_enabled: true,
    support_email: "support@homefixr.com",
    smtp_host: "",
    smtp_port: "",
    smtp_user: "",
    smtp_pass: "",
    smtp_from: "",
    jwt_secret: "",
    payment_stripe_key: "",
    payment_stripe_secret: "",
    payment_paypal_client: "",
    payment_paypal_secret: "",
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => {
      const sql = getSql();
      await ensureSchema();
      for (const [key, value] of Object.entries(data)) {
        await sql`
          INSERT INTO settings (key, value) 
          VALUES (${key}, ${JSON.stringify(value)})
          ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = NOW()
        `;
      }
    },
    onSuccess: () => {
      toast.success("Settings saved successfully");
      qc.invalidateQueries({ queryKey: ["adminSettings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (userQuery.data && userQuery.data.role !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  const handleSave = () => {
    setIsSaving(true);
    updateMutation.mutate(settings, { onSettled: () => setIsSaving(false) });
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Container>
      <PageHeader
        title="Settings"
        subtitle="Configure site settings and preferences"
        action={
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </div>
        }
      />

      <div className="my-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="site_name">Website Name</Label>
              <Input
                id="site_name"
                value={settings.site_name}
                onChange={(e) => updateSetting("site_name", e.target.value)}
                placeholder="HomeFixr"
              />
            </div>
            <div>
              <Label htmlFor="site_description">Description</Label>
              <Textarea
                id="site_description"
                value={settings.site_description}
                onChange={(e) => updateSetting("site_description", e.target.value)}
                placeholder="Trusted home service professionals"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="support_email">Support Email</Label>
              <Input
                id="support_email"
                type="email"
                value={settings.support_email}
                onChange={(e) => updateSetting("support_email", e.target.value)}
                placeholder="support@homefixr.com"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance_mode" className="text-base">
                  Maintenance Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable to temporarily disable the site for maintenance
                </p>
              </div>
              <Switch
                id="maintenance_mode"
                checked={settings.maintenance_mode}
                onCheckedChange={(checked) => updateSetting("maintenance_mode", checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              SMTP Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="smtp_host">SMTP Host</Label>
                <Input
                  id="smtp_host"
                  value={settings.smtp_host}
                  onChange={(e) => updateSetting("smtp_host", e.target.value)}
                  placeholder="smtp.example.com"
                />
              </div>
              <div>
                <Label htmlFor="smtp_port">SMTP Port</Label>
                <Input
                  id="smtp_port"
                  value={settings.smtp_port}
                  onChange={(e) => updateSetting("smtp_port", e.target.value)}
                  placeholder="587"
                />
              </div>
              <div>
                <Label htmlFor="smtp_user">SMTP Username</Label>
                <Input
                  id="smtp_user"
                  value={settings.smtp_user}
                  onChange={(e) => updateSetting("smtp_user", e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="smtp_pass">SMTP Password</Label>
                <Input
                  id="smtp_pass"
                  type="password"
                  value={settings.smtp_pass}
                  onChange={(e) => updateSetting("smtp_pass", e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <Label htmlFor="smtp_from">From Address</Label>
                <Input
                  id="smtp_from"
                  type="email"
                  value={settings.smtp_from}
                  onChange={(e) => updateSetting("smtp_from", e.target.value)}
                  placeholder="noreply@homefixr.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              JWT Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="jwt_secret">JWT Secret</Label>
              <Input
                id="jwt_secret"
                type="password"
                value={settings.jwt_secret}
                onChange={(e) => updateSetting("jwt_secret", e.target.value)}
                placeholder="Your JWT secret key"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Used to sign and verify JWT tokens. Keep this secure.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Keys
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="stripe_key">Stripe Publishable Key</Label>
                <Input
                  id="stripe_key"
                  value={settings.payment_stripe_key}
                  onChange={(e) => updateSetting("payment_stripe_key", e.target.value)}
                  placeholder="pk_..."
                />
              </div>
              <div>
                <Label htmlFor="stripe_secret">Stripe Secret Key</Label>
                <Input
                  id="stripe_secret"
                  type="password"
                  value={settings.payment_stripe_secret}
                  onChange={(e) => updateSetting("payment_stripe_secret", e.target.value)}
                  placeholder="sk_..."
                />
              </div>
              <div>
                <Label htmlFor="paypal_client">PayPal Client ID</Label>
                <Input
                  id="paypal_client"
                  value={settings.payment_paypal_client}
                  onChange={(e) => updateSetting("payment_paypal_client", e.target.value)}
                  placeholder="PayPal Client ID"
                />
              </div>
              <div>
                <Label htmlFor="paypal_secret">PayPal Secret</Label>
                <Input
                  id="paypal_secret"
                  type="password"
                  value={settings.payment_paypal_secret}
                  onChange={(e) => updateSetting("payment_paypal_secret", e.target.value)}
                  placeholder="PayPal Secret"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="ai_pricing" className="text-base">
                  AI Pricing Suggestions
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable AI-powered price suggestions for jobs
                </p>
              </div>
              <Switch
                id="ai_pricing"
                checked={settings.ai_pricing_enabled}
                onCheckedChange={(checked) => updateSetting("ai_pricing_enabled", checked)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="ai_verification" className="text-base">
                  AI Document Verification
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable AI-assisted document verification for providers
                </p>
              </div>
              <Switch
                id="ai_verification"
                checked={settings.ai_verification_enabled}
                onCheckedChange={(checked) => updateSetting("ai_verification_enabled", checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="payment_escrow" className="text-base">
                  Escrow Payments
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable escrow payment system for job payments
                </p>
              </div>
              <Switch
                id="payment_escrow"
                checked={settings.payment_escrow_enabled}
                onCheckedChange={(checked) => updateSetting("payment_escrow_enabled", checked)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </Container>
  );
}
