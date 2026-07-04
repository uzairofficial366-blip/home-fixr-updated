import { adminService } from "@/services/admin.service";
import { me } from "@/lib/auth.functions";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Container, PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Users, Briefcase, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";

type ReportData = {
  date: string;
  users: number;
  providers: number;
  jobs: number;
  revenue: number;
};

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — HomeFixr Admin" }] }),
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const userQuery = useQuery({ queryKey: ["me"], queryFn: () => me(), staleTime: 30_000 });
  const [period, setPeriod] = useState("30d");

  const { data: reportData = [], isLoading } = useQuery<ReportData[]>({
    queryKey: ["adminReports", period],
    queryFn: async () => {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      return adminService.getReports({ days });
    },
  });

  const summaryStats = {
    totalUsers: reportData.reduce((sum, d) => sum + Number(d.users || 0), 0),
    totalProviders: reportData.reduce((sum, d) => sum + Number(d.providers || 0), 0),
    totalJobs: reportData.reduce((sum, d) => sum + Number(d.jobs || 0), 0),
    totalRevenue: reportData.reduce((sum, d) => sum + Number(d.revenue || 0), 0),
  };

  if (userQuery.data && userQuery.data.role !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  return (
    <Container>
      <PageHeader
        title="Reports & Analytics"
        subtitle="View platform statistics and trends"
        action={
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
        }
      />

      <div className="my-6 flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="my-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{summaryStats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-purple-500/10 p-3">
                <Briefcase className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Providers</p>
                <p className="text-2xl font-bold">{summaryStats.totalProviders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-500/10 p-3">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <p className="text-2xl font-bold">{summaryStats.totalJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-orange-500/10 p-3">
                <DollarSign className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">PKR {summaryStats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="my-6">
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">Loading reports...</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart3 className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-semibold">No data available</p>
              <p className="text-sm text-muted-foreground">
                No activity in the selected period
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Providers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Jobs
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportData.map((day) => (
                    <tr key={day.date} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4 text-sm font-medium">
                        {format(new Date(day.date), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-sm">{day.users}</td>
                      <td className="px-6 py-4 text-sm">{day.providers}</td>
                      <td className="px-6 py-4 text-sm">{day.jobs}</td>
                      <td className="px-6 py-4 text-sm font-medium">
                        PKR {Number(day.revenue || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}