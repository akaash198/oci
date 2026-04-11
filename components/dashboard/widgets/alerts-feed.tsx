"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Shield,
  Zap,
  Network,
  Server,
  Eye,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { useAlerts } from "@/lib/hooks/use-data";

interface Alert {
  id: string;
  threat_type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  status: string;
  created_at: string;
  assets?: { name: string };
}

const alertIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  fdi_sensor_spoofing: Zap,
  ransomware_staging: Shield,
  ddos_flood: Network,
  insider_threat: Eye,
  physical_intrusion: Eye,
  firmware_tampering: Server,
  der_manipulation: Zap,
  model_poisoning: Shield,
  default: AlertTriangle,
};

const severityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
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

export function AlertsFeed() {
  const { alerts, isLoading, isError, mutate } = useAlerts({ limit: 10 });

  const acknowledgeAlert = async (id: string) => {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "acknowledged" }),
      });
      mutate();
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <Skeleton className="h-7 w-7 rounded-md" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Failed to load alerts</p>
        <Button variant="ghost" size="sm" onClick={() => mutate()} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  const activeAlerts = (alerts as Alert[]).filter((a) => a.status !== "resolved");

  if (activeAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
        <p className="text-sm font-medium text-green-500">All Clear</p>
        <p className="text-xs">No active alerts</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="flex flex-col gap-3">
        {activeAlerts.map((alert) => {
          const Icon = alertIcons[alert.threat_type] || alertIcons.default;
          const isNew = alert.status === "new";
          return (
            <div
              key={alert.id}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-3 transition-colors",
                isNew && "bg-muted/50",
                alert.severity === "critical" && isNew && "border-red-500/50 bg-red-500/5"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={cn("rounded-md p-1.5", severityColors[alert.severity])}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight line-clamp-1">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.assets?.name || alert.threat_type?.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-xs shrink-0", severityColors[alert.severity])}>
                  {alert.severity}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(alert.created_at)}
                </span>
                <div className="flex items-center gap-1">
                  {isNew && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                    <a href={`/dashboard/alerts?id=${alert.id}`}>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
