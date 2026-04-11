"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIncidents } from "@/lib/hooks/use-data";

interface Incident {
  id: string;
  title: string;
  description?: string;
  severity: "critical" | "high" | "medium" | "low";
  status: string;
  assigned_to?: string;
  created_at: string;
}

const severityVariant = {
  critical: "destructive",
  high: "default",
  medium: "secondary",
  low: "outline",
} as const;

export default function IncidentsPage() {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");

  const { incidents, isLoading, isError, mutate } = useIncidents({
    severity,
    status,
    limit: 100,
  });

  const filtered = useMemo(() => {
    return (incidents as Incident[]).filter((i) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return i.title?.toLowerCase().includes(q) || i.id?.toLowerCase().includes(q);
    });
  }, [incidents, query]);

  const stats = useMemo(() => {
    const all = incidents as Incident[];
    return {
      total: all.length,
      active: all.filter((i) => !["resolved", "closed", "mitigated"].includes(i.status)).length,
      critical: all.filter((i) => i.severity === "critical").length,
      resolved: all.filter((i) => ["resolved", "closed", "mitigated"].includes(i.status)).length,
    };
  }, [incidents]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incident Management</h1>
          <p className="text-muted-foreground">Live incident tracking from API data</p>
        </div>
        <Button variant="outline" onClick={() => mutate()}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total</CardDescription><CardTitle className="text-2xl">{stats.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Active</CardDescription><CardTitle className="text-2xl text-orange-500">{stats.active}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Critical</CardDescription><CardTitle className="flex items-center gap-2 text-2xl text-red-500"><AlertTriangle className="h-5 w-5" />{stats.critical}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Resolved</CardDescription><CardTitle className="flex items-center gap-2 text-2xl text-green-500"><CheckCircle2 className="h-5 w-5" />{stats.resolved}</CardTitle></CardHeader></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[220px]"><Input placeholder="Search incidents..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="mitigated">Mitigated</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="font-medium">{incident.id}</TableCell>
                  <TableCell>{incident.title}</TableCell>
                  <TableCell><Badge variant={severityVariant[incident.severity] || "outline"}>{incident.severity}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{incident.status}</Badge></TableCell>
                  <TableCell>
                    {incident.assigned_to ? (
                      <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{incident.assigned_to}</span>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell><span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{new Date(incident.created_at).toLocaleString()}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
          Failed to load incidents.
        </div>
      )}
    </div>
  );
}
