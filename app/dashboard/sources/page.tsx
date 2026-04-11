"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, RefreshCw, Search, XCircle, MoreVertical, Link, Unlink, Activity, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useDataSources } from "@/lib/hooks/use-data";

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  connection_params?: Record<string, unknown>;
  runtime_status?: {
    state?: string;
    metrics?: { throughputPerSecond?: number; totalMessages?: number };
    lastError?: string;
  };
  updated_at?: string;
  created_at?: string;
}

export default function DataSourcesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [paramsJson, setParamsJson] = useState('{"host":"localhost","port":1883}');

  const { sources, isLoading, isError, mutate } = useDataSources();

  const filtered = useMemo(() => {
    return (sources as DataSource[]).filter((s) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return s.name?.toLowerCase().includes(q) || s.type?.toLowerCase().includes(q);
    });
  }, [sources, query]);

  const stats = useMemo(() => {
    const list = sources as DataSource[];
    return {
      total: list.length,
      connected: list.filter((s) => ["connected", "running"].includes(s.status)).length,
    };
  }, [sources]);

  const createSource = async () => {
    let connection_params: Record<string, unknown> = {};
    try {
      connection_params = JSON.parse(paramsJson);
    } catch {
      return;
    }

    const response = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        connection_params,
        auto_connect: false,
      }),
    });

    if (response.ok) {
      setOpen(false);
      setName("");
      setType("");
      mutate();
    }
  };

  const runAction = async (id: string, action: "connect" | "disconnect") => {
    const response = await fetch("/api/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (response.ok) mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
      case "running":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">connected</Badge>;
      case "error":
        return <Badge variant="destructive">error</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Data Sources</h1>
          <p className="text-muted-foreground">Dynamic source configuration and runtime status</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => mutate()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20"><Plus className="mr-2 h-4 w-4" />Add Source</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Data Source</DialogTitle>
                <DialogDescription>Create a source record in the platform memory.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PLC-12" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue placeholder="Select protocol" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modbus">modbus_tcp</SelectItem>
                      <SelectItem value="opcua">opcua</SelectItem>
                      <SelectItem value="dnp3">dnp3</SelectItem>
                      <SelectItem value="mqtt">mqtt</SelectItem>
                      <SelectItem value="simulator">simulator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Connection Params (JSON)</Label>
                  <Textarea 
                    value={paramsJson} 
                    onChange={(e) => setParamsJson(e.target.value)} 
                    className="font-mono text-xs h-32"
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={createSource} disabled={!name || !type}>Create Source</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardDescription>Total Managed Sources</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardDescription>Active Connections</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              {stats.connected}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            className="pl-9 bg-muted/20" 
            placeholder="Search sources by name or protocol..." 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
          />
        </div>
      </div>

      <Card className="overflow-hidden border-muted/40 shadow-xl bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Source Name</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Runtime State</TableHead>
              <TableHead className="text-right">Throughput</TableHead>
              <TableHead className="text-right">Total Messages</TableHead>
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
                  No data sources configured.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((source) => (
                <TableRow 
                  key={source.id} 
                  className="group hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/sources/${source.id}`)}
                >
                  <TableCell className="font-semibold">{source.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-tighter">
                      {source.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(source.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <Activity className={`h-3 w-3 ${source.status === 'connected' ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
                       <span className="text-xs">{source.runtime_status?.state || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {source.runtime_status?.metrics?.throughputPerSecond || 0}/s
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(source.runtime_status?.metrics?.totalMessages || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/sources/${source.id}`);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {source.status !== "connected" ? (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            runAction(source.id, "connect");
                          }}
                        >
                          <Link className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            runAction(source.id, "disconnect");
                          }}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
          Failed to load sources.
        </div>
      )}
    </div>
  );
}
