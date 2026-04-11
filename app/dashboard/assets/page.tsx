"use client";

import { useState } from "react";
import {
  Server,
  Cpu,
  HardDrive,
  Network,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssets } from "@/lib/hooks/use-data";

interface Asset {
  id: string;
  name: string;
  type: string;
  vendor: string;
  model: string;
  ip_address: string;
  status: "online" | "warning" | "offline";
  criticality: "critical" | "high" | "medium" | "low";
  location: string;
  created_at: string;
  last_seen?: string;
}

const assetTypeIcons: Record<string, typeof Server> = {
  plc: Cpu,
  rtu: HardDrive,
  hmi: Server,
  scada: Server,
  server: Server,
  sensor: Activity,
  network: Network,
};

const statusConfig = {
  online: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  offline: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
};

const criticalityConfig = {
  critical: { variant: "destructive" as const },
  high: { variant: "default" as const },
  medium: { variant: "secondary" as const },
  low: { variant: "outline" as const },
};

export default function AssetsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: "",
    type: "",
    criticality: "",
    vendor: "",
    model: "",
    ip_address: "",
    location: "",
  });

  const { assets, isLoading, isError, mutate } = useAssets({
    status: statusFilter,
    type: typeFilter,
  });

  // Client-side search filtering
  const filteredAssets = (assets as Asset[]).filter((asset) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      asset.name?.toLowerCase().includes(query) ||
      asset.ip_address?.includes(query) ||
      asset.vendor?.toLowerCase().includes(query)
    );
  });

  // Calculate stats
  const stats = {
    total: (assets as Asset[]).length,
    online: (assets as Asset[]).filter((a) => a.status === "online").length,
    warning: (assets as Asset[]).filter((a) => a.status === "warning").length,
    offline: (assets as Asset[]).filter((a) => a.status === "offline").length,
    critical: (assets as Asset[]).filter((a) => a.criticality === "critical").length,
  };

  const handleAddAsset = async () => {
    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAsset),
      });

      if (response.ok) {
        setIsAddDialogOpen(false);
        setNewAsset({
          name: "",
          type: "",
          criticality: "",
          vendor: "",
          model: "",
          ip_address: "",
          location: "",
        });
        mutate();
      }
    } catch (error) {
      console.error("Failed to add asset:", error);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Inventory</h1>
          <p className="text-muted-foreground">Manage and monitor OT/ICS assets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
                <DialogDescription>Register a new OT/ICS asset for monitoring</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Asset Name</Label>
                  <Input
                    id="name"
                    placeholder="PLC-001"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Asset Type</Label>
                    <Select
                      value={newAsset.type}
                      onValueChange={(value) => setNewAsset({ ...newAsset, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plc">PLC</SelectItem>
                        <SelectItem value="rtu">RTU</SelectItem>
                        <SelectItem value="hmi">HMI</SelectItem>
                        <SelectItem value="scada">SCADA Server</SelectItem>
                        <SelectItem value="server">Server</SelectItem>
                        <SelectItem value="sensor">Sensor/Meter</SelectItem>
                        <SelectItem value="network">Network Device</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="criticality">Criticality</Label>
                    <Select
                      value={newAsset.criticality}
                      onValueChange={(value) => setNewAsset({ ...newAsset, criticality: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="vendor">Vendor</Label>
                    <Input
                      id="vendor"
                      placeholder="Siemens"
                      value={newAsset.vendor}
                      onChange={(e) => setNewAsset({ ...newAsset, vendor: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      placeholder="S7-1500"
                      value={newAsset.model}
                      onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ip">IP Address</Label>
                  <Input
                    id="ip"
                    placeholder="192.168.1.10"
                    value={newAsset.ip_address}
                    onChange={(e) => setNewAsset({ ...newAsset, ip_address: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="zone">Security Zone</Label>
                  <Select
                    value={newAsset.location}
                    onValueChange={(value) => setNewAsset({ ...newAsset, location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Zone 0 - Perimeter">Zone 0 - Perimeter</SelectItem>
                      <SelectItem value="Zone 1 - Production">Zone 1 - Production</SelectItem>
                      <SelectItem value="Zone 2 - Field Devices">Zone 2 - Field Devices</SelectItem>
                      <SelectItem value="Zone 3 - DMZ">Zone 3 - DMZ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAsset} disabled={!newAsset.name || !newAsset.type}>
                  Add Asset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Assets</CardDescription>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Online</CardDescription>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <CardTitle className="flex items-center gap-2 text-2xl text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                {stats.online}
              </CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Warning</CardDescription>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <CardTitle className="flex items-center gap-2 text-2xl text-yellow-500">
                <AlertTriangle className="h-5 w-5" />
                {stats.warning}
              </CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Offline</CardDescription>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <CardTitle className="flex items-center gap-2 text-2xl text-red-500">
                <XCircle className="h-5 w-5" />
                {stats.offline}
              </CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical Assets</CardDescription>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <CardTitle className="text-2xl">{stats.critical}</CardTitle>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="plc">PLC</SelectItem>
                <SelectItem value="rtu">RTU</SelectItem>
                <SelectItem value="hmi">HMI</SelectItem>
                <SelectItem value="scada">SCADA</SelectItem>
                <SelectItem value="server">Server</SelectItem>
                <SelectItem value="sensor">Sensor</SelectItem>
                <SelectItem value="network">Network</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Server className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No assets found</p>
              <p className="text-sm">
                {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Add your first asset to get started"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criticality</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset) => {
                  const TypeIcon = assetTypeIcons[asset.type] || Server;
                  const status = statusConfig[asset.status] || statusConfig.online;
                  const StatusIcon = status.icon;

                  return (
                    <TableRow key={asset.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {asset.vendor} {asset.model}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="uppercase text-xs font-medium text-muted-foreground">
                        {asset.type}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{asset.ip_address || "-"}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${status.color}`}>
                          <StatusIcon className="h-4 w-4" />
                          <span className="capitalize">{asset.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            criticalityConfig[asset.criticality as keyof typeof criticalityConfig]
                              ?.variant || "secondary"
                          }
                        >
                          {asset.criticality}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {asset.location || "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>View Telemetry</DropdownMenuItem>
                            <DropdownMenuItem>Edit Asset</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Run Vulnerability Scan</DropdownMenuItem>
                            <DropdownMenuItem>Check Firmware</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-500">Isolate Asset</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
          Failed to load assets. Please check your connection and try again.
          <Button variant="outline" size="sm" className="ml-4" onClick={() => mutate()}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
