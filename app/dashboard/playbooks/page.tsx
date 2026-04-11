"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Play, Plus, RefreshCw, Zap } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePlaybooks } from "@/lib/hooks/use-data";

interface Playbook {
  id: string;
  name: string;
  description?: string;
  status: string;
  auto_execute?: boolean;
  trigger_conditions?: { threat_type?: string };
  steps?: Array<{ action: string; target?: string; delay?: number }>;
  run_count?: number;
  updated_at?: string;
}

export default function PlaybooksPage() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [autoExecute, setAutoExecute] = useState(false);

  const { playbooks, isLoading, isError, mutate } = usePlaybooks();

  const filtered = useMemo(() => {
    return (playbooks as Playbook[]).filter((p) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    });
  }, [playbooks, query]);

  const stats = useMemo(() => {
    const list = playbooks as Playbook[];
    return {
      total: list.length,
      active: list.filter((p) => p.status === "active").length,
      auto: list.filter((p) => p.auto_execute).length,
      runs: list.reduce((sum, p) => sum + (p.run_count || 0), 0),
    };
  }, [playbooks]);

  const createPlaybook = async () => {
    if (!name.trim()) return;
    const response = await fetch("/api/playbooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        auto_execute: autoExecute,
        steps: [{ action: "notify", target: "security_team", delay: 0 }],
        trigger_conditions: {},
      }),
    });

    if (response.ok) {
      setName("");
      setDescription("");
      setAutoExecute(false);
      setOpen(false);
      mutate();
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Response Playbooks</h1>
          <p className="text-muted-foreground">Dynamic playbook inventory from API</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => mutate()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Playbook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Playbook</DialogTitle>
                <DialogDescription>Create a new playbook in the database.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Playbook name" />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Auto Execute</Label>
                  <Switch checked={autoExecute} onCheckedChange={setAutoExecute} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={createPlaybook}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total</CardDescription><CardTitle className="text-2xl">{stats.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Active</CardDescription><CardTitle className="flex items-center gap-2 text-2xl text-green-500"><CheckCircle2 className="h-5 w-5" />{stats.active}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Auto Execute</CardDescription><CardTitle className="flex items-center gap-2 text-2xl text-blue-500"><Zap className="h-5 w-5" />{stats.auto}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Total Runs</CardDescription><CardTitle className="text-2xl">{stats.runs}</CardTitle></CardHeader></Card>
      </div>

      <div className="max-w-md"><Input placeholder="Search playbooks..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((playbook) => (
          <Card key={playbook.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{playbook.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{playbook.description || "No description"}</CardDescription>
                </div>
                <Badge variant={playbook.status === "active" ? "default" : "secondary"}>{playbook.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Trigger:</span> {playbook.trigger_conditions?.threat_type || "-"}</p>
              <p><span className="text-muted-foreground">Steps:</span> {playbook.steps?.length || 0}</p>
              <p><span className="text-muted-foreground">Runs:</span> {playbook.run_count || 0}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />Updated {playbook.updated_at ? new Date(playbook.updated_at).toLocaleString() : "-"}</div>
              <Button size="sm" variant="outline" className="mt-2 w-full">
                <Play className="mr-2 h-4 w-4" />Run Manually
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {isError && <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">Failed to load playbooks.</div>}
    </div>
  );
}
