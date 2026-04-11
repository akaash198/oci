"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAssets } from "@/lib/hooks/use-data";

interface Asset {
  id: string;
  type?: string;
  status?: "online" | "warning" | "offline";
}

export function AssetHealthMatrix() {
  const { assets } = useAssets({ limit: 500 });

  const categories = useMemo(() => {
    const byType = new Map<string, { total: number; online: number; warning: number; offline: number }>();

    for (const asset of assets as Asset[]) {
      const type = asset.type || "unknown";
      const row = byType.get(type) || { total: 0, online: 0, warning: 0, offline: 0 };
      row.total += 1;
      if (asset.status === "warning") row.warning += 1;
      else if (asset.status === "offline") row.offline += 1;
      else row.online += 1;
      byType.set(type, row);
    }

    return Array.from(byType.entries()).map(([type, values]) => ({
      type,
      ...values,
      health: values.total ? Math.round((values.online / values.total) * 100) : 0,
    }));
  }, [assets]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead className="text-center">Total</TableHead>
            <TableHead className="text-center">Online</TableHead>
            <TableHead className="text-center">Warning</TableHead>
            <TableHead className="text-center">Offline</TableHead>
            <TableHead className="text-center">Health</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((c) => (
            <TableRow key={c.type}>
              <TableCell className="font-medium uppercase">{c.type}</TableCell>
              <TableCell className="text-center">{c.total}</TableCell>
              <TableCell className="text-center text-green-500">{c.online}</TableCell>
              <TableCell className="text-center text-yellow-500">{c.warning}</TableCell>
              <TableCell className="text-center text-red-500">{c.offline}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={c.health} className="h-2 w-24" />
                  <Badge variant="outline">{c.health}%</Badge>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
