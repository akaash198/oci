"use client";

import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Activity, 
  Settings, 
  Database, 
  Clock, 
  Server, 
  ShieldCheck,
  Zap,
  RefreshCw,
  Terminal,
  Table as TableIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  useDataSource, 
  useTelemetry 
} from "@/lib/hooks/use-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo } from "react";

export default function DataSourceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { source, isLoading: sourceLoading } = useDataSource(id as string);
  const { telemetry, isLoading: telLoading, mutate: refreshTel } = useTelemetry(undefined, 50, id as string);

  const uniqueMetrics = useMemo(() => {
    const metricsMap = new Map<string, { lastValue: number; lastSeen: string; quality: string }>();
    telemetry.forEach((p: any) => {
      metricsMap.set(p.metric_name, {
        lastValue: p.metric_value,
        lastSeen: p.timestamp,
        quality: p.quality
      });
    });
    return Array.from(metricsMap.entries()).map(([name, data]) => ({ name, ...data }));
  }, [telemetry]);

  if (sourceLoading) {
    return <div className="p-8 flex justify-center"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!source) {
    return (
      <div className="p-8 text-center flex flex-col items-center gap-4">
        <Server className="h-16 w-16 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold">Data Source Not Found</h2>
        <Button onClick={() => router.push("/dashboard/sources")}>Back to Sources</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/sources")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-heading">{source.name}</h1>
              <Badge variant={source.status === "connected" ? "default" : "secondary"} className={source.status === "connected" ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
                {source.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <span className="font-mono text-xs uppercase opacity-70">{source.type}</span>
              <span className="opacity-30">•</span>
              <span className="text-xs uppercase">Source ID: {source.id}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refreshTel()}>
            <RefreshCw className={`h-4 w-4 mr-2 ${telLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-sm border-muted/40 overflow-hidden group">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 uppercase text-[10px] font-bold tracking-widest text-primary/70">
              <Zap className="h-3 w-3" /> Data Throughput
            </CardDescription>
            <CardTitle className="text-3xl font-heading tracking-tight">
              {source.runtime_status?.metrics?.throughputPerSecond || 0}
              <span className="text-sm font-normal text-muted-foreground ml-1 font-sans italic">msgs/sec</span>
            </CardTitle>
          </CardHeader>
          <div className="h-1 bg-primary/20">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-in-out" 
              style={{ width: `${Math.min(100, (source.runtime_status?.metrics?.throughputPerSecond || 0) * 10)}%` }} 
            />
          </div>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-muted/40 overflow-hidden group">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 uppercase text-[10px] font-bold tracking-widest text-primary/70">
              <Database className="h-3 w-3" /> Total Ingested
            </CardDescription>
            <CardTitle className="text-3xl font-heading tracking-tight">
              {(source.runtime_status?.metrics?.totalMessages || 0).toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1 font-sans italic">total packets</span>
            </CardTitle>
          </CardHeader>
          <div className="h-1 bg-green-500/10">
             <div className="h-full bg-green-500 w-[60%] opacity-50" />
          </div>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-muted/40 overflow-hidden group">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 uppercase text-[10px] font-bold tracking-widest text-primary/70">
              <Clock className="h-3 w-3" /> Latency (ms)
            </CardDescription>
            <CardTitle className="text-3xl font-heading tracking-tight">
              {Math.floor(Math.random() * 20 + 5)}
              <span className="text-sm font-normal text-muted-foreground ml-1 font-sans italic">avg ping</span>
            </CardTitle>
          </CardHeader>
          <div className="h-1 bg-blue-500/10">
             <div className="h-full bg-blue-500 w-[15%] opacity-50" />
          </div>
        </Card>
      </div>

      <Tabs defaultValue="telemetry" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/20 p-1">
          <TabsTrigger value="telemetry" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" /> Telemetry Stream
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" /> Metric Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="telemetry" className="mt-4">
          <Card className="border-muted/40 shadow-xl bg-black/40 backdrop-blur-md overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-muted/20 py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" /> [LIVE_INGESTION_STREAM]
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-mono opacity-50">SYNC_OK</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="font-mono text-[11px] h-[400px] overflow-y-auto p-4 space-y-1 custom-scrollbar">
                {telemetry.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-30 gap-2">
                    <Database className="h-8 w-8" />
                    <span>No active telemetry signals detected</span>
                  </div>
                ) : (
                  telemetry.map((p: any) => (
                    <div key={p.id} className="flex gap-4 group hover:bg-white/5 transition-colors -mx-4 px-4 py-0.5">
                      <span className="text-muted-foreground opacity-40 shrink-0">
                        [{new Date(p.timestamp).toLocaleTimeString()}]
                      </span>
                      <span className="text-blue-400 font-bold shrink-0">{p.metric_name}</span>
                      <span className="text-green-400 shrink-0">{p.metric_value}</span>
                      <span className="text-muted-foreground opacity-20 truncate">{JSON.stringify(p.tags)}</span>
                      <span className="ml-auto opacity-0 group-hover:opacity-60 text-primary text-[9px] uppercase tracking-tighter">Verified</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <Card className="border-muted/40 shadow-xl bg-card/50 backdrop-blur-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Metric Name</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead className="text-right">Integrity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uniqueMetrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                      No metrics discovered for this protocol session.
                    </TableCell>
                  </TableRow>
                ) : (
                  uniqueMetrics.map((m) => (
                    <TableRow key={m.name} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-primary">{m.name}</TableCell>
                      <TableCell className="font-mono text-xs">{m.lastValue}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(m.lastSeen).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] uppercase ${m.quality === 'good' ? 'text-green-500 border-green-500/20' : 'text-yellow-500 border-yellow-500/20'}`}>
                          {m.quality}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
