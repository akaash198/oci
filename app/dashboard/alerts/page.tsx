"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/lib/hooks/use-data";

interface Alert {
  id: string;
  threat_type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  asset_id?: string;
  assets?: { id: string; name: string; type: string };
  status: "new" | "acknowledged" | "investigating" | "resolved";
  ml_confidence: number;
  created_at: string;
  acknowledged_at?: string;
  assigned_to?: string;
}

const severityColors = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

const statusColors = {
  new: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  acknowledged: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  investigating: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  resolved: "bg-green-500/10 text-green-500 border-green-500/20",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AlertsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const { alerts, count, isLoading, isError, mutate } = useAlerts({
    severity: severityFilter,
    status: statusFilter,
    limit: 100,
  });

  // Filter alerts by search query (client-side for responsiveness)
  const filteredAlerts = (alerts as Alert[]).filter((alert) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      alert.title?.toLowerCase().includes(query) ||
      alert.description?.toLowerCase().includes(query) ||
      alert.assets?.name?.toLowerCase().includes(query)
    );
  });

  // Calculate alert counts by severity
  const alertCounts = {
    critical: (alerts as Alert[]).filter((a) => a.severity === "critical" && a.status !== "resolved").length,
    high: (alerts as Alert[]).filter((a) => a.severity === "high" && a.status !== "resolved").length,
    medium: (alerts as Alert[]).filter((a) => a.severity === "medium" && a.status !== "resolved").length,
    low: (alerts as Alert[]).filter((a) => a.severity === "low" && a.status !== "resolved").length,
  };

  const updateAlertStatus = async (alertId: string, newStatus: Alert["status"]) => {
    try {
      const response = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alertId, status: newStatus }),
      });

      if (response.ok) {
        mutate(); // Refresh alerts
      }
    } catch (error) {
      console.error("Failed to update alert:", error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Alerts</h1>
          <p className="text-muted-foreground">Monitor and respond to detected threats</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Alert Counts */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-red-500/20">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Critical</p>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold text-red-500">{alertCounts.critical}</p>
              )}
            </div>
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/20">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">High</p>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold text-orange-500">{alertCounts.high}</p>
              )}
            </div>
            <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Medium</p>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold text-yellow-500">{alertCounts.medium}</p>
              )}
            </div>
            <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Low</p>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold text-blue-500">{alertCounts.low}</p>
              )}
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No alerts found</p>
              <p className="text-sm">
                {searchQuery || severityFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Your systems are secure"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead>Alert</TableHead>
                  <TableHead className="hidden md:table-cell">Asset</TableHead>
                  <TableHead className="hidden lg:table-cell">Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Time</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => (
                  <TableRow key={alert.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Badge variant="outline" className={cn(severityColors[alert.severity])}>
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium line-clamp-1">{alert.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {alert.threat_type?.replace(/_/g, " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {alert.assets?.name || "Unknown Asset"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(alert.ml_confidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {((alert.ml_confidence || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(statusColors[alert.status])}>
                        {alert.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">{formatTimeAgo(alert.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAlert(alert)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Badge variant="outline" className={cn(severityColors[alert.severity])}>
                                {alert.severity}
                              </Badge>
                              {alert.title}
                            </DialogTitle>
                            <DialogDescription>
                              {alert.threat_type?.replace(/_/g, " ")}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-1">Description</h4>
                              <p className="text-sm text-muted-foreground">{alert.description}</p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <h4 className="font-medium mb-1">Asset</h4>
                                <p className="text-sm text-muted-foreground">
                                  {alert.assets?.name || "Unknown"}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-1">ML Confidence</h4>
                                <p className="text-sm text-muted-foreground">
                                  {((alert.ml_confidence || 0) * 100).toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-1">Created</h4>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(alert.created_at).toLocaleString()}
                                </p>
                              </div>
                              {alert.assigned_to && (
                                <div>
                                  <h4 className="font-medium mb-1">Assigned To</h4>
                                  <p className="text-sm text-muted-foreground">{alert.assigned_to}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 pt-4">
                              {alert.status === "new" && (
                                <Button onClick={() => updateAlertStatus(alert.id, "acknowledged")}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Acknowledge
                                </Button>
                              )}
                              {(alert.status === "acknowledged" || alert.status === "new") && (
                                <Button
                                  variant="secondary"
                                  onClick={() => updateAlertStatus(alert.id, "investigating")}
                                >
                                  Investigate
                                </Button>
                              )}
                              {alert.status !== "resolved" && (
                                <Button
                                  variant="outline"
                                  onClick={() => updateAlertStatus(alert.id, "resolved")}
                                >
                                  Resolve
                                </Button>
                              )}
                              <Button variant="outline">Run Playbook</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
          Failed to load alerts. Please check your connection and try again.
          <Button variant="outline" size="sm" className="ml-4" onClick={() => mutate()}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
