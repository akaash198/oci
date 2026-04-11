"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  AlertTriangle,
  Server,
  Brain,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";
import { ThreatMap } from "@/components/dashboard/widgets/threat-map";
import { AlertsFeed } from "@/components/dashboard/widgets/alerts-feed";
import { ModelStatusGrid } from "@/components/dashboard/widgets/model-status-grid";
import { TelemetryChart } from "@/components/dashboard/widgets/telemetry-chart";
import { AssetHealthMatrix } from "@/components/dashboard/widgets/asset-health-matrix";
import { useDashboardStats } from "@/lib/hooks/use-data";

export default function DashboardPage() {
  const { stats, isLoading, isError, mutate } = useDashboardStats();

  const systemStatus = stats.activeAlerts === 0 
    ? { label: "All Systems Nominal", color: "bg-green-500/10 text-green-500 border-green-500/20" }
    : stats.alertsBySeverity?.critical > 0
    ? { label: "Critical Alerts Active", color: "bg-red-500/10 text-red-500 border-red-500/20" }
    : { label: "Alerts Detected", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Operations Center</h1>
          <p className="text-muted-foreground">Real-time OT/ICS threat monitoring and response</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`gap-1 ${systemStatus.color}`}>
            <CheckCircle2 className="h-3 w-3" />
            {systemStatus.label}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Live
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => mutate()}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Protected Assets</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalAssets}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="text-green-500">{stats.assetsByStatus?.online || 0} online</span>
                  <span className="mx-1">·</span>
                  <span className="text-yellow-500">{stats.assetsByStatus?.warning || 0} warning</span>
                  <span className="mx-1">·</span>
                  <span className="text-red-500">{stats.assetsByStatus?.offline || 0} offline</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={stats.activeAlerts > 10 ? "border-destructive/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.activeAlerts > 10 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${stats.activeAlerts > 10 ? "text-destructive" : ""}`}>
                  {stats.activeAlerts}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span className="text-red-500">{stats.alertsBySeverity?.critical || 0} critical</span>
                  <span className="mx-1">·</span>
                  <span className="text-orange-500">{stats.alertsBySeverity?.high || 0} high</span>
                  <span className="mx-1">·</span>
                  <span className="text-yellow-500">{stats.alertsBySeverity?.medium || 0} medium</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Threats Blocked</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.threatsBlocked.toLocaleString()}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  <span className="text-green-500">+23%</span>
                  <span className="ml-1">detection rate</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ML Model Accuracy</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.modelAccuracy}%</div>
                <Progress value={stats.modelAccuracy} className="mt-2 h-1" />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Threat Map - Large */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Threat Activity Map</CardTitle>
              <CardDescription>Real-time attack detection across all assets</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/dashboard/alerts">
                View Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardHeader>
          <CardContent>
            <ThreatMap />
          </CardContent>
        </Card>

        {/* Alerts Feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Live Alerts</CardTitle>
              <CardDescription>Recent security events</CardDescription>
            </div>
            <Badge variant="destructive">{stats.activeAlerts}</Badge>
          </CardHeader>
          <CardContent>
            <AlertsFeed />
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ML Model Status */}
        <Card>
          <CardHeader>
            <CardTitle>ML Model Status</CardTitle>
            <CardDescription>8 threat detection models active</CardDescription>
          </CardHeader>
          <CardContent>
            <ModelStatusGrid />
          </CardContent>
        </Card>

        {/* Telemetry Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Telemetry Overview</CardTitle>
              <CardDescription>
                Data points processed: {isLoading ? "..." : stats.dataPointsProcessed.toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Live</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <TelemetryChart />
          </CardContent>
        </Card>
      </div>

      {/* Asset Health Matrix */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Asset Health Matrix</CardTitle>
            <CardDescription>Security status by asset category</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard/assets">
              View All Assets
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          <AssetHealthMatrix />
        </CardContent>
      </Card>

      {/* Error State */}
      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
          Failed to load dashboard data. Please check your connection and try again.
          <Button variant="outline" size="sm" className="ml-4" onClick={() => mutate()}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
