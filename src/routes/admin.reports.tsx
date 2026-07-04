import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { meQueryOptions } from "@/components/nav";
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
import { ensureSchema, getSql } from "@/lib/db.server";

type ReportData = {
  period: string;
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
  const userQuery = useQuery(meQueryOptions());
  const [period, setPeriod] = useState("30d");

  const { data: reportData = [], isLoading } = useQuery({
    queryKey: ["adminReports", period],
    queryFn: async () => {
      await ensureSchema();
      const sql = getSql();
      
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      
      const query = `
        WITH daily_stats AS (
          SELECT 
            DATE(created_at) as date,
            COUNT(DISTINCT CASE WHEN role IN ('homeowner', 'provider') THEN id END) as users,
            COUNT(DISTINCT CASE WHEN role = 'provider' THEN id END) as providers,
            COUNT(DISTINCT CASE WHEN role = 'homeowner' THEN id END) as homeowners,
            COUNT(DISTINCT j.id) as jobs
          FROM users u
          LEFT JOIN jobs j ON j.homeowner_id = u.id 
            AND j.created_at >= NOW() - INTERVAL '${days} days'
          WHERE u.created_at >= NOW() - INTERVAL '${days} days'
            OR j.created_at >= NOW() - INTERVAL '${days} days'
          GROUP BY DATE(created_at)
        ),
        revenue_stats AS (
          SELECT 
            DATE(p.created_at) as date,
            SUM(p.amount) as revenue
          FROM payments p
          WHERE p.status = 'released'
            AND p.created_at >= NOW() - INTERVAL '${days} days'
          GROUP BY DATE(p.created_at)
        )
        SELECT 
          ds.date,
          ds.users,
          ds.providers,
          ds.jobs,
          COALESCE(rs.revenue, 0) as revenue
        FROM daily_stats ds
        LEFT JOIN revenue_stats rs ON ds.date = rs.date
        ORDER BY ds.date DESC
        LIMIT ${days}
      `;

      const result = await sql.query(query);
      return result as ReportData[];
    },
  });

  const summaryStats = {
    totalUsers: reportData.reduce((sum, d) => sum + d.users, 0),
    totalProviders: reportData.reduce((sum, d) => sum + d.providers, 0),
    totalJobs: reportData.reduce((sum, d) => sum + d.jobs, 0),
    totalRevenue: reportData.reduce((sum, d) => sum + d.revenue, 0),
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
                <p className="text-2xl font-bold">${summaryStats.totalRevenue.toFixed(2)}</p>
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
                        ${day.revenue.toFixed(2)}
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