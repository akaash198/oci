"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Zap,
  Shield,
  Network,
  Eye,
  FileCode,
  Users,
  Brain,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useMLModels } from "@/lib/hooks/use-data";

interface MLModel {
  id: string;
  name: string;
  type: string;
  status: "active" | "training" | "degraded" | "offline";
  accuracy: number;
  runtime_stats?: {
    inferences_today: number;
    avg_latency_ms: number;
    last_inference: string;
    alerts_generated: number;
  };
}

const modelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pinn_fdi: Zap,
  cgan_ransomware: Shield,
  tinyml_der: Network,
  yolo_physical: Eye,
  graph_mamba_firmware: FileCode,
  drl_ddos: Shield,
  behavioral_dna: Users,
  federated_aggregator: Brain,
};

const modelShortNames: Record<string, string> = {
  pinn_fdi: "PINN-FDI",
  cgan_ransomware: "cGAN-Ransom",
  tinyml_der: "TinyML-DER",
  yolo_physical: "YOLO-Phys",
  graph_mamba_firmware: "GrMamba-FW",
  drl_ddos: "DRL-DDoS",
  behavioral_dna: "BehavDNA",
  federated_aggregator: "Krum-Def",
};

const statusConfig = {
  active: { color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle2, label: "Active" },
  training: { color: "text-blue-500", bg: "bg-blue-500/10", icon: Loader2, label: "Training" },
  degraded: { color: "text-yellow-500", bg: "bg-yellow-500/10", icon: AlertCircle, label: "Degraded" },
  offline: { color: "text-gray-500", bg: "bg-gray-500/10", icon: AlertCircle, label: "Offline" },
};

export function ModelStatusGrid() {
  const { models, isLoading, isError } = useMLModels();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <Skeleton className="h-1 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Failed to load models</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(models as MLModel[]).map((model) => {
        const status = model.status || "active";
        const StatusIcon = statusConfig[status]?.icon || CheckCircle2;
        const ModelIcon = modelIcons[model.type] || Brain;
        const shortName = modelShortNames[model.type] || model.name?.split("-")[0];
        const accuracy = (model.accuracy || 0) * 100;

        return (
          <div
            key={model.id}
            className={cn(
              "flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50",
              status === "training" && "border-blue-500/30",
              status === "degraded" && "border-yellow-500/30"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("rounded-md p-1.5", statusConfig[status]?.bg)}>
                  <ModelIcon className={cn("h-4 w-4", statusConfig[status]?.color)} />
                </div>
                <div>
                  <p className="text-sm font-medium">{shortName}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[120px]">{model.name}</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn("gap-1 text-xs", statusConfig[status]?.bg, statusConfig[status]?.color)}
              >
                <StatusIcon className={cn("h-3 w-3", status === "training" && "animate-spin")} />
                {statusConfig[status]?.label}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Accuracy</span>
              <span className="font-medium">{accuracy.toFixed(1)}%</span>
            </div>
            <Progress value={accuracy} className="h-1" />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{(model.runtime_stats?.inferences_today || 0).toLocaleString()} inferences</span>
              <span>{model.runtime_stats?.avg_latency_ms?.toFixed(0) || 0}ms avg</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
