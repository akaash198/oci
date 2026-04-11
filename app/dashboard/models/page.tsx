"use client";

import { useMemo, useState } from "react";
import { Brain, CheckCircle2, AlertTriangle, Clock, RefreshCw, Search, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMLModels } from "@/lib/hooks/use-data";
import { useRouter } from "next/navigation";

interface MLModel {
  id: string;
  name: string;
  type: string;
  status: "active" | "training" | "degraded" | "offline";
  accuracy: number;
  updated_at?: string;
  created_at?: string;
  runtime_stats?: {
    inferences_today: number;
    avg_latency_ms: number;
    last_inference: string;
    alerts_generated: number;
  };
  training_datasets?: {
    id: string;
    attack_threat_type: string;
    recommended_model: string;
    datasets: string[];
  }[];
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function ModelsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { models, isLoading, isError, mutate } = useMLModels();

  const filtered = useMemo(() => {
    return (models as MLModel[]).filter((m) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return m.name?.toLowerCase().includes(q) || m.type?.toLowerCase().includes(q);
    });
  }, [models, query]);

  const stats = useMemo(() => {
    const list = filtered;
    const total = list.length;
    const active = list.filter((m) => m.status === "active").length;
    const avgAccuracy = total
      ? (list.reduce((sum, m) => sum + (m.accuracy || 0), 0) / total) * 100
      : 0;
    const detections = list.reduce((sum, m) => sum + (m.runtime_stats?.alerts_generated || 0), 0);

    return { total, active, avgAccuracy, detections };
  }, [filtered]);

  const getStatusBadge = (status: MLModel["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">active</Badge>;
      case "training":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">training</Badge>;
      case "degraded":
        return <Badge variant="destructive" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">degraded</Badge>;
      case "offline":
        return <Badge variant="outline" className="text-muted-foreground">offline</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ML Models</h1>
          <p className="text-muted-foreground">Live model inventory and runtime status</p>
        </div>
        <Button variant="outline" onClick={() => mutate()}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardDescription>Total Models</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              {stats.active}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardDescription>Avg Accuracy</CardDescription>
            <CardTitle className="text-2xl">{stats.avgAccuracy.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardDescription>Alerts Generated</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl text-orange-500">
              <AlertTriangle className="h-5 w-5" />
              {stats.detections}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search models..."
            className="pl-9 bg-muted/20"
          />
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
          Failed to load model data.
        </div>
      )}

      <Card className="overflow-hidden border-muted/40 shadow-xl bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[300px]">Model Name</TableHead>
              <TableHead>Typology</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Accuracy</TableHead>
              <TableHead className="text-right">Inferences (24h)</TableHead>
              <TableHead className="text-right">Latency</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7} className="h-12 animate-pulse bg-muted/10" />
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                  No models found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((model) => (
                <TableRow 
                  key={model.id} 
                  className="group cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => router.push(`/dashboard/models/${model.id}`)}
                >
                  <TableCell className="font-semibold">
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-[10px] font-normal text-muted-foreground font-mono truncate max-w-[200px]">
                        {model.id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-mono capitalize">
                      {model.type.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(model.status)}</TableCell>
                  <TableCell>
                    <div className="flex w-[120px] items-center gap-2">
                      <Progress value={(model.accuracy || 0) * 100} className="h-1.5" />
                      <span className="text-xs font-medium tabular-nums">
                        {((model.accuracy || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(model.runtime_stats?.inferences_today || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {model.runtime_stats?.avg_latency_ms || 0}ms
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

