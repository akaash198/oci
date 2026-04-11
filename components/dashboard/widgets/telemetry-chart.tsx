"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTelemetry } from "@/lib/hooks/use-data";

interface TelemetryPoint {
  timestamp: string;
  metric_name?: string;
  metric_value?: number;
}

interface ChartPoint {
  time: string;
  voltage: number;
  current: number;
  anomalyScore: number;
}

export function TelemetryChart() {
  const { telemetry } = useTelemetry(undefined, 120);

  const data = useMemo(() => {
    const points = (telemetry as TelemetryPoint[])
      .filter((p) => typeof p.metric_value === "number" && p.timestamp)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const grouped = new Map<string, { voltage?: number; current?: number }>();

    for (const p of points) {
      const key = new Date(p.timestamp).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const row = grouped.get(key) || {};
      const metric = (p.metric_name || "").toLowerCase();
      if (metric.includes("volt")) row.voltage = p.metric_value;
      else if (metric.includes("curr")) row.current = p.metric_value;
      else if (row.voltage === undefined) row.voltage = p.metric_value;
      else if (row.current === undefined) row.current = p.metric_value;
      grouped.set(key, row);
    }

    const rows: ChartPoint[] = Array.from(grouped.entries()).map(([time, values]) => {
      const voltage = values.voltage ?? 0;
      const current = values.current ?? 0;
      const anomalyScore = voltage === 0 ? 0 : Math.min(1, Math.abs(current) / Math.max(1, Math.abs(voltage)));
      return { time, voltage, current, anomalyScore };
    });

    return rows.slice(-30);
  }, [telemetry]);

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} axisLine={false} domain={[0, 1]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={8} />
          <Line yAxisId="left" type="monotone" dataKey="voltage" name="Voltage" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="current" name="Current" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="anomalyScore" name="Anomaly Score" stroke="hsl(0, 84%, 60%)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
