"use client";

import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Brain, 
  Shield, 
  Activity, 
  Clock, 
  Database, 
  Zap, 
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMLModel } from "@/lib/hooks/use-data";
import { Skeleton } from "@/components/ui/skeleton";

export default function ModelDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { model, isLoading, isError } = useMLModel(id as string);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (isError || !model) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Model Not Found</h2>
        <p className="text-muted-foreground">The requested ML model could not be loaded or doesn't exist.</p>
        <Button onClick={() => router.push("/dashboard/models")}>Back to Inventory</Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-500 bg-green-500/10 border-green-500/20";
      case "training": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      default: return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/models")} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{model.name}</h1>
              <Badge className={getStatusColor(model.status)}>{model.status}</Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-mono text-xs">{model.id}</span>
              <span>•</span>
              <span className="capitalize">{model.type.replace("_", " ")}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Download Weights</Button>
          <Button>Retrain Model</Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Accuracy Score</CardDescription>
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tabular-nums">
              {(model.accuracy * 100).toFixed(2)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={model.accuracy * 100} className="h-2" />
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Inferences Today</CardDescription>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <CardTitle className="text-3xl font-bold tabular-nums">
              {(model.runtime_stats?.inferences_today || 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              Peak: 450 req/min
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Avg Latency</CardDescription>
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <CardTitle className="text-3xl font-bold tabular-nums">
              {model.runtime_stats?.avg_latency_ms || 0}ms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Optimized for real-time OT
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Alerts Triggered</CardDescription>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <CardTitle className="text-3xl font-bold tabular-nums">
              {model.runtime_stats?.alerts_generated || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3 text-green-500" />
              99.8% True Positive Rate
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Model Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Model Architecture & Training
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Model Type</span>
                  <span className="font-medium capitalize">{model.type.replace("_", " ")}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="font-medium tabular-nums">{new Date(model.updated_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <span className="font-medium">v1.2.0-stable</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Training Run ID</span>
                  <span className="font-mono text-xs">trn-8842-1923</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Database className="h-4 w-4" />
                Training Datasets
              </h3>
              <div className="grid gap-3">
                {model.training_datasets?.map((entry: any) => (
                  <div 
                    key={entry.id} 
                    className="p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/dashboard/datasets/${entry.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-primary uppercase group-hover:underline">{entry.attack_threat_type}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        View Details
                        <ArrowLeft className="h-3 w-3 rotate-180" />
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {entry.datasets.map((ds: string) => (
                        <Badge key={ds} variant="outline" className="text-[10px] bg-background">
                          {ds}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deployment Info */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                Security Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Adversarial Robustness</span>
                <span className="font-bold text-green-500">High</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Poisoning Defense</span>
                <span className="font-bold text-green-500">Krum Active</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Inference Integrity</span>
                <span className="font-bold text-primary">Merkle Audited</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Model Purpose
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This {model.name} is designed to detect {model.type.replaceAll("_", " ")} signatures in high-traffic industrial environments. It utilizes selective state spaces for efficient inference on edge nodes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
